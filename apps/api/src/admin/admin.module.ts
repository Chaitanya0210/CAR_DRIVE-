import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminFinanceService } from './admin-finance.service';
import { AdminRbacGuard } from '../common/guards/admin-rbac.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminFinanceService, AdminRbacGuard],
  exports: [AdminService, AdminFinanceService],
})
export class AdminModule {}
