import React from 'react';
import { Button, Badge } from '@groupdrive/ui';
import { ShieldAlert, Lock } from 'lucide-react';

export default function SellerHomePage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              GroupDrive Dealer Hub
            </h1>
            <p className="text-xs text-neutral-500">Authorized Dealership Portal • India</p>
          </div>
        </div>
        <Badge variant="warning">KYB Verification Required</Badge>
      </header>

      {/* Mandatory Onboarding & Gating Alert */}
      <section className="p-6 rounded-2xl border border-warning-border bg-warning-light space-y-3">
        <div className="flex items-center gap-2 text-warning-dark font-bold text-base">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0" aria-hidden="true" />
          <span>Dealer Reverse Auction Access is Gated</span>
        </div>
        <p className="text-sm text-warning-dark">
          In compliance with GroupDrive policy, sellers must complete two verification gates before bidding on buyer RFQs or listing clearance inventory:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white border border-warning-border">
            <div className="text-xs font-semibold text-neutral-500">Gate 1: Legal KYB Review</div>
            <div className="text-sm font-bold text-neutral-900 mt-1">GSTIN & Trade Authorization</div>
            <div className="text-xs text-neutral-500 mt-0.5">Admin manual verification queue</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-warning-border">
            <div className="text-xs font-semibold text-neutral-500">Gate 2: Onboarding Fee</div>
            <div className="text-sm font-bold text-neutral-900 mt-1">₹19,999 One-Time Fee</div>
            <div className="text-xs text-neutral-500 mt-0.5">+ 1% commission upon deal delivery</div>
          </div>
        </div>
      </section>

      {/* Dealer Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Sealed Reverse Auctions</h2>
            <Lock className="w-4 h-4 text-neutral-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-neutral-600">
            Submit sealed bids directly for pre-aggregated buyer cohorts in your delivery talukas.
          </p>
          <Button variant="outline" disabled className="w-full">
            Locked (Pending KYB Approval)
          </Button>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Offered Vehicles Manager</h2>
            <Lock className="w-4 h-4 text-neutral-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-neutral-600">
            List factory clearance, dealer demo cars, and previous model-year inventory with guaranteed delivery.
          </p>
          <Button variant="outline" disabled className="w-full">
            Locked (Pending KYB Approval)
          </Button>
        </div>
      </div>
    </main>
  );
}
