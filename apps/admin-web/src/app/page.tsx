import React from 'react';
import { Badge, Button } from '@groupdrive/ui';
import { FileCheck, History, Sliders } from 'lucide-react';

export default function AdminHomePage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
            A
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              GroupDrive Internal Console
            </h1>
            <p className="text-xs text-neutral-500">Governance & Tax Rule Verification</p>
          </div>
        </div>
        <Badge variant="primary">Internal Operations</Badge>
      </header>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">Dealer KYB Verification Queue</h2>
          <p className="text-xs text-neutral-500">
            Review dealer GSTIN, trade certificates, and dealership authorizations.
          </p>
          <div className="text-xs font-semibold text-neutral-700">
            Pending Queue: <span className="text-primary font-bold">2 Dealers</span>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            Inspect Submissions
          </Button>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Sliders className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">RTO & Tax Rules Manager</h2>
          <p className="text-xs text-neutral-500">
            Verify state road tax brackets, TCS, and GST cess flagged for review.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-800">
            <Badge variant="warning" size="sm">
              needs_verification
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            Review Tax Tables
          </Button>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <History className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">Immutable Audit Logs</h2>
          <p className="text-xs text-neutral-500">
            Searchable event stream of every write action, state transition, and admin approval.
          </p>
          <div className="text-xs text-neutral-500">
            Logged Events: <span className="font-semibold text-neutral-900">Active</span>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View Audit Stream
          </Button>
        </div>
      </div>
    </main>
  );
}
