'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Badge } from '@groupdrive/ui';
import {
  Sparkles,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface Citation {
  chunk_id: string;
  doc_id: string;
  source_title: string;
  section_title: string;
  brand?: string;
  model?: string;
  source: string;
  snippet: string;
  confidence: number;
}

interface Message {
  id: string;
  sender: 'user' | 'advisor';
  text: string;
  citations?: Citation[];
  confidence?: number;
  entities?: {
    intent?: string;
    budget_max_inr?: number;
    fuel_type?: string;
    body_type?: string;
    city_or_zone?: string;
    features_requested?: string[];
  };
  handoff?: {
    needs_handoff: boolean;
    reason?: string;
    department?: string;
    handoff_message?: string;
  };
  timestamp: string;
}

const PRESET_QUERIES = [
  'Bhai 12 lakh ke budget me diesel SUV Baramati delivery ke liye kaunsi best rahegi?',
  'GroupDrive me reverse auction kaise kaam karta hai aur paise safe hain kya?',
  'What is the certified fuel efficiency of Maruti Suzuki Brezza S-CNG?',
  'Mujhe turant kisi support agent se baat karni hai, connect karo please.',
];

export function CarAdvisorChatWidget({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'advisor',
      text:
        '**Namaste! I am your GroupDrive Multilingual Car Advisor.**\n\n' +
        'Aap Hindi, Marathi, Hinglish, ya English me pooch sakte hain. Mai aapko best car models, landed costs, aur GroupDrive reverse auction savings ke baare me verified data ke sath advise karunga.',
      citations: [
        {
          chunk_id: 'doc-platform-policies#sec-01',
          doc_id: 'doc-platform-policies',
          source_title: 'GroupDrive Reverse Auction Platform Policies & Buyer Safeguards',
          section_title: 'Zone Density & Group Formation Thresholds',
          source: 'policy',
          snippet:
            'GroupDrive aggregates buyers locally to give collective bargaining power against dealerships...',
          confidence: 0.98,
        },
      ],
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Call AI Service (port 8000) or proxy (port 4000)
      const res = await fetch('http://127.0.0.1:8000/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          user_id: 'buyer-demo',
          preferred_language: 'hinglish',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const advisorMsg: Message = {
          id: `advisor-${Date.now()}`,
          sender: 'advisor',
          text: data.answer,
          citations: data.citations,
          confidence: data.confidence,
          entities: data.entities,
          handoff: data.handoff,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, advisorMsg]);
      } else {
        throw new Error('API response not ok');
      }
    } catch {
      // Fallback grounded response if server offline
      const is12LDiesel =
        q.toLowerCase().includes('12') ||
        q.toLowerCase().includes('nexon') ||
        q.toLowerCase().includes('diesel');
      const isAgent =
        q.toLowerCase().includes('agent') ||
        q.toLowerCase().includes('human') ||
        q.toLowerCase().includes('baat');

      let fallbackText = '';
      let fallbackCitations: Citation[] = [];
      let fallbackHandoff = { needs_handoff: false, department: 'SUPPORT' };

      if (isAgent) {
        fallbackText =
          '**GroupDrive Support Executive Assistance:**\n\n' +
          'Namaste! Mai aapko hamare GroupDrive rural car support executive se connect kar raha hoon. ' +
          'Hamare specialist aapse WhatsApp/Phone pe sampark karenge.';
        fallbackHandoff = { needs_handoff: true, department: 'SUPPORT' };
      } else if (is12LDiesel) {
        fallbackText =
          '**12 Lakh Diesel SUV Recommendation - Tata Nexon:**\n\n' +
          '12 lakh ke budget me **Tata Nexon Pure Diesel MT** ya **Creative Diesel MT** best option hai. ' +
          'Isme **1.5L Revotorq diesel engine** (115 PS, 260 Nm) milta hai jo **23.23 km/l mileage** deta hai aur **208 mm ground clearance** kharab gramin sadko ke liye perfect hai. ' +
          'Sath me 5-Star Bharat NCAP safety aur 6 standard airbags aate hain.\n\n' +
          'GroupDrive reverse auction me Hatkanangale/Kolhapur cluster me 3 buyers ne ₹92,000 per car discount reverse auction me hasil kiya tha.\n\n' +
          '[Source: Tata Nexon Facelift Specification Sheet & Feature Guide, Section: Powertrain Specifications]';
        fallbackCitations = [
          {
            chunk_id: 'doc-tata-nexon#sec-02',
            doc_id: 'doc-tata-nexon',
            source_title: 'Tata Nexon Facelift Specification Sheet & Feature Guide',
            section_title: 'Powertrain Specifications',
            brand: 'Tata Motors',
            model: 'Nexon',
            source: 'brochure',
            snippet:
              '1.5L Revotorq Diesel: 115 PS power, 260 Nm torque. ARAI certified mileage: 23.23 km/l (MT). Highly recommended for rural commuting...',
            confidence: 0.95,
          },
          {
            chunk_id: 'doc-anonymized-deals#sec-03',
            doc_id: 'doc-anonymized-deals',
            source_title: 'Past Verified Group Deals & Benchmark Savings',
            section_title: 'Deal #GD-KOL-2026-09: Kolhapur Tata Nexon Cluster',
            brand: 'Tata Motors',
            model: 'Nexon',
            source: 'deal_summary',
            snippet:
              'In Kolhapur (Hatkanangale), a rural cluster of 3 buyers saved ₹92,000 per car on the Tata Nexon Creative Plus 1.5 Diesel MT...',
            confidence: 0.88,
          },
        ];
      } else {
        fallbackText =
          '**GroupDrive Reverse Auction Guidance:**\n\n' +
          'GroupDrive me jab aapke taluka me minimum buyers (Rural: 3, Semi-Urban: 4) group join karte hain, ' +
          'tab 48 hours ke liye sealed reverse auction khulta hai jisme verified dealers discounted quote dete hain. ' +
          'Aapka ₹25,000 booking token escrow me safe rehta hai aur dealer default pe 100% full refund guarantee milti hai.\n\n' +
          '[Source: GroupDrive Reverse Auction Platform Policies & Buyer Safeguards, Section: Reverse Auction & Sealed Bidding Rules]';
        fallbackCitations = [
          {
            chunk_id: 'doc-platform-policies#sec-02',
            doc_id: 'doc-platform-policies',
            source_title: 'GroupDrive Reverse Auction Platform Policies & Buyer Safeguards',
            section_title: 'Reverse Auction & Sealed Bidding Rules',
            source: 'policy',
            snippet:
              'When a group meets its quorum threshold, a sealed reverse auction opens for verified dealers. Bidding window is 48 hours...',
            confidence: 0.94,
          },
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `advisor-${Date.now()}`,
          sender: 'advisor',
          text: fallbackText,
          citations: fallbackCitations,
          confidence: 0.92,
          handoff: fallbackHandoff,
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            data-testid="open-advisor-chat"
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-primary text-white shadow-xl hover:bg-primary-dark transition-all transform hover:scale-105 font-bold text-sm border-2 border-white/20"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span>AI Car Advisor</span>
            <span className="text-[10px] bg-white text-red-700 px-2 py-0.5 rounded-full font-mono uppercase font-bold shadow-xs">
              Hinglish • मराठी
            </span>
          </button>
        </div>
      )}

      {/* Slide-out / Modal Chat Widget */}
      {isOpen && (
        <div
          data-testid="advisor-chat-modal"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[480px] h-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight text-white">
                    GroupDrive Car Advisor
                  </h3>
                  <Badge variant="success" className="text-[9px] py-0 px-1.5">
                    Verified RAG
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-300 font-medium">
                  Rural-First Guidance • Hinglish, मराठी & हिंदी
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Query Pills */}
          <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-neutral-700 font-bold uppercase text-[10px] shrink-0 pl-1">
              Try:
            </span>
            {PRESET_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                data-testid={`preset-query-${idx}`}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:border-primary hover:text-primary transition-all shrink-0 font-medium"
              >
                {q.length > 36 ? q.substring(0, 36) + '...' : q}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface-subtle">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Tag */}
                <div className="text-[10px] text-neutral-600 font-medium mb-1 px-1 flex items-center gap-1.5">
                  <span>{msg.sender === 'user' ? 'You' : 'GroupDrive Advisor'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-br-xs'
                      : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs'
                  }`}
                >
                  {/* Markdown formatted text */}
                  <div className="space-y-2 whitespace-pre-wrap font-sans">
                    {msg.text.split('\n\n').map((para, pIdx) => {
                      if (para.startsWith('**') && para.endsWith('**')) {
                        return (
                          <p key={pIdx} className="font-bold text-sm text-neutral-900">
                            {para.replace(/\*\*/g, '')}
                          </p>
                        );
                      }
                      return (
                        <p
                          key={pIdx}
                          className={msg.sender === 'user' ? 'text-white' : 'text-neutral-800'}
                        >
                          {para}
                        </p>
                      );
                    })}
                  </div>

                  {/* Extracted Entity Chips (Advisor only) */}
                  {msg.sender === 'advisor' && msg.entities && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
                      {msg.entities.budget_max_inr && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                          Budget: ₹{(msg.entities.budget_max_inr / 100000).toFixed(1)}L
                        </span>
                      )}
                      {msg.entities.fuel_type && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                          Fuel: {msg.entities.fuel_type}
                        </span>
                      )}
                      {msg.entities.body_type && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                          Body: {msg.entities.body_type}
                        </span>
                      )}
                      {msg.entities.city_or_zone && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                          Zone: {msg.entities.city_or_zone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Human Handoff Banner */}
                  {msg.sender === 'advisor' && msg.handoff?.needs_handoff && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1 text-[11px]">
                        <p className="font-bold">Human Specialist Connected</p>
                        <p className="text-[10px] text-amber-800 mt-0.5">
                          {msg.handoff.handoff_message ||
                            'A local dealership & territory officer will assist you directly.'}
                        </p>
                        <button
                          onClick={() =>
                            alert(
                              'Support ticket raised: #GD-SUPPORT-8821. Agent will call your phone.',
                            )
                          }
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-700 text-white font-bold text-[10px] hover:bg-amber-800 transition-colors"
                        >
                          Request Immediate Callback
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Grounded Source Citations Accordion */}
                  {msg.sender === 'advisor' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Sources ({msg.citations.length})
                        </span>
                        {msg.confidence !== undefined && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {Math.round(msg.confidence * 100)}% Match
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5" data-testid="citations-container">
                        {msg.citations.map((c, cIdx) => {
                          const isExpanded = expandedCitationId === `${msg.id}-${cIdx}`;
                          return (
                            <div
                              key={cIdx}
                              className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-[11px]"
                            >
                              <div
                                onClick={() =>
                                  setExpandedCitationId(isExpanded ? null : `${msg.id}-${cIdx}`)
                                }
                                className="flex items-center justify-between cursor-pointer font-semibold text-neutral-800 hover:text-primary transition-colors"
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <FileText className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span className="truncate">{c.source_title}</span>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                )}
                              </div>

                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                Section:{' '}
                                <span className="font-medium text-neutral-700">
                                  {c.section_title}
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-neutral-200/60 text-[10px] text-neutral-600 font-mono bg-white p-2 rounded">
                                  {c.snippet}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-xs px-4 py-2.5 text-xs text-neutral-500 shadow-xs flex items-center gap-2">
                  <span className="animate-pulse">
                    Searching brochures, RTO tax slabs & group deals...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-neutral-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                data-testid="advisor-query-input"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask in Hinglish, Marathi, Hindi, or English..."
                className="flex-1 px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <Button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                data-testid="advisor-send-button"
                aria-label="Send message to AI Car Advisor"
                size="sm"
                className="px-3"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </form>
            <p className="text-[10px] text-neutral-600 font-medium text-center mt-1.5">
              *All savings indicative based on reverse-auction quotes. Zero platform fees for
              buyers.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
