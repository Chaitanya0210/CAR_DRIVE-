import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { AdminFinanceService } from './admin-finance.service';
import { AdminRbacGuard } from '../common/guards/admin-rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('admin')
@UseGuards(AdminRbacGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private financeService: AdminFinanceService,
  ) {}

  // 1. LIVE OPS
  @Get('live-ops/metrics')
  @RequirePermission('VIEW_LIVE_OPS')
  async getLiveOpsMetrics() {
    return this.adminService.getLiveOpsMetrics();
  }

  // 2. SELLER KYB QUEUE
  @Get('kyb/pending')
  @RequirePermission('VIEW_KYB_QUEUE')
  async getPendingKybQueue() {
    return this.adminService.getPendingKybQueue();
  }

  @Post('kyb/:sellerProfileId/approve')
  @RequirePermission('APPROVE_REJECT_KYB')
  async approveSellerKyb(
    @Param('sellerProfileId') sellerProfileId: string,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.approveSellerKyb(sellerProfileId, adminUserId);
  }

  @Post('kyb/:sellerProfileId/reject')
  @RequirePermission('APPROVE_REJECT_KYB')
  async rejectSellerKyb(
    @Param('sellerProfileId') sellerProfileId: string,
    @Body('reason') reason: string,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.rejectSellerKyb(sellerProfileId, reason, adminUserId);
  }

  // 3. OFFERED VEHICLE MODERATION
  @Get('moderation/offers')
  @RequirePermission('VIEW_LISTING_MODERATION')
  async getOffersForModeration() {
    return this.adminService.getOffersForModeration();
  }

  @Post('moderation/offers/:offerId/approve')
  @RequirePermission('APPROVE_REJECT_LISTING')
  async approveOffer(
    @Param('offerId') offerId: string,
    @Body('reason') reason?: string,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.moderateOffer(offerId, true, reason, adminUserId);
  }

  @Post('moderation/offers/:offerId/reject')
  @RequirePermission('APPROVE_REJECT_LISTING')
  async rejectOffer(
    @Param('offerId') offerId: string,
    @Body('reason') reason?: string,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.moderateOffer(offerId, false, reason, adminUserId);
  }

  // 4. DISPUTES
  @Get('disputes')
  @RequirePermission('VIEW_DISPUTES')
  async getDisputes() {
    return this.adminService.getDisputes();
  }

  @Post('disputes/:settlementId/resolve')
  @RequirePermission('RESOLVE_DISPUTES')
  async resolveDispute(
    @Param('settlementId') settlementId: string,
    @Body('resolution') resolution: 'RELEASE_TO_DEALER' | 'REFUND_BUYER',
    @Body('notes') notes: string,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.resolveDispute(settlementId, resolution, notes, adminUserId);
  }

  // 5. FINANCE & LEDGER
  @Get('finance/summary')
  @RequirePermission('VIEW_FINANCE')
  async getFinanceSummary() {
    return this.financeService.getFinanceSummary();
  }

  @Get('finance/ledger')
  @RequirePermission('VIEW_FINANCE')
  async getLedgerEntries(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.financeService.getLedgerEntries(parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Get('finance/ledger/export')
  @RequirePermission('EXPORT_LEDGER_CSV')
  async exportLedgerCsv(@Res() res: Response) {
    const csvContent = await this.financeService.exportLedgerCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="groupdrive-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.status(HttpStatus.OK).send(csvContent);
  }

  // 6. USERS & SUPPORT DESK
  @Get('users')
  @RequirePermission('VIEW_USERS')
  async getUsers(@Query('search') search?: string, @Query('role') role?: string) {
    return this.adminService.getUsers(search, role);
  }

  @Post('users/:userId/notes')
  @RequirePermission('MANAGE_SUPPORT_TICKETS')
  async addSupportTicketNote(
    @Param('userId') userId: string,
    @Body('note') note: string,
    @Body('agentId') agentId?: string,
  ) {
    return this.adminService.addSupportTicketNote(userId, note, agentId);
  }

  // 7. ZONE THRESHOLDS
  @Get('zones/thresholds')
  @RequirePermission('MANAGE_ZONES')
  async getZoneThresholds() {
    return this.adminService.getZoneThresholds();
  }

  @Put('zones/thresholds')
  @RequirePermission('MANAGE_ZONES')
  async updateZoneThreshold(
    @Body('densityClass') densityClass: string,
    @Body('minGroupSize') minGroupSize: number,
    @Body('adminUserId') adminUserId?: string,
  ) {
    return this.adminService.updateZoneThreshold(densityClass, minGroupSize, adminUserId);
  }

  // 8. CATALOG
  @Get('catalog/summary')
  @RequirePermission('MANAGE_CATALOG')
  async getCatalogSummary() {
    return this.adminService.getCatalogSummary();
  }

  // 9. AUDIT LOGS
  @Get('audit-logs')
  @RequirePermission('VIEW_AUDIT_LOGS')
  async getAuditLogs(
    @Query('actorType') actorType?: string,
    @Query('action') action?: string,
    @Query('limit') limit = '50',
  ) {
    return this.adminService.getAuditLogs(actorType, action, parseInt(limit, 10));
  }
}
