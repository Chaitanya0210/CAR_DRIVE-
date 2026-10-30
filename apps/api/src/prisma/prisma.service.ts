import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma, PrismaClient } from '@groupdrive/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient = prisma;

  async onModuleInit() {
    await prisma.$connect();
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }

  get user() {
    return prisma.user;
  }
  get buyerProfile() {
    return prisma.buyerProfile;
  }
  get sellerProfile() {
    return prisma.sellerProfile;
  }
  get sellerBranch() {
    return prisma.sellerBranch;
  }
  get sellerBrandAuthorization() {
    return prisma.sellerBrandAuthorization;
  }
  get sellerKyc() {
    return prisma.sellerKyc;
  }
  get sellerRegistrationPayment() {
    return prisma.sellerRegistrationPayment;
  }
  get zone() {
    return prisma.zone;
  }
  get zoneCluster() {
    return prisma.zoneCluster;
  }
  get brand() {
    return prisma.brand;
  }
  get carModel() {
    return prisma.carModel;
  }
  get variant() {
    return prisma.variant;
  }
  get group() {
    return prisma.group;
  }
  get membership() {
    return prisma.membership;
  }
  get rFQ() {
    return prisma.rFQ;
  }
  get quote() {
    return prisma.quote;
  }
  get booking() {
    return prisma.booking;
  }
  get settlement() {
    return prisma.settlement;
  }
  get deliveryShipment() {
    return prisma.deliveryShipment;
  }
  get shipmentMilestone() {
    return prisma.shipmentMilestone;
  }
  get offeredVehicle() {
    return prisma.offeredVehicle;
  }
  get offerEnquiry() {
    return prisma.offerEnquiry;
  }
  get review() {
    return prisma.review;
  }
  get ledgerEntry() {
    return prisma.ledgerEntry;
  }
  get auditLog() {
    return prisma.auditLog;
  }
  get notification() {
    return prisma.notification;
  }
  get stateTaxConfig() {
    return prisma.stateTaxConfig;
  }
  get $transaction() {
    return prisma.$transaction.bind(prisma);
  }
  get $executeRawUnsafe() {
    return prisma.$executeRawUnsafe.bind(prisma);
  }
  get $queryRawUnsafe() {
    return prisma.$queryRawUnsafe.bind(prisma);
  }
}
