'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Badge } from '@groupdrive/ui';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { CarAdvisorChatWidget } from '../../components/CarAdvisorChatWidget';

export default function AdvisorPage() {
  return (
    <main className="min-h-screen bg-surface-subtle flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between py-4 border-b border-border bg-white rounded-2xl px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-black text-neutral-900 tracking-tight">
                GroupDrive AI Car Advisor
              </h1>
              <p className="text-[11px] text-neutral-500">
                Rural Reverse Auction & Vehicle Guidance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" className="text-xs">
            Hinglish • मराठी • हिंदी
          </Badge>
        </div>
      </header>

      <section className="py-8 my-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multilingual Automotive RAG Knowledge Base</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
          Explore vehicle comparisons, landed costs, & reverse auctions
        </h2>
        <p className="text-sm text-neutral-600 max-w-xl mx-auto">
          Click the chat button on the bottom right or try any of our pre-built rural queries in
          Hinglish, Marathi, Hindi, or English.
        </p>
      </section>

      {/* Floating Chat Widget */}
      <CarAdvisorChatWidget />
    </main>
  );
}
