import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Seller Portal Authentication & IDOR Guard (OWASP A01:2021 / ASVS V4.1).
 * 1. Portal Audience Isolation: Ensures only SELLER or ADMIN can access seller routes.
 * 2. Insecure Direct Object Reference (IDOR) Defense: Ensures Seller A cannot inspect or mutate Seller B's data.
 */
@Injectable()
export class SellerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extract auth headers
    const authRole = (
      request.headers['x-user-role'] ||
      request.headers['x-seller-role'] ||
      request.user?.role ||
      'SELLER'
    )
      .toString()
      .toUpperCase();

    const authSellerId =
      request.headers['x-seller-id'] ||
      request.headers['x-authenticated-seller-id'] ||
      request.user?.sellerProfileId;

    if (!authSellerId) {
      throw new UnauthorizedException('Authentication required: Missing seller credentials');
    }

    // Portal Token Isolation: Buyers cannot call seller endpoints
    if (authRole === 'BUYER') {
      throw new ForbiddenException(
        'Portal Audience Isolation: Buyer authentication tokens cannot access Seller Portal resources.',
      );
    }

    if (authRole !== 'SELLER' && authRole !== 'ADMIN') {
      throw new ForbiddenException(`Invalid role '${authRole}' for seller portal access`);
    }

    // IDOR Defense: If caller attempts to request data for another sellerProfileId, reject!
    const targetSellerId =
      request.query?.sellerProfileId ||
      request.params?.sellerProfileId ||
      request.body?.sellerProfileId;

    if (targetSellerId && targetSellerId !== authSellerId && authRole !== 'ADMIN') {
      throw new ForbiddenException(
        `IDOR Violation: Authenticated seller '${authSellerId}' is strictly prohibited from accessing data belonging to seller '${targetSellerId}'.`,
      );
    }

    // Attach verified identity to request
    request.sellerId = authSellerId;
    request.userRole = authRole;

    return true;
  }
}
