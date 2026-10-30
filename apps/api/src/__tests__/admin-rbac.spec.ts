import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission } from '@groupdrive/shared';
import { AppModule } from '../app.module';
import { AdminService } from '../admin/admin.service';
import { AdminFinanceService } from '../admin/admin-finance.service';
import { SellerAnalyticsService } from '../sellers/seller-analytics.service';
import { AdminRbacGuard } from '../common/guards/admin-rbac.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('Admin RBAC Guard & Backend Admin Endpoints', () => {
  let app: INestApplication;
  let adminService: AdminService;
  let financeService: AdminFinanceService;
  let sellerAnalyticsService: SellerAnalyticsService;
  let prisma: PrismaService;
  let guard: AdminRbacGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminService = moduleFixture.get<AdminService>(AdminService);
    financeService = moduleFixture.get<AdminFinanceService>(AdminFinanceService);
    sellerAnalyticsService = moduleFixture.get<SellerAnalyticsService>(SellerAnalyticsService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    reflector = moduleFixture.get<Reflector>(Reflector);
    guard = new AdminRbacGuard(reflector);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RBAC Guard Tests Per Role', () => {
    function createMockContext(role: string, permission: AdminPermission): ExecutionContext {
      reflector.getAllAndOverride = () => permission;
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { 'x-admin-role': role },
            query: {},
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('ADMIN is permitted for all administrative operations', () => {
      const kybContext = createMockContext('ADMIN', 'APPROVE_REJECT_KYB');
      expect(guard.canActivate(kybContext)).toBe(true);

      const financeContext = createMockContext('ADMIN', 'VIEW_FINANCE');
      expect(guard.canActivate(financeContext)).toBe(true);

      const catalogContext = createMockContext('ADMIN', 'MANAGE_CATALOG');
      expect(guard.canActivate(catalogContext)).toBe(true);
    });

    it('SUPPORT is rejected with 403 on financial and KYB approval operations', () => {
      // Support can view disputes and live ops
      const liveOpsContext = createMockContext('SUPPORT', 'VIEW_LIVE_OPS');
      expect(guard.canActivate(liveOpsContext)).toBe(true);

      const usersContext = createMockContext('SUPPORT', 'VIEW_USERS');
      expect(guard.canActivate(usersContext)).toBe(true);

      // Support CANNOT approve/reject KYB
      const kybApprovalContext = createMockContext('SUPPORT', 'APPROVE_REJECT_KYB');
      expect(() => guard.canActivate(kybApprovalContext)).toThrow(ForbiddenException);

      // Support CANNOT view finance ledger
      const financeContext = createMockContext('SUPPORT', 'VIEW_FINANCE');
      expect(() => guard.canActivate(financeContext)).toThrow(ForbiddenException);
    });

    it('FINANCE is rejected with 403 on catalog and KYB approval operations', () => {
      // Finance can view finance and export CSV
      const financeContext = createMockContext('FINANCE', 'VIEW_FINANCE');
      expect(guard.canActivate(financeContext)).toBe(true);

      const exportContext = createMockContext('FINANCE', 'EXPORT_LEDGER_CSV');
      expect(guard.canActivate(exportContext)).toBe(true);

      // Finance CANNOT manage catalog
      const catalogContext = createMockContext('FINANCE', 'MANAGE_CATALOG');
      expect(() => guard.canActivate(catalogContext)).toThrow(ForbiddenException);

      // Finance CANNOT approve KYB
      const kybContext = createMockContext('FINANCE', 'APPROVE_REJECT_KYB');
      expect(() => guard.canActivate(kybContext)).toThrow(ForbiddenException);
    });

    it('CATALOG is rejected with 403 on financial and dispute operations', () => {
      // Catalog can manage catalog & zones
      const catalogContext = createMockContext('CATALOG', 'MANAGE_CATALOG');
      expect(guard.canActivate(catalogContext)).toBe(true);

      // Catalog CANNOT view finance
      const financeContext = createMockContext('CATALOG', 'VIEW_FINANCE');
      expect(() => guard.canActivate(financeContext)).toThrow(ForbiddenException);

      // Catalog CANNOT view disputes
      const disputesContext = createMockContext('CATALOG', 'VIEW_DISPUTES');
      expect(() => guard.canActivate(disputesContext)).toThrow(ForbiddenException);
    });
  });

  describe('Live Ops & KYB Review Workflow', () => {
    it('fetches live ops metrics with valid numbers', async () => {
      const metrics = await adminService.getLiveOpsMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.gmvPaise).toBe('string');
      expect(metrics.totalGroupsCount).toBeGreaterThanOrEqual(0);
      expect(metrics.avgDiscountPercent).toBeGreaterThan(0);
      expect(metrics.groupStatusCounts).toBeDefined();
    });

    it('fetches KYB pending queue and can approve seller with audit log', async () => {
      const sellers = await adminService.getPendingKybQueue();
      expect(Array.isArray(sellers)).toBe(true);

      if (sellers.length > 0) {
        const testSeller = sellers[0];
        const approvalRes = await adminService.approveSellerKyb(testSeller.id, 'test-admin-uid');
        expect(approvalRes.success).toBe(true);
        expect(approvalRes.kycStatus).toBe('VERIFIED');

        // Verify audit log entry was created
        const auditLog = await prisma.auditLog.findFirst({
          where: {
            entityType: 'SellerProfile',
            entityId: testSeller.id,
            action: 'SELLER_KYB_APPROVED',
          },
          orderBy: { createdAt: 'desc' },
        });
        expect(auditLog).toBeDefined();
        expect(auditLog?.newState).toBe('VERIFIED');
      }
    });

    it('rejects KYB when no reason is provided', async () => {
      const sellers = await adminService.getPendingKybQueue();
      if (sellers.length > 0) {
        await expect(adminService.rejectSellerKyb(sellers[0].id, '')).rejects.toThrow();
      }
    });
  });

  describe('Finance & Ledger CSV Export', () => {
    it('computes finance summary with fees and 1% commissions', async () => {
      const summary = await financeService.getFinanceSummary();
      expect(summary.registrationFees).toBeDefined();
      expect(summary.commissions.ratePercent).toBe(1.0);
      expect(summary.settlements).toBeDefined();
    });

    it('generates compliant RFC 4180 CSV export of ledger entries', async () => {
      const csv = await financeService.exportLedgerCsv();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Entry Number');
      expect(csv).toContain('Account Type');
      expect(csv).toContain('Debit (INR)');
      expect(csv).toContain('Credit (INR)');
      expect(csv).toContain('Balance After (INR)');
    });
  });

  describe('Seller Analytics & CSV Inventory Importer', () => {
    it('returns seller dashboard statistics with Win Rate % and revenue', async () => {
      const stats = await sellerAnalyticsService.getDashboardStats();
      expect(stats.dealership).toBeDefined();
      expect(stats.stats.winRatePercent).toBeGreaterThanOrEqual(0);
      expect(stats.stats.commissionRatePercent).toBe(1.0);
    });

    it('returns regional buyer demand cohorts grouped by zone', async () => {
      const demand = await sellerAnalyticsService.getTerritoryDemand();
      expect(demand.dealership).toBeDefined();
      expect(Array.isArray(demand.demandCohorts)).toBe(true);
    });

    it('imports bulk inventory CSV and returns comprehensive validation report', async () => {
      const seller = await sellerAnalyticsService.getSellerProfile();
      const uniqueVin = `MA3CSV${Date.now().toString().slice(-10)}`;
      const rawRows = [
        {
          vin: uniqueVin,
          brand: 'Tata',
          model: 'Nexon',
          variant: 'Creative Plus Petrol MT',
          year: 2024,
          odometer: 0,
          regularPrice: 1250000,
          offerPrice: 1140000,
          color: 'Daytona Grey',
          fuel: 'PETROL',
          transmission: 'MANUAL',
          category: 'CLEARANCE',
          warranty: '3 Years Comprehensive Warranty',
        },
        {
          vin: uniqueVin, // duplicate VIN
          brand: 'Tata',
          model: 'Nexon',
          variant: 'Creative Plus Petrol MT',
          year: 2024,
          odometer: 0,
          regularPrice: 1250000,
          offerPrice: 1140000,
          color: 'Flame Red',
          fuel: 'PETROL',
          transmission: 'MANUAL',
          category: 'CLEARANCE',
          warranty: '3 Years Comprehensive Warranty',
        },
      ];

      const report = await sellerAnalyticsService.importInventoryCsv(seller.id, rawRows);
      expect(report.totalRows).toBe(2);
      expect(report.validRowsCount).toBe(1);
      expect(report.invalidRowsCount).toBe(1);
      expect(report.importedCount).toBe(1);
    });
  });
});
