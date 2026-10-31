import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    // Safe idempotent methods do not require CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Authorization header (Bearer tokens) from mobile/REST API clients are immune to ambient CSRF
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    // For cookie-authenticated browser sessions: double-submit cookie or header check
    const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    const cookieToken = req.cookies ? req.cookies['csrf_token'] : undefined;

    if (!headerToken) {
      throw new ForbiddenException(
        'CSRF validation failed: Missing X-CSRF-Token header on mutating request',
      );
    }

    if (cookieToken && headerToken !== cookieToken) {
      throw new ForbiddenException(
        'CSRF validation failed: Token mismatch between cookie and header',
      );
    }

    return true;
  }
}
