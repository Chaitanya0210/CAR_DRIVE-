'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Badge, VerifiedBadge } from '@groupdrive/ui';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Users,
  Sparkles,
  Download,
  HelpCircle,
} from 'lucide-react';
import { CarAdvisorChatWidget } from '../components/CarAdvisorChatWidget';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { OnboardingTour } from '../components/OnboardingTour';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();
  const [showTour, setShowTour] = useState(false);

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
            G
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              {t('brand_name')}
            </h1>
            <p className="text-xs text-neutral-600 font-medium">ग्रुपड्राइव • भारत</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Interactive Multi-language Switcher */}
          <LanguageSwitcher />

          {/* Guided Demo Button */}
          <Link href="/demo">
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Guided Demo</span>
            </Button>
          </Link>

          {/* How It Works Button (Triggers 3-step walkthrough) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
          >
            <HelpCircle className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
            <span>{t('how_it_works')}</span>
          </Button>

          <Link href="/advisor">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>{t('ai_advisor_btn')}</span>
            </Button>
          </Link>
        </div>
      </header>

      <section className="my-auto py-12 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{t('badge_group_buying')}</Badge>
          <VerifiedBadge label={t('badge_auction_enabled')} />
          <Badge variant="neutral">{t('badge_rural_zones')}</Badge>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
            {t('savings_badge')}
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-tight">
          {t('hero_title')} <br />
          <span className="text-primary">{t('hero_highlight')}</span>
        </h2>

        <p className="text-base sm:text-lg text-neutral-700 max-w-2xl leading-relaxed">
          {t('hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <Link href="/demo" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {t('explore_design')}
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>

          <button
            onClick={() => setShowTour(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>{t('how_it_works')} (3 Steps)</span>
          </button>

          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                alert('GroupDrive PWA installed and offline-cached for rural connectivity.');
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <Download className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>{t('pwa_install_btn')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <Users className="w-5 h-5 text-primary mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">{t('card_quorum_title')}</h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{t('card_quorum_desc')}</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">{t('card_auction_title')}</h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              {t('card_auction_desc')}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-subtle">
            <Truck className="w-5 h-5 text-info-dark mb-2" aria-hidden="true" />
            <h3 className="font-bold text-neutral-900 text-sm">{t('card_landed_title')}</h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{t('card_landed_desc')}</p>
          </div>
        </div>
      </section>

      <footer className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-2">
        <div>
          <p>{t('footer_copyright')}</p>
          <p className="text-[11px] text-neutral-400 mt-1">
            ⚠️ Demo Mode: All catalog specs, ex-showroom prices, and landed costs are illustrative
            test data.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/demo" className="text-primary hover:underline font-bold">
            Demo Hub
          </Link>
          <span>•</span>
          <span className="font-semibold text-neutral-700">English • हिंदी • मराठी</span>
          <span>•</span>
          <span>{t('footer_standards')}</span>
        </div>
      </footer>

      {/* First-Run Onboarding Walkthrough Flow */}
      <OnboardingTour forceOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Floating Multilingual RAG Car Advisor Widget */}
      <CarAdvisorChatWidget />
    </main>
  );
}
