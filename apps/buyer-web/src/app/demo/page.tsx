'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@groupdrive/ui';
import {
  Sparkles,
  Users,
  ArrowRight,
  FastForward,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  MapPin,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface DemoGroup {
  id: string;
  status: string;
  targetCount: number;
  currentCount: number;
  deadline: string;
  vehicle: {
    brandName: string;
    modelName: string;
    variantName: string;
    fuelType: string;
    transmission: string;
    basePricePaise: string;
  };
  zone: {
    id: string;
    name: string;
    code: string;
    densityClass: string;
  };
  members: Array<{
    id: string;
    buyerName: string;
    phone: string;
    status: string;
  }>;
  rfq: {
    id: string;
    rfqNumber: string;
    status: string;
    quotesCount: number;
    winningQuoteId: string | null;
    quotes: Array<{
      id: string;
      dealerName: string;
      totalLandedCostPaise: string;
      batchGroupDiscountPaise: string;
      deliveryTimelineDays: number;
      isWinning: boolean;
    }>;
  } | null;
}

export default function DemoPage() {
  const [groups, setGroups] = useState<DemoGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:4000/admin/demo/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        if (data.length > 0 && !selectedGroupId) {
          // Default to first forming group
          const forming = data.find((g: DemoGroup) => g.status === 'FORMING') || data[0];
          setSelectedGroupId(forming.id);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleFastForward = async (
    action: 'threshold' | 'close-bidding' | 'resolve-vote' | 'complete-delivery' | 'reset-group',
  ) => {
    if (!selectedGroupId) return;
    setLoading(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const endpoint = `http://localhost:4000/admin/demo/fast-forward/${action}/${selectedGroupId}`;
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setActionMessage(data.message || 'Fast-forward action succeeded!');
        await fetchGroups();
      } else {
        setActionError(data.message || 'Action failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach API server on port 4000';
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click persona logins
  const handleBuyerLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gd_demo_role', 'BUYER');
      localStorage.setItem('gd_demo_phone', '+919700000001');
      localStorage.setItem('gd_demo_name', 'Sanjay Jagtap (Baramati, MH)');
      window.location.href = '/';
    }
  };

  const handleSellerLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gd_demo_role', 'SELLER');
      localStorage.setItem('gd_demo_seller_name', 'Sahyadri Automotive Group');
      window.location.href = 'http://localhost:3001/';
    }
  };

  const handleAdminLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gd_demo_role', 'ADMIN');
      window.location.href = 'http://localhost:3002/';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMING':
        return <Badge variant="warning">1. Forming (Open)</Badge>;
      case 'QUORUM_REACHED':
        return <Badge variant="info">2. Quorum Reached</Badge>;
      case 'RFQ_ACTIVE':
        return <Badge variant="primary">3. RFQ Bidding Open</Badge>;
      case 'VOTING_OPEN':
        return <Badge variant="primary">4. Buyer Voting Open</Badge>;
      case 'DEAL_LOCKED':
        return <Badge variant="success">5. Deal Locked (Booked)</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">6. Delivered & Settled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                G
              </div>
              <div>
                <h1 className="text-lg font-black text-neutral-900 tracking-tight">
                  GroupDrive Demo Hub
                </h1>
                <p className="text-xs text-neutral-500 font-medium">
                  Interactive Demo Mode & Lifecycle Simulator
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100"
            >
              Buyer Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner */}
        <section className="bg-gradient-to-r from-red-700 to-red-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Guided 10-Minute Evaluator Experience</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Explore Collective Rural Car Buying End-to-End
          </h2>
          <p className="text-sm sm:text-base text-red-100 max-w-2xl leading-relaxed">
            Switch between buyer, dealer, and super admin personas with one click, or use the
            Fast-Forward Timeline engine below to simulate the complete 3-week group buying cycle in
            under 5 minutes.
          </p>
        </section>

        {/* SECTION 1: ONE-CLICK QUICK PERSONAS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <span>1. One-Click Persona Logins</span>
            </h3>
            <span className="text-xs text-neutral-500 font-medium">Instant session switch</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Persona: Buyer */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-red-600 transition-colors group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="primary" size="sm">
                    Buyer Portal
                  </Badge>
                  <span className="text-xs font-mono text-neutral-500">:3000</span>
                </div>
                <h4 className="text-base font-bold text-neutral-900">Sanjay Jagtap</h4>
                <p className="text-xs text-neutral-600">
                  Agribusiness Owner, Baramati (Pune, MH). Active in rural Scorpio-N and Nexon
                  collective cohorts.
                </p>
                <div className="pt-2 text-[11px] text-neutral-500 space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <div>
                    <strong>Phone:</strong> +91 97000 00001
                  </div>
                  <div>
                    <strong>Zone:</strong> Baramati Taluka, Satara-Pune Belt
                  </div>
                </div>
              </div>
              <Button
                onClick={handleBuyerLogin}
                className="w-full justify-between font-bold text-xs"
              >
                <span>Enter as Buyer</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Persona: Seller */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-neutral-900 transition-colors group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm">
                    Seller Portal
                  </Badge>
                  <span className="text-xs font-mono text-neutral-500">:3001</span>
                </div>
                <h4 className="text-base font-bold text-neutral-900">Sahyadri Automotive</h4>
                <p className="text-xs text-neutral-600">
                  Authorized Mahindra & Tata dealership in Baramati. Verified KYB with paid lifetime
                  fee.
                </p>
                <div className="pt-2 text-[11px] text-neutral-500 space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <div>
                    <strong>GSTIN:</strong> 27AAMCS1234F1Z1
                  </div>
                  <div>
                    <strong>Status:</strong> Verified Dealer (Gate Cleared)
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSellerLogin}
                variant="outline"
                className="w-full justify-between font-bold text-xs bg-neutral-900 text-white hover:bg-neutral-800"
              >
                <span>Enter as Seller Hub</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Persona: Admin */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-600 transition-colors group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="warning" size="sm">
                    Admin Command
                  </Badge>
                  <span className="text-xs font-mono text-neutral-500">:3002</span>
                </div>
                <h4 className="text-base font-bold text-neutral-900">Platform Operations Lead</h4>
                <p className="text-xs text-neutral-600">
                  Super Admin with full RBAC access to Live Ops, KYB review, Moderation, and
                  Financial Ledger.
                </p>
                <div className="pt-2 text-[11px] text-neutral-500 space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <div>
                    <strong>Roles:</strong> Super Admin, Finance, KYB, Support
                  </div>
                  <div>
                    <strong>Audits:</strong> Double-Entry Ledger, GMV Ops
                  </div>
                </div>
              </div>
              <Button
                onClick={handleAdminLogin}
                variant="outline"
                className="w-full justify-between font-bold text-xs border-neutral-300"
              >
                <span>Enter as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 2: FAST-FORWARD TIMELINE CONTROLLER */}
        <section className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <FastForward className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                  Fast-Forward Lifecycle Simulator
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Advance real database timers, unseal dealer bids, and trigger doorstep delivery
                milestones on demand.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchGroups}
              disabled={loading}
              className="self-start sm:self-auto text-xs"
            >
              Refresh Groups ({groups.length})
            </Button>
          </div>

          {/* Toast / Message Banner */}
          {actionMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {actionError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Group Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Select Group to Advance:
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setActionMessage(null);
                setActionError(null);
              }}
              className="w-full p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  [{g.status}] {g.vehicle.brandName} {g.vehicle.modelName} ({g.vehicle.variantName})
                  — {g.zone.name} ({g.currentCount}/{g.targetCount} members)
                </option>
              ))}
            </select>
          </div>

          {/* Selected Group Card */}
          {selectedGroup && (
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-neutral-900">
                      {selectedGroup.vehicle.brandName} {selectedGroup.vehicle.modelName}
                    </span>
                    {getStatusBadge(selectedGroup.status)}
                  </div>
                  <div className="text-xs text-neutral-600 font-medium">
                    {selectedGroup.vehicle.variantName} • {selectedGroup.vehicle.fuelType} •{' '}
                    {selectedGroup.vehicle.transmission}
                  </div>
                </div>

                <div className="text-right self-start sm:self-auto text-xs text-neutral-500">
                  <div className="flex items-center gap-1 font-semibold text-neutral-700">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>
                      {selectedGroup.zone.name} ({selectedGroup.zone.densityClass})
                    </span>
                  </div>
                  <div>
                    Quorum Target: {selectedGroup.currentCount}/{selectedGroup.targetCount} members
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Step 1 */}
                <Button
                  onClick={() => handleFastForward('threshold')}
                  disabled={loading || selectedGroup.status !== 'FORMING'}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold text-neutral-800 justify-center"
                >
                  ⚡ 1. Fill Quorum
                </Button>

                {/* Step 2 */}
                <Button
                  onClick={() => handleFastForward('close-bidding')}
                  disabled={
                    loading || !['QUORUM_REACHED', 'RFQ_ACTIVE'].includes(selectedGroup.status)
                  }
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold text-neutral-800 justify-center"
                >
                  ⚡ 2. Close Bids
                </Button>

                {/* Step 3 */}
                <Button
                  onClick={() => handleFastForward('resolve-vote')}
                  disabled={loading || selectedGroup.status !== 'VOTING_OPEN'}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold text-neutral-800 justify-center"
                >
                  ⚡ 3. Resolve Vote
                </Button>

                {/* Step 4 */}
                <Button
                  onClick={() => handleFastForward('complete-delivery')}
                  disabled={loading || selectedGroup.status !== 'DEAL_LOCKED'}
                  variant="primary"
                  size="sm"
                  className="w-full text-xs font-bold justify-center"
                >
                  ⚡ 4. Settle Deal
                </Button>

                {/* Reset */}
                <Button
                  onClick={() => handleFastForward('reset-group')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold text-neutral-500 hover:text-red-600 justify-center"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: 10-MINUTE DEMO SCRIPT LINK */}
        <section className="p-6 rounded-2xl bg-white border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <FileText className="w-4 h-4 text-red-600" />
              <span>Looking for the 10-Minute Presentation Script?</span>
            </div>
            <p className="text-xs text-neutral-600">
              Follow the click-by-click presenter script located at{' '}
              <code className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
                docs/demo-script.md
              </code>{' '}
              with exact timing, talking points, and fallbacks.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <span>Back to Marketplace</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      </div>

      {/* Global Demo Disclaimer Footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-2">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
            ⚠️ DEMO ENVIRONMENT NOTICE
          </p>
          <p className="text-xs text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            All vehicle catalog specifications, OEM ex-showroom prices, landed cost calculations,
            regional RTO road tax slabs, and reverse-auction quotes are illustrative demo data
            created solely for evaluation and testing of the GroupDrive rural collective buying
            platform.
          </p>
          <p className="text-[11px] text-neutral-400">
            GroupDrive • Built for Bharat's rural and semi-urban car buyers.
          </p>
        </div>
      </footer>
    </main>
  );
}
