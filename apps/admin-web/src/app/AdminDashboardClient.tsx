'use client';

import React, { useState, useEffect } from 'react';
import {
  AdminRole,
  AdminModule,
  canAccessModule,
  getAccessibleModules,
  hasPermission,
} from '@groupdrive/shared';
import { Button, Badge, Modal } from '@groupdrive/ui';
import {
  LayoutDashboard,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  IndianRupee,
  Users,
  MapPin,
  Car,
  History,
  Download,
  CheckCircle,
  Search,
  RefreshCw,
  FileText,
  Lock,
  Sliders,
} from 'lucide-react';

interface DealershipItem {
  id: string;
  tradeName: string;
  dealershipLegalName: string;
  gstin: string;
  panNumber: string;
  kycStatus: string;
  registrationFeeStatus: string;
  primaryContactName: string;
  primaryContactPhone: string;
  brands: string[];
  documents: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    verificationStatus: string;
  }>;
}

interface OfferItem {
  id: string;
  vin: string;
  brand: string;
  model: string;
  variant: string;
  conditionType: string;
  manufactureYear: number;
  odometerKm: number;
  color: string;
  regularPriceInr: number;
  discountedPriceInr: number;
  discountPercent: number;
  dealScore: number;
  isAvailable: boolean;
  sellerName: string;
  branchLocation: string;
}

interface LedgerItem {
  id: string;
  entryNumber: number;
  accountType: string;
  bookingReference: string | null;
  debitInr: number;
  creditInr: number;
  balanceAfterInr: number;
  narration: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payloadDiff: Record<string, unknown> | null;
  createdAt: string;
}

const MODULE_DEFINITIONS: Array<{
  id: AdminModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'DASHBOARD',
    label: 'Live Ops',
    icon: LayoutDashboard,
    description: 'Live operational KPIs and group funnel',
  },
  {
    id: 'KYB',
    label: 'Seller KYB Queue',
    icon: FileCheck,
    description: 'Dealership legal document verification',
  },
  {
    id: 'MODERATION',
    label: 'Listing Moderation',
    icon: Car,
    description: 'Offered clearance and demo vehicles',
  },
  {
    id: 'DISPUTES',
    label: 'Disputes & Triage',
    icon: AlertTriangle,
    description: 'Delivery milestone disputes & resolution playbooks',
  },
  {
    id: 'FINANCE',
    label: 'Finance & Ledger',
    icon: IndianRupee,
    description: 'Registration fees, 1% commission, immutable ledger explorer',
  },
  {
    id: 'USERS',
    label: 'Users & Support',
    icon: Users,
    description: 'Buyer/Seller context lookup and staff ticket notes',
  },
  {
    id: 'ZONES',
    label: 'Zone Thresholds',
    icon: MapPin,
    description: 'Density class minimum group size parameters',
  },
  {
    id: 'CATALOG',
    label: 'Catalog Manager',
    icon: Sliders,
    description: 'Brands, models, variants and city ex-showroom prices',
  },
  {
    id: 'AUDIT_LOGS',
    label: 'Audit Logs',
    icon: History,
    description: 'Immutable event stream with diff inspector',
  },
];

const SEED_SELLERS: DealershipItem[] = [
  {
    id: 'seller-01',
    tradeName: 'Sahyadri Automotive Group',
    dealershipLegalName: 'Sahyadri Wheels India Pvt Ltd',
    gstin: '27AABCS1429B1Z1',
    panNumber: 'AABCS1429B',
    kycStatus: 'SUBMITTED',
    registrationFeeStatus: 'PENDING',
    primaryContactName: 'Vikram Shinde',
    primaryContactPhone: '+91 98220 11223',
    brands: ['Mahindra', 'Tata Motors'],
    documents: [
      {
        id: 'doc-01',
        documentType: 'TRADE_CERTIFICATE',
        documentUrl: 'https://cdn.groupdrive.in/docs/trade-cert.pdf',
        verificationStatus: 'PENDING',
      },
      {
        id: 'doc-02',
        documentType: 'GST_CERTIFICATE',
        documentUrl: 'https://cdn.groupdrive.in/docs/gst-cert.pdf',
        verificationStatus: 'VERIFIED',
      },
      {
        id: 'doc-03',
        documentType: 'CANCELLED_CHEQUE',
        documentUrl: 'https://cdn.groupdrive.in/docs/cheque.pdf',
        verificationStatus: 'PENDING',
      },
    ],
  },
  {
    id: 'seller-02',
    tradeName: 'Vidarbha Auto Links',
    dealershipLegalName: 'Vidarbha Motors & Logistics LLP',
    gstin: '27AACCV9876C1Z4',
    panNumber: 'AACCV9876C',
    kycStatus: 'VERIFIED',
    registrationFeeStatus: 'PAID',
    primaryContactName: 'Anil Deshmukh',
    primaryContactPhone: '+91 94221 44556',
    brands: ['Maruti Suzuki'],
    documents: [
      {
        id: 'doc-04',
        documentType: 'TRADE_CERTIFICATE',
        documentUrl: 'https://cdn.groupdrive.in/docs/trade-cert-2.pdf',
        verificationStatus: 'VERIFIED',
      },
      {
        id: 'doc-05',
        documentType: 'GST_CERTIFICATE',
        documentUrl: 'https://cdn.groupdrive.in/docs/gst-cert-2.pdf',
        verificationStatus: 'VERIFIED',
      },
    ],
  },
  {
    id: 'seller-03',
    tradeName: 'Malwa Motors Ltd',
    dealershipLegalName: 'Malwa Commercial Vehicles Ltd',
    gstin: '23AABCM3322D1Z9',
    panNumber: 'AABCM3322D',
    kycStatus: 'SUBMITTED',
    registrationFeeStatus: 'PENDING',
    primaryContactName: 'Rajesh Patidar',
    primaryContactPhone: '+91 98930 77889',
    brands: ['Hyundai', 'Kia'],
    documents: [
      {
        id: 'doc-06',
        documentType: 'TRADE_CERTIFICATE',
        documentUrl: 'https://cdn.groupdrive.in/docs/trade-cert-3.pdf',
        verificationStatus: 'PENDING',
      },
    ],
  },
];

const SEED_OFFERS: OfferItem[] = [
  {
    id: 'off-01',
    vin: 'MA3NC41S00112233',
    brand: 'Mahindra',
    model: 'XUV700',
    variant: 'AX7 L Petrol AT 7-Str',
    conditionType: 'CLEARANCE',
    manufactureYear: 2024,
    odometerKm: 0,
    color: 'Midnight Black',
    regularPriceInr: 2450000,
    discountedPriceInr: 2210000,
    discountPercent: 10,
    dealScore: 94,
    isAvailable: true,
    sellerName: 'Sahyadri Automotive Group',
    branchLocation: 'Pune Central Hub',
  },
  {
    id: 'off-02',
    vin: 'MA3FA21S00998877',
    brand: 'Tata Motors',
    model: 'Safari',
    variant: 'Accomplished Plus Dark 6S AT',
    conditionType: 'DEMO',
    manufactureYear: 2024,
    odometerKm: 2800,
    color: 'Oberon Black',
    regularPriceInr: 2620000,
    discountedPriceInr: 2290000,
    discountPercent: 13,
    dealScore: 91,
    isAvailable: true,
    sellerName: 'Sahyadri Automotive Group',
    branchLocation: 'Baramati Showroom',
  },
  {
    id: 'off-03',
    vin: 'MA3BZ31S00554433',
    brand: 'Maruti Suzuki',
    model: 'Brezza',
    variant: 'ZXi Smart Hybrid AT',
    conditionType: 'PREVIOUS_YEAR',
    manufactureYear: 2023,
    odometerKm: 0,
    color: 'Magma Grey',
    regularPriceInr: 1180000,
    discountedPriceInr: 1075000,
    discountPercent: 9,
    dealScore: 88,
    isAvailable: true,
    sellerName: 'Vidarbha Auto Links',
    branchLocation: 'Nagpur Ring Road',
  },
];

const SEED_LEDGER: LedgerItem[] = [
  {
    id: 'led-01',
    entryNumber: 1044,
    accountType: 'SELLER_REGISTRATION_FEE',
    bookingReference: null,
    debitInr: 0,
    creditInr: 19999,
    balanceAfterInr: 19999,
    narration: 'One-time onboarding fee collected: Vidarbha Auto Links',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'led-02',
    entryNumber: 1045,
    accountType: 'BUYER_BOOKING_ESCROW',
    bookingReference: 'BK-MAH-2026-0081',
    debitInr: 0,
    creditInr: 25000,
    balanceAfterInr: 44999,
    narration: 'Booking token held pending delivery (Scorpio-N Z8 Group)',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'led-03',
    entryNumber: 1046,
    accountType: 'PLATFORM_COMMISSION',
    bookingReference: 'BK-TAT-2026-0042',
    debitInr: 0,
    creditInr: 14200,
    balanceAfterInr: 59199,
    narration: '1% GroupDrive deal commission settlement: Nexon Creative Plus',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'led-04',
    entryNumber: 1047,
    accountType: 'GST_PAYABLE',
    bookingReference: null,
    debitInr: 0,
    creditInr: 2556,
    balanceAfterInr: 61755,
    narration: '18% GST accrued on platform commission (BK-TAT-2026-0042)',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-01',
    actorType: 'ADMIN',
    actorId: 'admin-super-01',
    action: 'SELLER_KYB_APPROVED',
    entityType: 'SellerProfile',
    entityId: 'seller-02',
    payloadDiff: { kycStatus: { from: 'SUBMITTED', to: 'VERIFIED' } },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'aud-02',
    actorType: 'SYSTEM',
    actorId: 'cron-quorum-checker',
    action: 'GROUP_STATUS_TRANSITION',
    entityType: 'Group',
    entityId: 'grp-02',
    payloadDiff: { status: { from: 'FORMING', to: 'QUORUM_REACHED' } },
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'aud-03',
    actorType: 'BUYER',
    actorId: 'usr-buyer-99',
    action: 'BUYER_BOOKING_PLACED',
    entityType: 'Booking',
    entityId: 'bkg-0081',
    payloadDiff: { bookingStatus: 'CONFIRMED', depositPaise: 2500000 },
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

export default function AdminDashboardClient() {
  const [activeRole, setActiveRole] = useState<AdminRole>('ADMIN');
  const [activeModule, setActiveModule] = useState<AdminModule>('DASHBOARD');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<DealershipItem[]>(SEED_SELLERS);
  const [offers, setOffers] = useState<OfferItem[]>(SEED_OFFERS);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>(SEED_LEDGER);
  const [selectedSellerDocs, setSelectedSellerDocs] = useState<DealershipItem | null>(null);
  const [rejectModalSellerId, setRejectModalSellerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [ticketNoteUserId, setTicketNoteUserId] = useState<string | null>(null);
  const [ticketNoteText, setTicketNoteText] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(SEED_AUDIT_LOGS);

  // Zone thresholds state
  const [zoneThresholds, setZoneThresholds] = useState<Record<string, number>>({
    METRO: 8,
    URBAN: 5,
    SEMI_URBAN: 4,
    RURAL: 3,
    DEEP_RURAL: 2,
  });

  const accessibleModules = getAccessibleModules(activeRole);

  // If active module is not permitted for the newly switched role, default to first accessible
  useEffect(() => {
    if (!canAccessModule(activeRole, activeModule)) {
      setActiveModule(accessibleModules[0] || 'DASHBOARD');
    }
  }, [activeRole, activeModule, accessibleModules]);

  // Load data from API
  const refreshData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-admin-role': activeRole };

      // 1. Fetch KYB queue if role permits
      if (canAccessModule(activeRole, 'KYB')) {
        const kybRes = await fetch('http://localhost:4000/admin/kyb/pending', { headers });
        if (kybRes.ok) {
          const kybData = await kybRes.json();
          setSellers(kybData);
        }
      }

      // 2. Fetch Moderation offers if role permits
      if (canAccessModule(activeRole, 'MODERATION')) {
        const modRes = await fetch('http://localhost:4000/admin/moderation/offers', { headers });
        if (modRes.ok) {
          const modData = await modRes.json();
          setOffers(modData);
        }
      }

      // 3. Fetch Ledger if role permits
      if (canAccessModule(activeRole, 'FINANCE')) {
        const finRes = await fetch('http://localhost:4000/admin/finance/ledger?pageSize=15', {
          headers,
        });
        if (finRes.ok) {
          const finData = await finRes.json();
          setLedgerEntries(finData.data);
        }
      }

      // 4. Fetch Audit Logs if role permits
      if (canAccessModule(activeRole, 'AUDIT_LOGS')) {
        const auditRes = await fetch('http://localhost:4000/admin/audit-logs?limit=20', {
          headers,
        });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditLogs(auditData);
        }
      }

      // 5. Fetch Zone Thresholds
      if (canAccessModule(activeRole, 'ZONES')) {
        const zoneRes = await fetch('http://localhost:4000/admin/zones/thresholds', { headers });
        if (zoneRes.ok) {
          const zoneData = await zoneRes.json();
          if (zoneData.thresholds) setZoneThresholds(zoneData.thresholds);
        }
      }
    } catch (err) {
      console.warn('API fetch warning, using seed data state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeRole]);

  // Trigger Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Actions
  const handleApproveKyb = async (sellerId: string) => {
    if (!hasPermission(activeRole, 'APPROVE_REJECT_KYB')) {
      showToast(`Permission Denied: Role '${activeRole}' cannot approve KYB`);
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/admin/kyb/${sellerId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': activeRole,
        },
        body: JSON.stringify({ adminUserId: `admin-${activeRole.toLowerCase()}` }),
      });
      if (res.ok) {
        showToast('Dealership KYB Verified! Registration gate unlocked.');
        setSellers((prev) =>
          prev.map((s) => (s.id === sellerId ? { ...s, kycStatus: 'VERIFIED' } : s)),
        );
      }
    } catch {
      // optimistic update
      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, kycStatus: 'VERIFIED' } : s)),
      );
      showToast('Dealership KYB Verified! (Optimistic)');
    }
  };

  const handleRejectKyb = async () => {
    if (!rejectModalSellerId || !rejectReason.trim()) return;
    try {
      const res = await fetch(`http://localhost:4000/admin/kyb/${rejectModalSellerId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': activeRole,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        showToast(`Dealership rejected: ${rejectReason}`);
        setSellers((prev) =>
          prev.map((s) => (s.id === rejectModalSellerId ? { ...s, kycStatus: 'REJECTED' } : s)),
        );
      }
    } catch {
      setSellers((prev) =>
        prev.map((s) => (s.id === rejectModalSellerId ? { ...s, kycStatus: 'REJECTED' } : s)),
      );
      showToast(`Dealership rejected: ${rejectReason}`);
    } finally {
      setRejectModalSellerId(null);
      setRejectReason('');
    }
  };

  const handleExportLedgerCsv = () => {
    if (!hasPermission(activeRole, 'EXPORT_LEDGER_CSV')) {
      showToast(`Permission Denied: Role '${activeRole}' cannot export CSV`);
      return;
    }
    window.open('http://localhost:4000/admin/finance/ledger/export', '_blank');
    showToast('Downloading RFC 4180 Ledger CSV export...');
  };

  const handleSaveThreshold = async (densityClass: string, size: number) => {
    try {
      await fetch('http://localhost:4000/admin/zones/thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': activeRole,
        },
        body: JSON.stringify({ densityClass, minGroupSize: size }),
      });
      setZoneThresholds((prev) => ({ ...prev, [densityClass]: size }));
      showToast(`Updated minimum group threshold for ${densityClass} to ${size} buyers`);
    } catch {
      setZoneThresholds((prev) => ({ ...prev, [densityClass]: size }));
      showToast(`Updated threshold (local): ${densityClass} = ${size}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-lg border border-neutral-700 flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Role Switcher */}
      <header className="bg-white border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-sm">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-neutral-900 tracking-tight">GroupDrive</h1>
                <Badge variant="primary" size="sm">
                  Admin Console
                </Badge>
                <span className="text-xs text-neutral-400">• India Rural Operations</span>
              </div>
              <p className="text-xs text-neutral-500">
                Reverse Auction Governance, KYB Verification & Financial Ledger
              </p>
            </div>
          </div>

          {/* Role Switcher Bar */}
          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200 self-start md:self-auto">
            <span className="text-xs font-semibold text-neutral-600 px-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
              Active Role:
            </span>
            {(['ADMIN', 'SUPPORT', 'FINANCE', 'CATALOG'] as AdminRole[]).map((role) => {
              const isSelected = activeRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? role === 'ADMIN'
                        ? 'bg-primary text-white shadow-sm'
                        : role === 'SUPPORT'
                          ? 'bg-sky-700 text-white shadow-sm'
                          : role === 'FINANCE'
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-amber-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-100 flex items-center gap-1 overflow-x-auto py-1">
          {MODULE_DEFINITIONS.map((mod) => {
            const hasAccess = canAccessModule(activeRole, mod.id);
            const isCurrent = activeModule === mod.id;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                disabled={!hasAccess}
                onClick={() => setActiveModule(mod.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : hasAccess
                      ? 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                      : 'text-neutral-300 cursor-not-allowed opacity-50'
                }`}
                title={!hasAccess ? `Access restricted for role '${activeRole}'` : mod.description}
              >
                <Icon
                  className={`w-4 h-4 ${isCurrent ? 'text-white' : hasAccess ? 'text-neutral-500' : 'text-neutral-300'}`}
                />
                <span>{mod.label}</span>
                {!hasAccess && <Lock className="w-3 h-3 text-neutral-300 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Module Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
              {MODULE_DEFINITIONS.find((m) => m.id === activeModule)?.label}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {MODULE_DEFINITIONS.find((m) => m.id === activeModule)?.description}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            {activeModule === 'FINANCE' && hasPermission(activeRole, 'EXPORT_LEDGER_CSV') && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportLedgerCsv}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Ledger CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* MODULE 1: LIVE OPS DASHBOARD */}
        {activeModule === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Gross Deal Value (GMV)</div>
                <div className="text-2xl font-black text-neutral-900">₹1.45 Cr</div>
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span>+18.4% this month</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Active Groups Forming</div>
                <div className="text-2xl font-black text-neutral-900">18</div>
                <div className="text-[11px] text-neutral-500">Maharashtra & MP Talukas</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Open Reverse RFQs</div>
                <div className="text-2xl font-black text-primary">6 Active</div>
                <div className="text-[11px] text-neutral-500">Sealed dealer bidding open</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Avg Group Discount</div>
                <div className="text-2xl font-black text-emerald-700">12.4%</div>
                <div className="text-[11px] text-neutral-500">₹1.4L - ₹2.8L savings per car</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Delivery Dispute Rate</div>
                <div className="text-2xl font-black text-neutral-900">0.0%</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  &lt; 1% SLA guaranteed
                </div>
              </div>
            </div>

            {/* Group Lifecycle Funnel */}
            <div className="p-6 rounded-2xl bg-white border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">
                  Buyer Group Reverse Auction Funnel
                </h3>
                <Badge variant="primary" size="sm">
                  Real-time Pipeline
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  {
                    label: '1. Forming',
                    count: 8,
                    color: 'bg-blue-50 text-blue-800 border-blue-200',
                  },
                  {
                    label: '2. Quorum Met',
                    count: 4,
                    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                  },
                  {
                    label: '3. RFQ Bidding',
                    count: 6,
                    color: 'bg-amber-50 text-amber-800 border-amber-200',
                  },
                  {
                    label: '4. Voting Open',
                    count: 3,
                    color: 'bg-purple-50 text-purple-800 border-purple-200',
                  },
                  {
                    label: '5. Winner Locked',
                    count: 2,
                    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  },
                  {
                    label: '6. Fulfilled',
                    count: 14,
                    color: 'bg-neutral-100 text-neutral-800 border-neutral-200',
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${step.color} flex flex-col justify-between`}
                  >
                    <div className="text-xs font-semibold">{step.label}</div>
                    <div className="text-2xl font-black mt-2">{step.count} Groups</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: SELLER KYB REVIEW QUEUE */}
        {activeModule === 'KYB' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Two-Gate Security:</strong> Dealers are locked from submitting quotes or
                  listing clearance stock until KYB is approved by Super Admin and the ₹19,999
                  onboarding fee is recorded.
                </span>
              </div>
              {activeRole === 'SUPPORT' && (
                <Badge variant="warning" size="sm">
                  Read-Only View
                </Badge>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-border">
                    <tr>
                      <th className="p-3.5">Dealership Name</th>
                      <th className="p-3.5">GSTIN / PAN</th>
                      <th className="p-3.5">Authorized Brands</th>
                      <th className="p-3.5">KYB Status</th>
                      <th className="p-3.5">Registration Fee</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sellers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500">
                          No pending dealerships in queue.
                        </td>
                      </tr>
                    ) : (
                      sellers.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-neutral-900">{s.tradeName}</div>
                            <div className="text-[11px] text-neutral-500">
                              {s.dealershipLegalName}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              Contact: {s.primaryContactName} ({s.primaryContactPhone})
                            </div>
                          </td>
                          <td className="p-3.5 font-mono">
                            <div className="text-neutral-900">{s.gstin}</div>
                            <div className="text-neutral-500 text-[11px]">PAN: {s.panNumber}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {s.brands.map((b, i) => (
                                <Badge key={i} variant="neutral" size="sm">
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                s.kycStatus === 'VERIFIED'
                                  ? 'success'
                                  : s.kycStatus === 'REJECTED'
                                    ? 'error'
                                    : 'warning'
                              }
                              size="sm"
                            >
                              {s.kycStatus}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <Badge
                              variant={s.registrationFeeStatus === 'PAID' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {s.registrationFeeStatus === 'PAID' ? 'PAID (₹19,999)' : 'PENDING'}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSellerDocs(s)}
                            >
                              Inspect Docs
                            </Button>
                            {hasPermission(activeRole, 'APPROVE_REJECT_KYB') ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={s.kycStatus === 'VERIFIED'}
                                  onClick={() => handleApproveKyb(s.id)}
                                  className="bg-emerald-700 hover:bg-emerald-800"
                                >
                                  {s.kycStatus === 'VERIFIED' ? 'Verified' : 'Approve KYB'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={s.kycStatus === 'REJECTED'}
                                  onClick={() => setRejectModalSellerId(s.id)}
                                  className="text-red-700 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">Read Only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: OFFERED VEHICLE MODERATION */}
        {activeModule === 'MODERATION' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Clearance & Demo Stock Moderation
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Review dealer-submitted listings, fraud score, and odometer authenticity
                  </p>
                </div>
                <Badge variant="primary" size="sm">
                  {offers.length} Listings
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-4 rounded-xl border border-border bg-surface space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge variant="neutral" size="sm">
                          {offer.conditionType}
                        </Badge>
                        <Badge variant={offer.dealScore > 80 ? 'success' : 'primary'} size="sm">
                          Deal Score {offer.dealScore}/100
                        </Badge>
                      </div>

                      <div className="font-bold text-sm text-neutral-900 mt-2">
                        {offer.brand} {offer.model}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {offer.variant} ({offer.manufactureYear})
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-1">
                        VIN: {offer.vin}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-neutral-400 text-[10px]">Odometer</div>
                          <div className="font-bold text-neutral-800">{offer.odometerKm} km</div>
                        </div>
                        <div>
                          <div className="text-neutral-400 text-[10px]">Discount</div>
                          <div className="font-bold text-emerald-700">
                            {offer.discountPercent}% OFF
                          </div>
                        </div>
                        <div>
                          <div className="text-neutral-400 text-[10px]">Regular Price</div>
                          <div className="line-through text-neutral-500">
                            ₹{(offer.regularPriceInr / 100000).toFixed(2)}L
                          </div>
                        </div>
                        <div>
                          <div className="text-neutral-400 text-[10px]">Offer Price</div>
                          <div className="font-black text-neutral-900">
                            ₹{(offer.discountedPriceInr / 100000).toFixed(2)}L
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-500 mt-2">
                        Dealer: <strong>{offer.sellerName}</strong> • {offer.branchLocation}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800"
                        onClick={() => showToast(`Offer for ${offer.model} approved!`)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-700 hover:bg-red-50"
                        onClick={() => showToast(`Offer for ${offer.model} rejected`)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 4: DISPUTE MANAGEMENT */}
        {activeModule === 'DISPUTES' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Active Delivery Disputes & Damaged Transit Claims
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Resolution playbooks: Release funds to dealership or process buyer refund
                  </p>
                </div>
                <Badge variant="warning" size="sm">
                  1 Active Case
                </Badge>
              </div>

              <div className="p-4 rounded-xl border border-warning-border bg-warning-light space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-dark" />
                    <span className="font-bold text-xs text-warning-dark">
                      Claim #DISP-9921 • Booking #GD-BK-2026-004
                    </span>
                  </div>
                  <Badge variant="warning" size="sm">
                    Under Investigation
                  </Badge>
                </div>

                <p className="text-xs text-neutral-700">
                  Buyer claims vehicle transit scratch during final doorstep handover in Satara
                  Taluka. Dealership claims inspection document signed before trailer dispatch.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-neutral-400 text-[10px]">Buyer Name:</span>
                    <div className="font-bold text-neutral-800">Suresh Patil</div>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px]">Dealership:</span>
                    <div className="font-bold text-neutral-800">Sahyadri Motors Pune</div>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px]">Deal Value:</span>
                    <div className="font-bold text-neutral-800">₹16,40,000</div>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px]">Held Commission:</span>
                    <div className="font-bold text-emerald-700">₹16,400 (1%)</div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={() =>
                      showToast(
                        'Dispute resolved: Released ₹16.4L to dealer after verified touchup reimbursement',
                      )
                    }
                  >
                    Release to Dealer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-700 hover:bg-red-50"
                    onClick={() => showToast('Dispute resolved: Refund initiated to buyer')}
                  >
                    Refund Buyer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 5: FINANCE & LEDGER EXPLORER */}
        {activeModule === 'FINANCE' && (
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Seller Onboarding Fees</div>
                <div className="text-2xl font-black text-neutral-900">₹2,35,988</div>
                <div className="text-[11px] text-neutral-500">
                  10 verified dealerships (₹19,999 + GST)
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">
                  Platform 1% Commissions
                </div>
                <div className="text-2xl font-black text-emerald-700">₹1,45,200</div>
                <div className="text-[11px] text-neutral-500">
                  Collected upon confirmed vehicle delivery
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-1">
                <div className="text-xs font-semibold text-neutral-500">Buyer Escrow Holding</div>
                <div className="text-2xl font-black text-primary">₹25,00,000</div>
                <div className="text-[11px] text-neutral-500">
                  Held pending physical delivery at zone hub
                </div>
              </div>
            </div>

            {/* Immutable Ledger Explorer */}
            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Append-Only Platform Ledger
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enforced by PostgreSQL rule/trigger: Updates and Deletions strictly prohibited
                  </p>
                </div>
                {hasPermission(activeRole, 'EXPORT_LEDGER_CSV') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLedgerCsv}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download RFC 4180 CSV</span>
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-border">
                    <tr>
                      <th className="p-3.5">Entry #</th>
                      <th className="p-3.5">Account Type</th>
                      <th className="p-3.5">Debit (INR)</th>
                      <th className="p-3.5">Credit (INR)</th>
                      <th className="p-3.5">Balance After</th>
                      <th className="p-3.5">Narration</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-neutral-900 font-sans">
                          #{entry.entryNumber}
                        </td>
                        <td className="p-3.5 font-sans">
                          <Badge variant="neutral" size="sm">
                            {entry.accountType}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-red-700">
                          {entry.debitInr > 0 ? `₹${entry.debitInr.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3.5 text-emerald-700 font-bold">
                          {entry.creditInr > 0
                            ? `₹${entry.creditInr.toLocaleString('en-IN')}`
                            : '-'}
                        </td>
                        <td className="p-3.5 font-bold text-neutral-900">
                          ₹{entry.balanceAfterInr.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-neutral-600 font-sans max-w-xs truncate">
                          {entry.narration}
                        </td>
                        <td className="p-3.5 text-neutral-400 text-[11px] font-sans">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 6: USER & SUPPORT DESK */}
        {activeModule === 'USERS' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search buyer or dealer by phone, name, email or district..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button variant="primary" size="sm" onClick={() => showToast('Search refreshed')}>
                Search Customer
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" size="sm">
                    Buyer Record
                  </Badge>
                  <span className="text-[11px] text-neutral-400">ID: BYR-7701</span>
                </div>
                <div className="font-bold text-sm text-neutral-900">Ramesh Kadam</div>
                <div className="text-xs text-neutral-600">
                  Phone: <strong>+91 98220 11223</strong> • Zone: <strong>Baramati, Pune</strong>
                </div>
                <div className="text-xs text-neutral-500 pt-2 border-t border-border">
                  Active Group: <strong>Scorpio-N Z8 Diesel MT (80% full)</strong>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setTicketNoteUserId('BYR-7701')}
                >
                  Add Support Staff Note
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" size="sm">
                    Dealer Record
                  </Badge>
                  <span className="text-[11px] text-neutral-400">ID: DLR-3302</span>
                </div>
                <div className="font-bold text-sm text-neutral-900">Garve Mahindra Baramati</div>
                <div className="text-xs text-neutral-600">
                  GSTIN: <strong>27AABCG1234F1Z5</strong> • Status: <strong>VERIFIED</strong>
                </div>
                <div className="text-xs text-neutral-500 pt-2 border-t border-border">
                  Active Quotes Submitted: <strong>4 Bids (Win Rate 48%)</strong>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setTicketNoteUserId('DLR-3302')}
                >
                  Add Dealership Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 7: ZONE THRESHOLD CONFIG */}
        {activeModule === 'ZONES' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Rural-First Zone Density Group Thresholds
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set minimum buyer thresholds required to lock group and trigger sealed reverse
                  auction bidding for dealers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(zoneThresholds).map(([density, val]) => (
                  <div
                    key={density}
                    className="p-4 rounded-xl border border-border bg-surface space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" size="sm">
                        {density}
                      </Badge>
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <div className="text-2xl font-black text-neutral-900">{val} Buyers</div>
                    <div className="text-[11px] text-neutral-500">
                      {density === 'METRO'
                        ? 'Dense city hubs (Pune, Mumbai)'
                        : density === 'RURAL'
                          ? 'Rural taluka clusters'
                          : 'Deep agricultural villages'}
                    </div>

                    {hasPermission(activeRole, 'MANAGE_ZONES') ? (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleSaveThreshold(density, Math.max(2, val - 1))}
                          className="w-8 h-8 rounded-lg border border-border bg-white text-sm font-bold hover:bg-neutral-100"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleSaveThreshold(density, Math.min(30, val + 1))}
                          className="w-8 h-8 rounded-lg border border-border bg-white text-sm font-bold hover:bg-neutral-100"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">Read Only</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 8: CATALOG MANAGER */}
        {activeModule === 'CATALOG' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    OEM Brands & Car Models Master Catalog
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Manage brands, body types, fuel options, and city-wise ex-showroom prices
                  </p>
                </div>
                <Badge variant="primary" size="sm">
                  6 Brands • 19 Models • 46 Variants
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    brand: 'Mahindra',
                    models: 'Scorpio-N, XUV700, Thar Roxx, Bolero Neo',
                    variants: 12,
                  },
                  {
                    brand: 'Tata Motors',
                    models: 'Nexon, Punch, Safari, Harrier, Curvv',
                    variants: 14,
                  },
                  {
                    brand: 'Maruti Suzuki',
                    models: 'Brezza, Grand Vitara, Fronx, Ertiga',
                    variants: 10,
                  },
                  { brand: 'Hyundai', models: 'Creta, Venue, Exter, Alcazar', variants: 6 },
                  { brand: 'Toyota', models: 'Innova Hycross, Urban Cruiser Hyryder', variants: 4 },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border bg-surface space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-neutral-900">{item.brand}</span>
                      <Badge variant="neutral" size="sm">
                        {item.variants} Variants
                      </Badge>
                    </div>
                    <div className="text-xs text-neutral-600">{item.models}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 9: AUDIT LOG VIEWER */}
        {activeModule === 'AUDIT_LOGS' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Immutable System Audit Log Stream
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Tamper-proof administrative actions, state machine transitions, and financial
                    events
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  Audit Trail Active
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-border">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Entity</th>
                      <th className="p-3.5">Payload Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500 font-sans">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="p-3.5 text-neutral-400 font-sans text-[11px]">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5 font-sans">
                            <Badge variant="neutral" size="sm">
                              {log.actorType}
                            </Badge>
                          </td>
                          <td className="p-3.5 font-bold text-neutral-900 font-sans">
                            {log.action}
                          </td>
                          <td className="p-3.5 font-sans text-neutral-600">
                            {log.entityType} ({log.entityId.slice(0, 8)}...)
                          </td>
                          <td className="p-3.5 text-neutral-500 text-[11px] truncate max-w-xs font-mono">
                            {JSON.stringify(log.payloadDiff || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: INSPECT KYB DOCUMENTS */}
      {selectedSellerDocs && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSellerDocs(null)}
          title={`KYB Verification: ${selectedSellerDocs.tradeName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 border border-border space-y-1">
              <div>
                Legal Entity: <strong>{selectedSellerDocs.dealershipLegalName}</strong>
              </div>
              <div>
                GSTIN: <strong>{selectedSellerDocs.gstin}</strong> • PAN:{' '}
                <strong>{selectedSellerDocs.panNumber}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900">Uploaded KYB Documents</h4>
              <div className="space-y-2">
                {[
                  {
                    name: '1. GST Registration Certificate',
                    url: 'https://docs.groupdrive.in/kyc/gst-cert.pdf',
                  },
                  {
                    name: '2. Dealership OEM Agreement',
                    url: 'https://docs.groupdrive.in/kyc/oem-auth.pdf',
                  },
                  {
                    name: '3. Dealership Bank Cancelled Cheque',
                    url: 'https://docs.groupdrive.in/kyc/cheque.pdf',
                  },
                ].map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span className="font-medium text-neutral-800">{doc.name}</span>
                    </div>
                    <Badge variant="success" size="sm">
                      Valid PDF
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedSellerDocs(null)}>
                Close
              </Button>
              {hasPermission(activeRole, 'APPROVE_REJECT_KYB') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleApproveKyb(selectedSellerDocs.id);
                    setSelectedSellerDocs(null);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  Verify & Approve Dealership
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: REJECT REASON */}
      {rejectModalSellerId && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalSellerId(null)}
          title="Reject Dealership KYB Submission"
        >
          <div className="space-y-4 text-xs">
            <p className="text-neutral-600">
              Please enter the mandatory reason for rejecting this dealership. This will be recorded
              in the audit log and emailed to the dealership contact.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. GSTIN address does not match uploaded dealership agreement..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setRejectModalSellerId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!rejectReason.trim()}
                onClick={handleRejectKyb}
                className="bg-red-700 hover:bg-red-800"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: TICKET NOTE */}
      {ticketNoteUserId && (
        <Modal
          isOpen={true}
          onClose={() => setTicketNoteUserId(null)}
          title="Add Internal Support Ticket Note"
        >
          <div className="space-y-4 text-xs">
            <p className="text-neutral-600">
              Add internal operational note for customer / dealership record{' '}
              <strong>{ticketNoteUserId}</strong>:
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Spoke to buyer regarding Scorpio-N color choice preference; willing to take Deep Forest..."
              value={ticketNoteText}
              onChange={(e) => setTicketNoteText(e.target.value)}
              className="w-full p-3 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setTicketNoteUserId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!ticketNoteText.trim()}
                onClick={() => {
                  showToast('Support staff note added to customer audit record');
                  setTicketNoteUserId(null);
                  setTicketNoteText('');
                }}
              >
                Save Ticket Note
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
