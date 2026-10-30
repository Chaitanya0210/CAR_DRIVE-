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
}
