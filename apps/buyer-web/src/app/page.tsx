import Link from 'next/link';
import { Button, Badge, VerifiedBadge } from '@groupdrive/ui';
import { ArrowRight, ShieldCheck, Truck, Users, Sparkles } from 'lucide-react';
import { CarAdvisorChatWidget } from '../components/CarAdvisorChatWidget';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-5xl mx-auto">
      <header className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
            G
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">GroupDrive</h1>
            <p className="text-xs text-neutral-500">ग्रुपड्राइव • भारत</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/advisor">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>AI Car Advisor</span>
            </Button>
          </Link>
          <Link href="/design">
            <Button variant="outline" size="sm">
              Design System
            </Button>
          </Link>
        </div>
      </header>

      <section className="my-auto py-12 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">India Group Buying</Badge>
          <VerifiedBadge label="Reverse Auction Enabled" />
          <Badge variant="neutral">Rural-First Zones</Badge>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-tight">
          Form a buyer group in your taluka. <br />
          <span className="text-primary">Get bulk dealer pricing delivered to your door.</span>
        </h2>

        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl">
          GroupDrive aggregates demand across Indian districts and talukas. Once your group hits
          quorum, verified dealers nationwide compete in a sealed reverse auction. Compare quotes
          strictly on landed delivery cost.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <Link href="/design" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
              Explore Component Design System
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <Users className="w-5 h-5 text-primary mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">Taluka Demand Quorum</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Join buyers in Baramati, Karad, or Haveli to unlock volume buying power.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">Sealed Reverse Auction</h3>
            <p className="text-xs text-neutral-500 mt-1">
              KYB-verified authorized dealers submit sealed competitive bids for the entire batch.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <Truck className="w-5 h-5 text-info mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">True Landed Cost</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Zero showroom tricks. Strictly compare by normalized landed price at your doorstep.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
        <p>© 2026 GroupDrive Technologies Pvt Ltd. Rural-First Automotive Marketplace.</p>
        <div className="flex gap-4">
          <span>मराठी / Hindi / English</span>
          <span>WCAG 2.2 AA</span>
        </div>
      </footer>

      {/* Floating Multilingual RAG Car Advisor Widget */}
      <CarAdvisorChatWidget />
    </main>
  );
}
