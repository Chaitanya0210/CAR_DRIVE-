import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canAccessModule,
  getAccessibleModules,
  type AdminRole,
} from '../rbac/matrix.js';
import { validateInventoryCsvRows } from '../schemas/inventory-csv.js';

describe('Admin RBAC Permission Matrix', () => {
  it('ADMIN has full permissions across all modules', () => {
    const adminModules = getAccessibleModules('ADMIN');
    expect(adminModules).toHaveLength(9);
    expect(hasPermission('ADMIN', 'APPROVE_REJECT_KYB')).toBe(true);
    expect(hasPermission('ADMIN', 'PROCESS_SETTLEMENTS')).toBe(true);
    expect(hasPermission('ADMIN', 'MANAGE_CATALOG')).toBe(true);
    expect(hasPermission('ADMIN', 'EXPORT_LEDGER_CSV')).toBe(true);
  });

  it('SUPPORT has triage and read access but cannot approve KYB or process settlements', () => {
    expect(canAccessModule('SUPPORT', 'DASHBOARD')).toBe(true);
    expect(canAccessModule('SUPPORT', 'USERS')).toBe(true);
    expect(canAccessModule('SUPPORT', 'DISPUTES')).toBe(true);
    expect(canAccessModule('SUPPORT', 'KYB')).toBe(true); // read-only context

    // Strictly blocked
    expect(hasPermission('SUPPORT', 'APPROVE_REJECT_KYB')).toBe(false);
    expect(hasPermission('SUPPORT', 'PROCESS_SETTLEMENTS')).toBe(false);
    expect(hasPermission('SUPPORT', 'EXPORT_LEDGER_CSV')).toBe(false);
    expect(hasPermission('SUPPORT', 'MANAGE_CATALOG')).toBe(false);
    expect(canAccessModule('SUPPORT', 'FINANCE')).toBe(false);
    expect(canAccessModule('SUPPORT', 'CATALOG')).toBe(false);
  });

  it('FINANCE can view finance, process settlements and export ledger CSV', () => {
    expect(canAccessModule('FINANCE', 'DASHBOARD')).toBe(true);
    expect(canAccessModule('FINANCE', 'FINANCE')).toBe(true);
    expect(hasPermission('FINANCE', 'PROCESS_SETTLEMENTS')).toBe(true);
    expect(hasPermission('FINANCE', 'EXPORT_LEDGER_CSV')).toBe(true);

    // Strictly blocked
    expect(hasPermission('FINANCE', 'APPROVE_REJECT_KYB')).toBe(false);
    expect(hasPermission('FINANCE', 'MANAGE_CATALOG')).toBe(false);
    expect(hasPermission('FINANCE', 'MANAGE_ZONES')).toBe(false);
    expect(canAccessModule('FINANCE', 'CATALOG')).toBe(false);
    expect(canAccessModule('FINANCE', 'DISPUTES')).toBe(false);
  });

  it('CATALOG can manage catalog and zone thresholds only', () => {
    expect(canAccessModule('CATALOG', 'CATALOG')).toBe(true);
    expect(canAccessModule('CATALOG', 'ZONES')).toBe(true);
    expect(hasPermission('CATALOG', 'MANAGE_CATALOG')).toBe(true);
    expect(hasPermission('CATALOG', 'MANAGE_ZONES')).toBe(true);

    // Strictly blocked
    expect(canAccessModule('CATALOG', 'FINANCE')).toBe(false);
    expect(canAccessModule('CATALOG', 'DISPUTES')).toBe(false);
    expect(canAccessModule('CATALOG', 'KYB')).toBe(false);
    expect(hasPermission('CATALOG', 'PROCESS_SETTLEMENTS')).toBe(false);
    expect(hasPermission('CATALOG', 'APPROVE_REJECT_KYB')).toBe(false);
  });
});

describe('Inventory CSV Validation Engine', () => {
  const validRow = {
    vin: 'MA3FBA21S00123456',
    brand: 'Mahindra',
    model: 'Scorpio-N',
    variant: 'Z8 Select Petrol MT',
    year: 2024,
    odometer: 0,
    regularPrice: 1750000,
    offerPrice: 1625000,
    color: 'Deep Forest',
    fuel: 'PETROL',
    transmission: 'MANUAL',
    category: 'CLEARANCE',
    warranty: '3 Years / 100,000 km standard OEM warranty',
  };

  it('accepts valid clearance vehicle rows', () => {
    const report = validateInventoryCsvRows([validRow]);
    expect(report.totalRows).toBe(1);
    expect(report.validRowsCount).toBe(1);
    expect(report.invalidRowsCount).toBe(0);
    expect(report.rows[0].isValid).toBe(true);
  });

  it('flags duplicate VINs within the same CSV batch', () => {
    const row2 = { ...validRow };
    const report = validateInventoryCsvRows([validRow, row2]);
    expect(report.totalRows).toBe(2);
    expect(report.validRowsCount).toBe(1);
    expect(report.invalidRowsCount).toBe(1);
    expect(report.rows[1].isValid).toBe(false);
    expect(report.rows[1].errors.some((e) => e.includes('duplicate within batch'))).toBe(true);
  });

  it('flags VIN already registered on platform', () => {
    const existing = new Set(['MA3FBA21S00123456']);
    const report = validateInventoryCsvRows([validRow], existing);
    expect(report.validRowsCount).toBe(0);
    expect(report.invalidRowsCount).toBe(1);
    expect(report.rows[0].errors.some((e) => e.includes('already registered'))).toBe(true);
  });

  it('rejects DEMO vehicle without odometer reading (> 0 km)', () => {
    const demoRow = {
      ...validRow,
      vin: 'MA3FBA21S00999999',
      category: 'DEMO',
      odometer: 0,
    };
    const report = validateInventoryCsvRows([demoRow]);
    expect(report.validRowsCount).toBe(0);
    expect(report.invalidRowsCount).toBe(1);
    expect(
      report.rows[0].errors.some((e) =>
        e.includes('Demo/test-drive vehicles must have an odometer'),
      ),
    ).toBe(true);
  });

  it('rejects offer price greater than or equal to regular price', () => {
    const overpricedRow = {
      ...validRow,
      vin: 'MA3FBA21S00888888',
      offerPrice: 1800000,
      regularPrice: 1750000,
    };
    const report = validateInventoryCsvRows([overpricedRow]);
    expect(report.validRowsCount).toBe(0);
    expect(report.invalidRowsCount).toBe(1);
    expect(
      report.rows[0].errors.some((e) => e.includes('must be strictly less than regular price')),
    ).toBe(true);
  });

  it('adds warning for unusually deep discounts (> 60%)', () => {
    const heavyDiscountRow = {
      ...validRow,
      vin: 'MA3FBA21S00777777',
      regularPrice: 1000000,
      offerPrice: 300000, // 70% off
    };
    const report = validateInventoryCsvRows([heavyDiscountRow]);
    expect(report.validRowsCount).toBe(1);
    expect(report.rows[0].isValid).toBe(true);
    expect(report.rows[0].warnings.some((w) => w.includes('Unusually high discount'))).toBe(true);
  });
});
