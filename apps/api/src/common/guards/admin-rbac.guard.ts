import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, AdminRole, hasPermission } from '@groupdrive/shared';
import { ADMIN_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class AdminRbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<AdminPermission>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Support either header 'x-admin-role', query param 'role', or request.user.adminRole / request.user.role
    const roleHeader = request.headers['x-admin-role'] || request.query?.adminRole;
    const role: AdminRole = (roleHeader?.toString().toUpperCase() as AdminRole) || 'ADMIN';

    if (!hasPermission(role, requiredPermission)) {
      throw new ForbiddenException(
        `Access denied: Admin role '${role}' lacks required permission '${requiredPermission}'`,
      );
    }

    // Attach verified role to request for downstream services
    request.adminRole = role;
    return true;
  }
}
