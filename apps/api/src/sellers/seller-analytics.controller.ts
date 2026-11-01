import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SellerAnalyticsService } from './seller-analytics.service';
import { SellerAuthGuard } from '../common/guards/seller-auth.guard';

@Controller('sellers')
@UseGuards(SellerAuthGuard)
export class SellerAnalyticsController {
  constructor(private sellerAnalyticsService: SellerAnalyticsService) {}

  @Get('me/dashboard-stats')
  async getDashboardStats(@Req() req: any) {
    return this.sellerAnalyticsService.getDashboardStats(req.sellerId);
  }

  @Get('me/territory-demand')
  async getTerritoryDemand(@Req() req: any) {
    return this.sellerAnalyticsService.getTerritoryDemand(req.sellerId);
  }

  @Post('me/inventory/import-csv')
  async importInventoryCsv(@Req() req: any, @Body('rows') rows: Array<Record<string, unknown>>) {
    const seller = await this.sellerAnalyticsService.getSellerProfile(req.sellerId);
    return this.sellerAnalyticsService.importInventoryCsv(seller.id, rows || []);
  }
}
