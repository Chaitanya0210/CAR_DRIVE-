import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { SellerAnalyticsService } from './seller-analytics.service';

@Controller('sellers')
export class SellerAnalyticsController {
  constructor(private sellerAnalyticsService: SellerAnalyticsService) {}

  @Get('me/dashboard-stats')
  async getDashboardStats(
    @Query('sellerProfileId') sellerProfileId?: string,
    @Headers('x-seller-id') sellerHeaderId?: string,
  ) {
    return this.sellerAnalyticsService.getDashboardStats(sellerProfileId || sellerHeaderId);
  }

  @Get('me/territory-demand')
  async getTerritoryDemand(
    @Query('sellerProfileId') sellerProfileId?: string,
    @Headers('x-seller-id') sellerHeaderId?: string,
  ) {
    return this.sellerAnalyticsService.getTerritoryDemand(sellerProfileId || sellerHeaderId);
  }

  @Post('me/inventory/import-csv')
  async importInventoryCsv(
    @Body('rows') rows: Array<Record<string, unknown>>,
    @Body('sellerProfileId') sellerProfileId?: string,
    @Headers('x-seller-id') sellerHeaderId?: string,
  ) {
    const seller = await this.sellerAnalyticsService.getSellerProfile(
      sellerProfileId || sellerHeaderId,
    );
    return this.sellerAnalyticsService.importInventoryCsv(seller.id, rows || []);
  }
}
