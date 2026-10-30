export type AdminRole = 'ADMIN' | 'SUPPORT' | 'FINANCE' | 'CATALOG';

export type AdminPermission =
  | 'VIEW_LIVE_OPS'
  | 'VIEW_KYB_QUEUE'
  | 'APPROVE_REJECT_KYB'
  | 'VIEW_LISTING_MODERATION'
  | 'APPROVE_REJECT_LISTING'
  | 'VIEW_DISPUTES'
  | 'RESOLVE_DISPUTES'
  | 'VIEW_FINANCE'
  | 'PROCESS_SETTLEMENTS'
  | 'EXPORT_LEDGER_CSV'
  | 'VIEW_USERS'
  | 'MANAGE_SUPPORT_TICKETS'
  | 'MANAGE_ZONES'
  | 'MANAGE_CATALOG'
  | 'VIEW_AUDIT_LOGS';

export type AdminModule =
  | 'DASHBOARD'
  | 'KYB'
  | 'MODERATION'
  | 'DISPUTES'
  | 'FINANCE'
  | 'USERS'
  | 'ZONES'
  | 'CATALOG'
  | 'AUDIT_LOGS';

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  ADMIN: [
    'VIEW_LIVE_OPS',
    'VIEW_KYB_QUEUE',
    'APPROVE_REJECT_KYB',
    'VIEW_LISTING_MODERATION',
    'APPROVE_REJECT_LISTING',
    'VIEW_DISPUTES',
    'RESOLVE_DISPUTES',
    'VIEW_FINANCE',
    'PROCESS_SETTLEMENTS',
    'EXPORT_LEDGER_CSV',
    'VIEW_USERS',
    'MANAGE_SUPPORT_TICKETS',
    'MANAGE_ZONES',
    'MANAGE_CATALOG',
    'VIEW_AUDIT_LOGS',
  ],
  SUPPORT: [
    'VIEW_LIVE_OPS',
    'VIEW_KYB_QUEUE', // read-only context
    'VIEW_DISPUTES',
    'VIEW_USERS',
    'MANAGE_SUPPORT_TICKETS',
  ],
  FINANCE: ['VIEW_LIVE_OPS', 'VIEW_FINANCE', 'PROCESS_SETTLEMENTS', 'EXPORT_LEDGER_CSV'],
  CATALOG: ['MANAGE_ZONES', 'MANAGE_CATALOG'],
};

export const ADMIN_MODULE_PERMISSIONS: Record<AdminModule, AdminPermission> = {
  DASHBOARD: 'VIEW_LIVE_OPS',
  KYB: 'VIEW_KYB_QUEUE',
  MODERATION: 'VIEW_LISTING_MODERATION',
  DISPUTES: 'VIEW_DISPUTES',
  FINANCE: 'VIEW_FINANCE',
  USERS: 'VIEW_USERS',
  ZONES: 'MANAGE_ZONES',
  CATALOG: 'MANAGE_CATALOG',
  AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
};

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const permissions = ADMIN_ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

export function canAccessModule(role: AdminRole, module: AdminModule): boolean {
  const requiredPermission = ADMIN_MODULE_PERMISSIONS[module];
  if (!requiredPermission) return false;
  return hasPermission(role, requiredPermission);
}

export function getAccessibleModules(role: AdminRole): AdminModule[] {
  const allModules: AdminModule[] = [
    'DASHBOARD',
    'KYB',
    'MODERATION',
    'DISPUTES',
    'FINANCE',
    'USERS',
    'ZONES',
    'CATALOG',
    'AUDIT_LOGS',
  ];
  return allModules.filter((module) => canAccessModule(role, module));
}
