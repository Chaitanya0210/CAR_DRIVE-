import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateInventoryCsvRows, InventoryCsvValidationReport } from '@groupdrive/shared';
import { VehicleConditionType } from '@groupdrive/db';

@Injectable()
export class SellerAnalyticsService {
  constructor(private prisma: PrismaService = new PrismaService()) {}

  async getSellerProfile(sellerProfileId?: string) {
    if (sellerProfileId) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        include: {
          brandAuthorizations: { include: { brand: true } },
          branches: { include: { zone: true } },
        },
      });
      if (seller) return seller;
    }

    // Default to the first seller in the database (e.g., from seed script)
    const firstSeller = await this.prisma.sellerProfile.findFirst({
      include: {
        brandAuthorizations: { include: { brand: true } },
        branches: { include: { zone: true } },
      },
    });

    if (!firstSeller) {
      throw new NotFoundException('No seller dealership found in database');
    }
    return firstSeller;
  }

  async getDashboardStats(sellerProfileId?: string) {
    const seller = await this.getSellerProfile(sellerProfileId);
    const authorizedBrandIds = seller.brandAuthorizations.map((b) => b.brandId);

    const openRfqsCount = await this.prisma.rFQ.count({
      where: {
        status: 'SEALED_BIDDING',
        group: {
          variant: {
            carModel: {
              brandId: { in: authorizedBrandIds },
            },
          },
        },
      },
    });

    const sellerQuotes = await this.prisma.quote.findMany({
      where: { sellerProfileId: seller.id },
      select: {
        id: true,
        status: true,
        exShowroomPaise: true,
        batchGroupDiscountPaise: true,
      },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        OR: [
          { quote: { sellerProfileId: seller.id } },
          { offeredVehicle: { sellerProfileId: seller.id } },
          { settlement: { sellerProfileId: seller.id } },
        ],
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
        settlement: {
          select: {
            platformCommissionPaise: true,
          },
        },
        status: true,
      },
    });

    const totalQuotes = sellerQuotes.length;
    const activeBids = sellerQuotes.filter(
      (q) => q.status === 'SEALED' || q.status === 'ACCEPTED',
    ).length;
    const wonQuotes = sellerQuotes.filter((q) => q.status === 'ACCEPTED').length;
    const winRatePercent =
      totalQuotes > 0 ? Number(((wonQuotes / totalQuotes) * 100).toFixed(1)) : 0;

    // Total revenue generated from bookings in paise
    const totalRevenuePaise = bookings.reduce(
      (acc, b) => acc + BigInt(b.totalOnRoadPaise.toString()),
      BigInt(0),
    );

    // Platform commission owed (1%)
    const commissionOwedPaise = bookings.reduce((acc, b) => {
      const comm = b.settlement?.platformCommissionPaise
        ? BigInt(b.settlement.platformCommissionPaise.toString())
        : BigInt(b.totalOnRoadPaise.toString()) / BigInt(100);
      return acc + comm;
    }, BigInt(0));

    return {
      dealership: {
        id: seller.id,
        tradeName: seller.tradeName,
        legalName: seller.dealershipLegalName,
        gstin: seller.gstin,
        kycStatus: seller.kycStatus,
        registrationFeeStatus: seller.registrationFeeStatus,
        authorizedBrands: seller.brandAuthorizations.map((b) => b.brand.name),
        primaryBranchZone: seller.branches[0]?.zone?.name || 'Maharashtra',
      },
      stats: {
        openRfqsInTerritory: openRfqsCount,
        activeBidsCount: activeBids,
        totalBidsSubmitted: totalQuotes,
        rfqsWon: wonQuotes,
        winRatePercent,
        totalRevenuePaise: totalRevenuePaise.toString(),
        totalRevenueInr: Number(totalRevenuePaise) / 100,
        totalRevenueLakhs: (Number(totalRevenuePaise) / 100 / 100000).toFixed(2),
        commissionOwedPaise: commissionOwedPaise.toString(),
        commissionOwedInr: Number(commissionOwedPaise) / 100,
        commissionRatePercent: 1.0,
      },
    };
  }

  async getTerritoryDemand(sellerProfileId?: string) {
    const seller = await this.getSellerProfile(sellerProfileId);
    const authorizedBrandIds = seller.brandAuthorizations.map((b) => b.brandId);

    // Find groups forming or in RFQ stage for this dealer's authorized brands
    const groups = await this.prisma.group.findMany({
      where: {
        status: { in: ['FORMING', 'QUORUM_REACHED', 'RFQ_ACTIVE', 'VOTING_OPEN'] },
        variant: {
          carModel: {
            brandId: { in: authorizedBrandIds },
          },
        },
      },
      include: {
        targetZone: {
          include: { parent: true },
        },
        variant: {
          include: {
            carModel: { include: { brand: true } },
          },
        },
        memberships: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return {
      dealership: seller.tradeName,
      totalDemandGroups: groups.length,
      demandCohorts: groups.map((g) => {
        const memberCount = g.memberships.length || g.currentCount;
        const targetBuyers = g.targetCount || 5;
        const fillRatePercent = Math.min(100, Math.round((memberCount / targetBuyers) * 100));

        return {
          groupId: g.id,
          groupName: `${g.variant.carModel.name} ${g.variant.name} Group`,
          status: g.status,
          brand: g.variant.carModel.brand.name,
          model: g.variant.carModel.name,
          variant: g.variant.name,
          zone: g.targetZone.name,
          district: g.targetZone.parent?.name || 'District Hub',
          densityClass: g.targetZone.densityClass,
          currentBuyers: memberCount,
          targetBuyers,
          fillRatePercent,
          deadlineDate: g.deadline ? g.deadline.toISOString() : new Date().toISOString(),
          estimatedDealSizeLakhs: ((memberCount * 1500000) / 100000).toFixed(1),
        };
      }),
    };
  }

  async importInventoryCsv(
    sellerProfileId: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<InventoryCsvValidationReport & { importedCount: number }> {
    const seller = await this.getSellerProfile(sellerProfileId);

    // Default branch
    const branch = seller.branches[0];
    if (!branch) {
      throw new NotFoundException(`No branch registered for seller '${seller.id}'`);
    }

    // Existing platform VINs
    const existingVehicles = await this.prisma.offeredVehicle.findMany({
      select: { vin: true },
    });
    const existingVins = new Set(existingVehicles.map((v) => v.vin.toUpperCase()));

    // Run shared validation engine
    const report = validateInventoryCsvRows(rows, existingVins);

    // Get any available default variant to link in case variant string lookup needs fallback
    const defaultVariant = await this.prisma.variant.findFirst();
    if (!defaultVariant) {
      throw new NotFoundException('Catalog variants must exist prior to inventory import');
    }

    let importedCount = 0;

    for (const validRow of report.rows.filter((r) => r.isValid)) {
      const data = validRow.data;
      if (!data.vin) continue;

      // Check if variant matches catalog or fallback to default
      const catalogVariant = await this.prisma.variant.findFirst({
        where: {
          name: { contains: data.variant, mode: 'insensitive' },
        },
      });
      const variantId = catalogVariant?.id || defaultVariant.id;

      const regularPaise = BigInt(Math.round((data.regularPrice || 1500000) * 100));
      const discountedPaise = BigInt(Math.round((data.offerPrice || 1400000) * 100));

      await this.prisma.offeredVehicle.upsert({
        where: { vin: data.vin.toUpperCase() },
        update: {
          regularPricePaise: regularPaise,
          discountedPricePaise: discountedPaise,
          odometerKm: data.odometer || 0,
          color: data.color || 'White',
          isAvailable: true,
        },
        create: {
          sellerProfileId: seller.id,
          branchId: branch.id,
          variantId,
          vin: data.vin.toUpperCase(),
          manufactureYear: data.year || 2024,
          conditionType: (data.category as VehicleConditionType) || 'CLEARANCE',
          odometerKm: data.odometer || 0,
          color: data.color || 'White',
          regularPricePaise: regularPaise,
          discountedPricePaise: discountedPaise,
          imageUrl:
            'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
          isAvailable: true,
        },
      });

      importedCount++;
    }

    return {
      ...report,
      importedCount,
    };
  }
}
