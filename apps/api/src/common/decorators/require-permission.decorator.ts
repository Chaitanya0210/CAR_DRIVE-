import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '@groupdrive/shared';

export const ADMIN_PERMISSION_KEY = 'admin_permission';
export const RequirePermission = (permission: AdminPermission) =>
  SetMetadata(ADMIN_PERMISSION_KEY, permission);
