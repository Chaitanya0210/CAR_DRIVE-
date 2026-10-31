import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Buyer Portal Authentication & IDOR Guard (OWASP A01:2021 / ASVS V4.1).
 * 1. Portal Audience Isolation: Ensures only BUYER or ADMIN can access buyer order routes.
 * 2. Insecure Direct Object Reference (IDOR) Defense: Ensures Buyer A cannot inspect Buyer B's bookings.
 */
@Injectable()
export class BuyerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authRole = (
      request.headers['x-user-role'] ||
      request.headers['x-buyer-role'] ||
      request.user?.role ||
      'BUYER'
    )
      .toString()
      .toUpperCase();

    const authBuyerId =
      request.headers['x-buyer-id'] ||
      request.headers['x-user-id'] ||
      request.user?.userId ||
      request.user?.id;

    if (!authBuyerId) {
      throw new UnauthorizedException('Authentication required: Missing buyer credentials');
    }

    // Portal Token Isolation: Sellers cannot call buyer order endpoints
    if (authRole === 'SELLER') {
      throw new ForbiddenException(
        'Portal Audience Isolation: Seller authentication tokens cannot access Buyer Portal resources.',
      );
    }

    if (authRole !== 'BUYER' && authRole !== 'ADMIN') {
      throw new ForbiddenException(`Invalid role '${authRole}' for buyer portal access`);
    }

    // IDOR Defense: If caller requests an order belonging to another buyer
    const targetBuyerId =
      request.query?.buyerId || request.params?.buyerId || request.body?.buyerId;

    if (targetBuyerId && targetBuyerId !== authBuyerId && authRole !== 'ADMIN') {
      throw new ForbiddenException(
        `IDOR Violation: Authenticated buyer '${authBuyerId}' cannot access data belonging to buyer '${targetBuyerId}'.`,
      );
    }

    request.buyerId = authBuyerId;
    request.userRole = authRole;

    return true;
  }
}
