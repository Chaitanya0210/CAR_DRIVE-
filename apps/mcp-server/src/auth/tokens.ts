import crypto from 'node:crypto';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export type AuthScope =
  'buyer:read' | 'buyer:write' | 'seller:read' | 'seller:write' | 'admin:read' | 'admin:write';

export interface AuthContext {
  userId: string;
  role: UserRole;
  scopes: AuthScope[];
  dealershipId?: string;
  zoneId?: string;
  authorizedBrands?: string[];
  serviceableZones?: string[];
  costBudgetUsd?: number;
}

export class UnauthorizedError extends Error {
  public readonly code = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public readonly code = 403;
  constructor(message = 'Forbidden: Insufficient permissions for this tool') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// In-memory token registry for demo / mock JWT scoped tokens
const TOKEN_REGISTRY = new Map<string, AuthContext>();

/**
 * Creates and registers a signed mock scoped token for testing / client sessions.
 */
export function createScopedToken(context: AuthContext): string {
  const token = `gd_${context.role.toLowerCase()}_${crypto.randomBytes(16).toString('hex')}`;
  TOKEN_REGISTRY.set(token, { ...context });
  return token;
}

/**
 * Validates and parses a bearer/scoped token into AuthContext.
 */
export function authenticateToken(token?: string): AuthContext {
  if (!token) {
    throw new UnauthorizedError(
      'Missing authentication token. Pass valid scoped token in headers or metadata.',
    );
  }

  // Pre-configured well-known demo tokens
  if (token === 'demo-buyer-token') {
    return {
      userId: 'buyer-demo-01',
      role: 'BUYER',
      scopes: ['buyer:read', 'buyer:write'],
      zoneId: 'zone-baramati',
      costBudgetUsd: 5.0,
    };
  }

  if (token === 'demo-seller-token') {
    return {
      userId: 'seller-rep-01',
      role: 'SELLER',
      scopes: ['seller:read', 'seller:write'],
      dealershipId: 'dealer-pune-mahindra',
      authorizedBrands: ['Mahindra', 'Tata'],
      serviceableZones: ['zone-baramati', 'zone-pune', 'zone-satara', 'zone-haveli'],
      costBudgetUsd: 10.0,
    };
  }

  if (token === 'demo-admin-token') {
    return {
      userId: 'admin-ops-01',
      role: 'ADMIN',
      scopes: ['admin:read', 'admin:write', 'buyer:read', 'seller:read'],
      costBudgetUsd: 25.0,
    };
  }

  const registered = TOKEN_REGISTRY.get(token);
  if (registered) {
    return registered;
  }

  throw new UnauthorizedError(`Invalid or expired token: ${token.substring(0, 8)}...`);
}

/**
 * Checks if a given auth context has required scope and role.
 */
export function assertAuthorized(
  auth: AuthContext,
  requiredRole: UserRole,
  requiredScope?: AuthScope,
): void {
  if (auth.role === 'ADMIN') {
    return; // Admin has superuser privileges across scopes
  }

  if (auth.role !== requiredRole) {
    throw new ForbiddenError(
      `Role mismatch: Tool requires role '${requiredRole}', but caller has role '${auth.role}'.`,
    );
  }

  if (requiredScope && !auth.scopes.includes(requiredScope)) {
    throw new ForbiddenError(
      `Missing required scope: '${requiredScope}'. Caller scopes: [${auth.scopes.join(', ')}].`,
    );
  }
}
