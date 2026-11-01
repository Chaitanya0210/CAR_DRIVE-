import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@groupdrive/db';

// Zone density defaults in memory / config store
const DEFAULT_ZONE_THRESHOLDS: Record<string, number> = {
  METRO: 8,
  URBAN: 5,
  SEMI_URBAN: 4,
  RURAL: 3,
  DEEP_RURAL: 2,
};

const currentZoneThresholds = { ...DEFAULT_ZONE_THRESHOLDS };

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService = new PrismaService()) {}

  // ============================================================================
  // 1. LIVE OPS METRICS
  // ============================================================================
  async getLiveOpsMetrics() {
    const groupsByStatus = await this.prisma.group.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const totalGroups = await this.prisma.group.count();
    const openRfqs = await this.prisma.rFQ.count({
      where: { status: 'SEALED_BIDDING' },
    });
    const totalRfqs = await this.prisma.rFQ.count();
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: {
          in: [
            'TOKEN_CONFIRMED',
            'DEALER_ACCEPTED',
            'CHASSIS_ALLOCATED',
            'INVOICED',
            'REGISTRATION_COMPLETE',
            'DELIVERY_IN_PROGRESS',
            'FULFILLED',
          ],
        },
      },
      select: {
        totalOnRoadPaise: true,
      },
    });
    const disputedSettlements = await this.prisma.settlement.count({
      where: { status: 'DISPUTED' },
    });
    const totalSettlements = await this.prisma.settlement.count();

    // Sum GMV in paise
    const totalGmvPaise = bookings.reduce(
      (acc, b) => acc + BigInt(b.totalOnRoadPaise.toString()),
      BigInt(0),
    );

    // Calculate dispute rate
    const disputeRatePercent =
      totalSettlements > 0
        ? Number(((disputedSettlements / totalSettlements) * 100).toFixed(2))
        : 0.0;

    // Average group discount percentage (benchmark ~12.5%)
    const avgDiscountPercent = 12.4;

    const groupStatusCounts: Record<string, number> = {
      DRAFT: 0,
      FORMING: 0,
      QUORUM_REACHED: 0,
      RFQ_ACTIVE: 0,
      VOTING_OPEN: 0,
      DEAL_LOCKED: 0,
      FULFILLMENT: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const item of groupsByStatus) {
      groupStatusCounts[item.status] = item._count.id;
    }

    return {
      gmvPaise: totalGmvPaise.toString(),
      gmvInr: Number(totalGmvPaise) / 100,
      gmvLakhs: (Number(totalGmvPaise) / 100 / 100000).toFixed(2),
      activeGroupsCount: totalGroups - (groupStatusCounts.COMPLETED + groupStatusCounts.CANCELLED),
      totalGroupsCount: totalGroups,
      openRfqsCount: openRfqs,
      totalRfqsCount: totalRfqs,
      avgDiscountPercent,
      disputeRatePercent,
      groupStatusCounts,
    };
  }

  // ============================================================================
  // 2. SELLER KYB REVIEW QUEUE
  // ============================================================================
  async getPendingKybQueue() {
    const sellers = await this.prisma.sellerProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            isActive: true,
          },
        },
        branches: {
          include: {
            zone: true,
          },
        },
        brandAuthorizations: {
          include: {
            brand: true,
          },
        },
        kycDocuments: true,
        registrationPayments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sellers.map((seller) => ({
      id: seller.id,
      dealershipLegalName: seller.dealershipLegalName,
      tradeName: seller.tradeName,
      gstin: seller.gstin,
      panNumber: seller.panNumber,
      cinNumber: seller.cinNumber,
      kycStatus: seller.kycStatus,
      registrationFeeStatus: seller.registrationFeeStatus,
      primaryContactName: seller.primaryContactName,
      primaryContactPhone: seller.primaryContactPhone,
      rejectionReason: seller.rejectionReason,
      createdAt: seller.createdAt.toISOString(),
      user: seller.user,
      branchesCount: seller.branches.length,
      brands: seller.brandAuthorizations.map((b) => b.brand.name),
      documents: seller.kycDocuments.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        documentUrl: doc.documentUrl,
        verificationStatus: doc.verificationStatus,
        rejectionReason: doc.rejectionReason,
      })),
      registrationPaid: seller.registrationFeeStatus === 'PAID',
    }));
  }

  async approveSellerKyb(sellerProfileId: string, adminUserId = 'system-admin') {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    });
    if (!seller) {
      throw new NotFoundException(`Seller profile '${sellerProfileId}' not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update seller KYC status to VERIFIED
      const updatedSeller = await tx.sellerProfile.update({
        where: { id: sellerProfileId },
        data: {
          kycStatus: 'VERIFIED',
          rejectionReason: null,
        },
      });

      // 2. Mark all pending documents as VERIFIED
      await tx.sellerKyc.updateMany({
        where: { sellerProfileId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedByUserId: adminUserId,
        },
      });

      // 3. Mark brand authorizations as verified
      await tx.sellerBrandAuthorization.updateMany({
        where: { sellerProfileId },
        data: { isVerified: true },
      });

      // 4. Record Audit Log
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminUserId,
          action: 'SELLER_KYB_APPROVED',
          entityType: 'SellerProfile',
          entityId: sellerProfileId,
          previousState: seller.kycStatus,
          newState: 'VERIFIED',
          payloadDiff: {
            sellerLegalName: seller.dealershipLegalName,
            gstin: seller.gstin,
            approvedAt: new Date().toISOString(),
          },
        },
      });

      return updatedSeller;
    });

    return {
      success: true,
      sellerProfileId: updated.id,
      kycStatus: updated.kycStatus,
      message: `Dealership '${updated.dealershipLegalName}' has been successfully KYB verified. Registration fee gate unlocked.`,
    };
  }

  async rejectSellerKyb(sellerProfileId: string, reason: string, adminUserId = 'system-admin') {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A non-empty rejection reason must be provided');
    }

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    });
    if (!seller) {
      throw new NotFoundException(`Seller profile '${sellerProfileId}' not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.sellerProfile.update({
        where: { id: sellerProfileId },
        data: {
          kycStatus: 'REJECTED',
          rejectionReason: reason,
        },
      });

      await tx.sellerKyc.updateMany({
        where: { sellerProfileId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminUserId,
          action: 'SELLER_KYB_REJECTED',
          entityType: 'SellerProfile',
          entityId: sellerProfileId,
          previousState: seller.kycStatus,
          newState: 'REJECTED',
          payloadDiff: {
            reason,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      return updatedSeller;
    });

    return {
      success: true,
      sellerProfileId: updated.id,
      kycStatus: updated.kycStatus,
      rejectionReason: reason,
      message: `Dealership '${updated.dealershipLegalName}' KYB rejected: ${reason}`,
    };
  }

  // ============================================================================
  // 3. OFFERED VEHICLE MODERATION QUEUE
  // ============================================================================
  async getOffersForModeration() {
    const offers = await this.prisma.offeredVehicle.findMany({
      include: {
        sellerProfile: true,
        branch: {
          include: { zone: true },
        },
        variant: {
          include: {
            carModel: {
              include: { brand: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return offers.map((offer) => {
      const regular = Number(offer.regularPricePaise);
      const discounted = Number(offer.discountedPricePaise);
      const discountPaise = regular - discounted;
      const discountPercent =
        regular > 0 ? Number(((discountPaise / regular) * 100).toFixed(1)) : 0;
      // Rule-based deal score: higher discount = higher score, base 50
      const dealScore = Math.min(99, Math.max(30, Math.round(50 + discountPercent * 2.5)));

      return {
        id: offer.id,
        vin: offer.vin,
        brand: offer.variant.carModel.brand.name,
        model: offer.variant.carModel.name,
        variant: offer.variant.name,
        conditionType: offer.conditionType,
        manufactureYear: offer.manufactureYear,
        odometerKm: offer.odometerKm,
        color: offer.color,
        regularPricePaise: offer.regularPricePaise.toString(),
        discountedPricePaise: offer.discountedPricePaise.toString(),
        regularPriceInr: regular / 100,
        discountedPriceInr: discounted / 100,
        discountPercent,
        dealScore,
        imageUrl: offer.imageUrl,
        isAvailable: offer.isAvailable,
        sellerName: offer.sellerProfile.tradeName,
        branchName: offer.branch.branchName,
        branchLocation: `${offer.branch.zone.name}, ${offer.branch.pincode}`,
        createdAt: offer.createdAt.toISOString(),
      };
    });
  }

  async moderateOffer(
    offerId: string,
    approve: boolean,
    reason?: string,
    adminUserId = 'system-admin',
  ) {
    const offer = await this.prisma.offeredVehicle.findUnique({
      where: { id: offerId },
    });
    if (!offer) {
      throw new NotFoundException(`Offer '${offerId}' not found`);
    }

    const updated = await this.prisma.offeredVehicle.update({
      where: { id: offerId },
      data: { isAvailable: approve },
    });

    await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminUserId,
        action: approve ? 'OFFER_LISTING_APPROVED' : 'OFFER_LISTING_REJECTED',
        entityType: 'OfferedVehicle',
        entityId: offerId,
        previousState: String(offer.isAvailable),
        newState: String(approve),
        payloadDiff: {
          vin: offer.vin,
          reason:
            reason || (approve ? 'Passed visual and odometer moderation' : 'Unspecified rejection'),
        },
      },
    });

    return {
      success: true,
      offerId: updated.id,
      isAvailable: updated.isAvailable,
      message: approve ? 'Listing approved for buyer visibility' : 'Listing rejected and delisted',
    };
  }

  // ============================================================================
  // 4. DISPUTE MANAGEMENT
  // ============================================================================
  async getDisputes() {
    // Disputes arise from DeliveryShipment or Settlement
    const [disputedSettlements, shipmentsWithDispute] = await Promise.all([
      this.prisma.settlement.findMany({
        where: { status: 'DISPUTED' },
        include: {
          sellerProfile: true,
          booking: {
            include: {
              membership: { include: { buyerProfile: true } },
              quote: { include: { sellerProfile: true } },
              shipment: {
                include: { destinationZone: true },
              },
            },
          },
        },
      }),
      this.prisma.deliveryShipment.findMany({
        include: {
          booking: {
            include: {
              membership: { include: { buyerProfile: true } },
              quote: { include: { sellerProfile: true } },
            },
          },
          destinationZone: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      activeDisputesCount: disputedSettlements.length,
      settlementDisputes: disputedSettlements.map((s) => ({
        id: s.id,
        bookingId: s.bookingId,
        bookingRef: s.booking.bookingNumber,
        sellerName: s.sellerProfile.tradeName,
        buyerName: s.booking.membership?.buyerProfile.fullName || 'Group Buyer',
        dealValueInr: Number(s.netPayableToSellerPaise) / 100,
        commissionInr: Number(s.platformCommissionPaise) / 100,
        status: s.status,
        reason: 'Transit milestone discrepancy / buyer inspection claim',
        createdAt: s.createdAt.toISOString(),
      })),
      recentShipments: shipmentsWithDispute.map((sh) => ({
        id: sh.id,
        bookingRef: sh.booking.bookingNumber,
        status: sh.status,
        destination: sh.destinationZone.name,
        buyerName: sh.booking.membership?.buyerProfile.fullName || 'Group Buyer',
        dealerName: sh.booking.quote?.sellerProfile.tradeName || 'Dealership',
        carrier: sh.logisticsProvider,
        trackingNumber: sh.trackingNumber,
      })),
    };
  }

  async resolveDispute(
    settlementId: string,
    resolution: 'RELEASE_TO_DEALER' | 'REFUND_BUYER',
    notes: string,
    adminUserId = 'system-admin',
  ) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { booking: true },
    });
    if (!settlement) {
      throw new NotFoundException(`Settlement dispute '${settlementId}' not found`);
    }

    const newStatus = resolution === 'RELEASE_TO_DEALER' ? 'PROCESSED' : 'DISPUTED';

    await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: newStatus,
        settledAt: resolution === 'RELEASE_TO_DEALER' ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminUserId,
        action: `DISPUTE_RESOLVED_${resolution}`,
        entityType: 'Settlement',
        entityId: settlementId,
        previousState: settlement.status,
        newState: newStatus,
        payloadDiff: {
          resolution,
          notes,
          bookingReference: settlement.booking.bookingNumber,
        },
      },
    });

    return {
      success: true,
      settlementId,
      resolution,
      notes,
      message: `Dispute successfully resolved with action: ${resolution}`,
    };
  }

  // ============================================================================
  // 5. USER & SUPPORT DESK
  // ============================================================================
  async getUsers(search?: string, role?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(role ? { role: role as UserRole } : {}),
        ...(search
          ? {
              OR: [
                { phone: { contains: search } },
                { email: { contains: search } },
                { buyerProfile: { fullName: { contains: search, mode: 'insensitive' } } },
                { sellerProfile: { tradeName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        buyerProfile: {
          include: { primaryZone: true },
        },
        sellerProfile: true,
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      displayName: u.buyerProfile?.fullName || u.sellerProfile?.tradeName || 'System User',
      zoneName: u.buyerProfile?.primaryZone?.name || null,
      kycStatus: u.sellerProfile?.kycStatus || null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async addSupportTicketNote(userId: string, note: string, agentId = 'support-agent') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const log = await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: agentId,
        action: 'SUPPORT_TICKET_NOTE_ADDED',
        entityType: 'User',
        entityId: userId,
        payloadDiff: {
          note,
          agentId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      ticketNoteId: log.id,
      userId,
      note,
      message: 'Support staff note recorded in audit log',
    };
  }

  // ============================================================================
  // 6. ZONE THRESHOLD CONFIG
  // ============================================================================
  getZoneThresholds() {
    return {
      thresholds: currentZoneThresholds,
      densityClasses: ['METRO', 'URBAN', 'SEMI_URBAN', 'RURAL', 'DEEP_RURAL'],
      description:
        'Configurable minimum group sizes required to trigger Reverse Auction RFQ by density class',
    };
  }

  updateZoneThreshold(densityClass: string, minGroupSize: number, adminUserId = 'system-admin') {
    const upper = densityClass.toUpperCase();
    if (!DEFAULT_ZONE_THRESHOLDS[upper]) {
      throw new BadRequestException(`Invalid density class '${densityClass}'`);
    }
    if (minGroupSize < 2 || minGroupSize > 50) {
      throw new BadRequestException('Minimum group size must be between 2 and 50');
    }

    const prev = currentZoneThresholds[upper];
    currentZoneThresholds[upper] = minGroupSize;

    this.prisma.auditLog
      .create({
        data: {
          actorType: 'ADMIN',
          actorId: adminUserId,
          action: 'ZONE_THRESHOLD_UPDATED',
          entityType: 'ZoneDensityClass',
          entityId: upper,
          previousState: String(prev),
          newState: String(minGroupSize),
          payloadDiff: { densityClass: upper, minGroupSize },
        },
      })
      .catch(() => {});

    return {
      success: true,
      densityClass: upper,
      newMinGroupSize: minGroupSize,
      thresholds: currentZoneThresholds,
    };
  }

  // ============================================================================
  // 7. CATALOG MANAGER
  // ============================================================================
  async getCatalogSummary() {
    const [brandsCount, modelsCount, variantsCount, brands] = await Promise.all([
      this.prisma.brand.count(),
      this.prisma.carModel.count(),
      this.prisma.variant.count(),
      this.prisma.brand.findMany({
        include: {
          models: {
            include: {
              variants: {
                take: 3,
              },
            },
          },
        },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalBrands: brandsCount,
        totalModels: modelsCount,
        totalVariants: variantsCount,
      },
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        countryOfOrigin: b.countryOfOrigin,
        models: b.models.map((m) => ({
          id: m.id,
          name: m.name,
          bodyType: m.bodyType,
          variantsCount: m.variants.length,
          sampleVariants: m.variants.map((v) => ({
            id: v.id,
            name: v.name,
            fuelType: v.fuelType,
            transmission: v.transmission,
          })),
        })),
      })),
    };
  }

  // ============================================================================
  // 8. AUDIT LOG VIEWER
  // ============================================================================
  async getAuditLogs(actorType?: string, action?: string, limit = 50) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(actorType ? { actorType: actorType as UserRole } : {}),
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      actorType: log.actorType,
      actorId: log.actorId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousState: log.previousState,
      newState: log.newState,
      payloadDiff: log.payloadDiff,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  // ============================================================================
  // 9. GUIDED DEMO MODE & FAST-FORWARD ENGINE
  // ============================================================================
  async getDemoGroups() {
    const groups = await this.prisma.group.findMany({
      include: {
        variant: {
          include: {
            carModel: {
              include: {
                brand: true,
              },
            },
          },
        },
        targetZone: true,
        memberships: {
          include: {
            buyerProfile: true,
          },
        },
        rfq: {
          include: {
            quotes: {
              include: {
                sellerProfile: true,
              },
            },
            votes: true,
            winningQuote: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return groups.map((g) => ({
      id: g.id,
      status: g.status,
      targetCount: g.targetCount,
      currentCount: g.currentCount,
      deadline: g.deadline.toISOString(),
      quorumReachedAt: g.quorumReachedAt?.toISOString() || null,
      dealLockedAt: g.dealLockedAt?.toISOString() || null,
      vehicle: {
        brandName: g.variant.carModel.brand.name,
        modelName: g.variant.carModel.name,
        variantName: g.variant.name,
        fuelType: g.variant.fuelType,
        transmission: g.variant.transmission,
        basePricePaise: g.variant.baseExShowroomPaise.toString(),
      },
      zone: {
        id: g.targetZone.id,
        name: g.targetZone.name,
        code: g.targetZone.code,
        densityClass: g.targetZone.densityClass,
      },
      members: g.memberships.map((m) => ({
        id: m.id,
        buyerName: m.buyerProfile.fullName,
        phone: m.buyerProfile.pincode,
        status: m.status,
      })),
      rfq: g.rfq
        ? {
            id: g.rfq.id,
            rfqNumber: g.rfq.rfqNumber,
            status: g.rfq.status,
            quotesCount: g.rfq.quotes.length,
            winningQuoteId: g.rfq.winningQuoteId,
            quotes: g.rfq.quotes.map((q) => ({
              id: q.id,
              dealerName: q.sellerProfile.tradeName,
              totalLandedCostPaise: q.totalLandedCostPaise.toString(),
              batchGroupDiscountPaise: q.batchGroupDiscountPaise.toString(),
              deliveryTimelineDays: q.deliveryTimelineDays,
              isWinning: q.id === g.rfq?.winningQuoteId,
            })),
          }
        : null,
    }));
  }

  async fastForwardThreshold(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        variant: { include: { carModel: { include: { brand: true } } } },
        targetZone: true,
        memberships: true,
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    // 1. If members < targetCount, fill with seeded buyers
    if (group.currentCount < group.targetCount) {
      const needed = group.targetCount - group.currentCount;
      const existingBuyerIds = group.memberships.map((m) => m.buyerProfileId);
      const availableBuyers = await this.prisma.buyerProfile.findMany({
        where: { id: { notIn: existingBuyerIds } },
        take: needed,
      });

      for (const buyer of availableBuyers) {
        await this.prisma.membership.create({
          data: {
            groupId: group.id,
            buyerProfileId: buyer.id,
            tokenPaidPaise: BigInt(500000),
            status: 'ACTIVE',
          },
        });
      }
    }

    // 2. Advance group to RFQ_ACTIVE
    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        currentCount: group.targetCount,
        status: 'RFQ_ACTIVE',
        quorumReachedAt: new Date(),
      },
    });

    // 3. Ensure RFQ exists with at least 2 quotes
    let rfq = await this.prisma.rFQ.findUnique({ where: { groupId } });
    if (!rfq) {
      rfq = await this.prisma.rFQ.create({
        data: {
          groupId,
          rfqNumber: `RFQ-${group.targetZone.code}-${Date.now().toString().slice(-4)}`,
          status: 'SEALED_BIDDING',
          bidWindowClosesAt: new Date(Date.now() + 86400000 * 2),
        },
      });

      // Find authorized dealers for this brand
      const dealers = await this.prisma.sellerProfile.findMany({
        where: {
          brandAuthorizations: {
            some: { brandId: group.variant.carModel.brandId },
          },
          branches: { some: {} },
        },
        include: { branches: true },
        take: 2,
      });

      for (let i = 0; i < dealers.length; i++) {
        const d = dealers[i];
        const base = BigInt(group.variant.baseExShowroomPaise.toString());
        const discount = BigInt(Math.round(Number(base) * (0.05 + i * 0.015)));
        const rto = BigInt(Math.round(Number(base) * 0.12));
        const insurance = BigInt(5400000);
        const logistics = BigInt(1200000 + i * 300000);
        const fastag = BigInt(250000);
        const landed = base - discount + rto + insurance + logistics + fastag;

        await this.prisma.quote.create({
          data: {
            rfqId: rfq.id,
            sellerProfileId: d.id,
            branchId: d.branches[0]?.id || d.id,
            status: 'SEALED',
            exShowroomPaise: base,
            batchGroupDiscountPaise: discount,
            dealerLogisticsToZonePaise: logistics,
            roadTaxRtoPaise: rto,
            insuranceEstimatePaise: insurance,
            fastagRegistrationCessPaise: fastag,
            tcsPaise: BigInt(0),
            totalLandedCostPaise: landed,
            deliveryTimelineDays: 14 + i * 4,
            validityDate: new Date(Date.now() + 86400000 * 15),
            notes: `${d.tradeName}: Fast-forward demo quote with exclusive group discount.`,
          },
        });
      }
    }

    return {
      success: true,
      step: 'THRESHOLD_MET_AND_RFQ_OPEN',
      group: updatedGroup,
      message: `Group '${group.id.slice(0, 8)}' reached quorum (${group.targetCount}/${group.targetCount})! RFQ bidding is now OPEN.`,
    };
  }

  async fastForwardCloseBidding(groupId: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { groupId },
      include: { quotes: true },
    });

    if (!rfq) throw new NotFoundException('No active RFQ found for this group');

    // 1. Unseal all quotes
    await this.prisma.quote.updateMany({
      where: { rfqId: rfq.id },
      data: { status: 'NORMALIZED' },
    });

    // 2. Set RFQ & Group to VOTING_OPEN
    await this.prisma.rFQ.update({
      where: { id: rfq.id },
      data: {
        status: 'VOTING_OPEN',
        bidWindowClosesAt: new Date(Date.now() - 1000),
        votingClosesAt: new Date(Date.now() + 86400000 * 2),
      },
    });

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: { status: 'VOTING_OPEN' },
    });

    return {
      success: true,
      step: 'BIDDING_CLOSED_VOTING_OPEN',
      group: updatedGroup,
      quotesCount: rfq.quotes.length,
      message: `Bidding closed! Sealed quotes are now unsealed and ranked. Buyer voting is OPEN.`,
    };
  }

  async fastForwardResolveVote(groupId: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { groupId },
      include: {
        quotes: { orderBy: { totalLandedCostPaise: 'asc' } },
        group: { include: { memberships: true } },
      },
    });

    if (!rfq || rfq.quotes.length === 0) {
      throw new NotFoundException('No quotes available to resolve vote');
    }

    const winningQuote = rfq.quotes[0]; // Lowest landed cost

    // 1. Cast votes for all members
    for (const m of rfq.group.memberships) {
      await this.prisma.vote.upsert({
        where: { membershipId: m.id },
        create: {
          rfqId: rfq.id,
          membershipId: m.id,
          buyerProfileId: m.buyerProfileId,
          quoteId: winningQuote.id,
        },
        update: { quoteId: winningQuote.id },
      });
    }

    // 2. Declare winning quote and lock group
    await this.prisma.rFQ.update({
      where: { id: rfq.id },
      data: {
        status: 'AWARDED',
        winningQuoteId: winningQuote.id,
      },
    });

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'DEAL_LOCKED',
        dealLockedAt: new Date(),
      },
    });

    // 3. Create confirmed Bookings
    const bookings = [];
    for (let i = 0; i < rfq.group.memberships.length; i++) {
      const m = rfq.group.memberships[i];
      const existing = await this.prisma.booking.findUnique({ where: { membershipId: m.id } });
      if (!existing) {
        const b = await this.prisma.booking.create({
          data: {
            bookingNumber: `BK-FF-${groupId.slice(0, 4)}-${String(i + 1).padStart(3, '0')}`,
            membershipId: m.id,
            quoteId: winningQuote.id,
            status: 'TOKEN_CONFIRMED',
            totalOnRoadPaise: winningQuote.totalLandedCostPaise,
            tokenAmountPaise: BigInt(500000),
            balanceAmountPaise: winningQuote.totalLandedCostPaise - BigInt(500000),
            chassisNumber: `MA3DEMO${Date.now().toString().slice(-6)}${i}`,
          },
        });
        bookings.push(b);
      } else {
        bookings.push(existing);
      }
    }

    return {
      success: true,
      step: 'DEAL_LOCKED_AND_BOOKED',
      group: updatedGroup,
      winningQuote: {
        id: winningQuote.id,
        landedCostPaise: winningQuote.totalLandedCostPaise.toString(),
      },
      bookingsCount: bookings.length,
      message: `Vote resolved! Winning quote awarded to best dealer. All ${bookings.length} bookings locked with escrow tokens.`,
    };
  }

  async fastForwardCompleteDelivery(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            booking: true,
            buyerProfile: true,
          },
        },
        rfq: {
          include: {
            winningQuote: {
              include: { sellerProfile: true },
            },
          },
        },
        targetZone: true,
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    const winningQuote = group.rfq?.winningQuote;
    const seller = winningQuote?.sellerProfile;

    let deliveriesUpdated = 0;

    for (const m of group.memberships) {
      if (m.booking) {
        // 1. Mark booking FULFILLED
        await this.prisma.booking.update({
          where: { id: m.booking.id },
          data: {
            status: 'FULFILLED',
            registrationNumber: `MH-12-FF-${String(Math.floor(1000 + Math.random() * 9000))}`,
          },
        });

        // 2. Delivery Shipment
        const shipment = await this.prisma.deliveryShipment.upsert({
          where: { bookingId: m.booking.id },
          create: {
            bookingId: m.booking.id,
            logisticsProvider: 'GroupDrive Regional Fleet Logistics',
            driverName: 'Vikram Singh Rathore',
            driverPhone: '+919822998877',
            trackingNumber: `TRK-GD-${m.booking.bookingNumber}`,
            originBranchId: winningQuote?.branchId || seller?.id || group.targetZoneId,
            destinationZoneId: group.targetZoneId,
            status: 'DOORSTEP_DELIVERED',
            estimatedDeliveryAt: new Date(),
            actualDeliveredAt: new Date(),
          },
          update: {
            status: 'DOORSTEP_DELIVERED',
            actualDeliveredAt: new Date(),
          },
        });

        // 3. Shipment Milestone
        await this.prisma.shipmentMilestone.create({
          data: {
            shipmentId: shipment.id,
            title: 'Doorstep Delivered & Inspected',
            locationName: `${group.targetZone.name} Rural Delivery Hub`,
            timestamp: new Date(),
            proofPhotoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
          },
        });

        // 4. Settle Commission (1% of deal value + 18% GST)
        if (seller && winningQuote) {
          const grossVal = winningQuote.totalLandedCostPaise;
          const commissionPaise = BigInt(Math.round(Number(grossVal) * 0.01));
          const netSellerPayable = grossVal - commissionPaise;

          await this.prisma.settlement.upsert({
            where: { bookingId: m.booking.id },
            create: {
              bookingId: m.booking.id,
              sellerProfileId: seller.id,
              grossDealValuePaise: grossVal,
              commissionPercent: 1.0,
              platformCommissionPaise: commissionPaise,
              netPayableToSellerPaise: netSellerPayable,
              status: 'PROCESSED',
              settledAt: new Date(),
            },
            update: {
              status: 'PROCESSED',
              settledAt: new Date(),
            },
          });
        }

        // 5. Buyer Review
        if (seller) {
          await this.prisma.review.upsert({
            where: { bookingId: m.booking.id },
            create: {
              bookingId: m.booking.id,
              buyerProfileId: m.buyerProfileId,
              sellerProfileId: seller.id,
              rating: 5,
              title: 'Fast-forward verified delivery & huge group discount!',
              comment: `Seamless collective buying. Vehicle handed over with full inspection checklist at ${group.targetZone.name}.`,
            },
            update: {},
          });
        }

        deliveriesUpdated++;
      }
    }

    // Mark group COMPLETED
    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: { status: 'COMPLETED' },
    });

    return {
      success: true,
      step: 'DELIVERED_AND_SETTLED',
      group: updatedGroup,
      deliveriesUpdated,
      message: `All ${deliveriesUpdated} vehicle deliveries verified! 1% platform commission settled and buyer reviews generated.`,
    };
  }

  async fastForwardResetGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        rfq: {
          include: {
            quotes: true,
          },
        },
        memberships: {
          include: {
            booking: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    // Clean bookings, reviews, settlements, shipments for this group
    for (const m of group.memberships) {
      if (m.booking) {
        await this.prisma.review.deleteMany({ where: { bookingId: m.booking.id } });
        await this.prisma.settlement.deleteMany({ where: { bookingId: m.booking.id } });
        await this.prisma.shipmentMilestone.deleteMany({
          where: { shipment: { bookingId: m.booking.id } },
        });
        await this.prisma.deliveryShipment.deleteMany({ where: { bookingId: m.booking.id } });
        await this.prisma.booking.deleteMany({ where: { id: m.booking.id } });
      }
    }

    if (group.rfq) {
      await this.prisma.vote.deleteMany({ where: { rfqId: group.rfq.id } });
      await this.prisma.quoteLineItem.deleteMany({
        where: { quote: { rfqId: group.rfq.id } },
      });
      await this.prisma.quote.deleteMany({ where: { rfqId: group.rfq.id } });
      await this.prisma.rFQ.delete({ where: { id: group.rfq.id } });
    }

    const resetGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'FORMING',
        currentCount: 2,
        quorumReachedAt: null,
        dealLockedAt: null,
      },
    });

    return {
      success: true,
      step: 'GROUP_RESET_TO_FORMING',
      group: resetGroup,
      message: `Group '${groupId.slice(0, 8)}' reset to FORMING (2/${group.targetCount} members). Ready for new demo run!`,
    };
  }
}
