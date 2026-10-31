'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@groupdrive/ui';
import { useLanguage } from '../context/LanguageContext';

export interface OnboardingTourProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

interface StepContent {
  icon: React.ElementType;
  badge: { en: string; hi: string; mr: string };
  title: { en: string; hi: string; mr: string };
  subtitle: { en: string; hi: string; mr: string };
  description: { en: string; hi: string; mr: string };
  bullets: Array<{ en: string; hi: string; mr: string }>;
}

const STEPS: StepContent[] = [
  {
    icon: Users,
    badge: {
      en: 'Step 1 of 3 • Collective Buying Power',
      hi: 'चरण 1 का 3 • सामूहिक खरीदारी शक्ति',
      mr: 'पायरी १ पैकी ३ • सामूहिक खरेदी ताकद',
    },
    title: {
      en: 'Form or Join a Taluka Group',
      hi: 'अपने तालुका में ग्रुप बनाएं या जुड़ें',
      mr: 'तुमच्या तालुक्यात गट बनवा किंवा सामील व्हा',
    },
    subtitle: {
      en: 'Band together with buyers in Baramati, Karad, or Haveli for volume dealer discounts.',
      hi: 'बारामती, कराड या हवेली के खरीदारों के साथ मिलकर थोक डीलर डिस्काउंट पाएं।',
      mr: 'बारामती, कराड किंवा हवेलीतील खरेदीदारांसोबत एकत्र येऊन घाऊक डीलर सवलत मिळवा.',
    },
    description: {
      en: 'Select your preferred vehicle and variant. When your group reaches its member quorum or deadline, GroupDrive officially opens a reverse auction to authorized dealerships.',
      hi: 'अपनी पसंदीदा गाड़ी और वेरिएंट चुनें। जब आपका ग्रुप आवश्यक सदस्य संख्या पूरी करता है, तो अधिकृत डीलरों के लिए रिवर्स ऑक्शन शुरू होता है।',
      mr: 'तुमची आवडती गाडी आणि व्हेरियंट निवडा. तुमच्या गटाने कोरम पूर्ण करताच, अधिकृत डीलर्ससाठी रिव्हर्स लिलाव सुरू होतो.',
    },
    bullets: [
      {
        en: 'Zero upfront commitment to join a group',
        hi: 'ग्रुप में शामिल होने के लिए कोई अग्रिम शुल्क नहीं',
        mr: 'गटात सामील होण्यासाठी कोणतेही आगाऊ शुल्क नाही',
      },
      {
        en: 'Localized taluka demand aggregation',
        hi: 'स्थानीय तालुका स्तर पर सामूहिक मांग एकत्रीकरण',
        mr: 'स्थानिक तालुका स्तरावर एकत्रित मागणी',
      },
      {
        en: 'Instant group notifications via WhatsApp & SMS',
        hi: 'व्हाट्सएप और एसएमएस के माध्यम से त्वरित अपडेट',
        mr: 'व्हॉट्सअ‍ॅप आणि एसएमएसद्वारे त्वरित अपडेट्स',
      },
    ],
  },
  {
    icon: ShieldCheck,
    badge: {
      en: 'Step 2 of 3 • Sealed Reverse Auction',
      hi: 'चरण 2 का 3 • सीलबंद रिवर्स ऑक्शन',
      mr: 'पायरी २ पैकी ३ • सीलबंद रिव्हर्स लिलाव',
    },
    title: {
      en: 'Authorized Dealers Compete Blindly',
      hi: 'अधिकृत डीलर सीलबंद प्रतिस्पर्धा करते हैं',
      mr: 'अधिकृत डीलर्स सीलबंद स्पर्धा करतात',
    },
    subtitle: {
      en: 'KYB-verified OEM dealerships submit secret, sealed quotes for the entire batch.',
      hi: 'केवायबी-सत्यापित अधिकृत डीलर पूरे बैच के लिए अपनी सबसे कम सीलबंद कीमत लगाते हैं।',
      mr: 'केवायबी-सत्यापित अधिकृत डीलर्स संपूर्ण बॅचसाठी त्यांची सर्वात कमी सीलबंद किंमत देतात.',
    },
    description: {
      en: 'No dealer can see competing quotes, preventing cartels and price fixing. Quotes include ex-showroom discounts, state RTO, insurance, and doorstep logistics to your taluka.',
      hi: 'कोई भी डीलर दूसरों की बोलियां नहीं देख सकता, जिससे कार्टेल खत्म होते हैं। कोट्स में आरटीओ, बीमा और घरपोच डिलीवरी शामिल होती है।',
      mr: 'कोणताही डीलर इतरांच्या बोली पाहू शकत नाही. कोटेशनमध्ये आरटीओ, विमा आणि घरपोच वाहतूक खर्चाचा समावेश असतो.',
    },
    bullets: [
      {
        en: 'True landed cost normalized at your doorstep',
        hi: 'आपके दरवाजे तक की सच्ची ऑल-इनक्लूसिव ऑन-रोड कीमत',
        mr: 'दारापर्यंतचा खरा सर्वसमावेशक ऑन-रोड खर्च',
      },
      {
        en: 'Zero hidden handling or documentation fees',
        hi: 'शोरूम का कोई छिपा हुआ हैंडलिंग या फाइल चार्ज नहीं',
        mr: 'शोरूमचे कोणतेही छुपे हँडलिंग किंवा फाईल चार्जेस नाहीत',
      },
      {
        en: 'OEM warranty and service coverage fully intact',
        hi: 'कंपनी की पूरी वारंटी और सर्विस नेटवर्क उपलब्ध',
        mr: 'कंपनीची संपूर्ण वॉरंटी आणि सर्व्हिस नेटवर्क कायम',
      },
    ],
  },
  {
    icon: Trophy,
    badge: {
      en: 'Step 3 of 3 • Democratic Vote & Safe Delivery',
      hi: 'चरण 3 का 3 • लोकतांत्रिक वोट और सुरक्षित डिलीवरी',
      mr: 'पायरी ३ पैकी ३ • लोकशाही मतदान आणि सुरक्षित डिलिव्हरी',
    },
    title: {
      en: 'Vote, Book & Safely Receive Your Car',
      hi: 'वोट करें, बुक करें और सुरक्षित कार प्राप्त करें',
      mr: 'मतदान करा, बुक करा आणि सुरक्षित गाडी मिळवा',
    },
    subtitle: {
      en: 'Members vote on the best quote. Booking amount is held safely in escrow until PDI handover.',
      hi: 'सदस्य सर्वश्रेष्ठ कोट पर वोट करते हैं। बुकिंग राशि डिलीवरी और पीडीआई तक एस्क्रो में सुरक्षित रहती है।',
      mr: 'सदस्य सर्वोत्तम कोटेशनवर मतदान करतात. बुकिंग रक्कम पीडीआय तपासणीपर्यंत एस्क्रोमध्ये सुरक्षित राहते.',
    },
    description: {
      en: 'Inspect your quote comparison matrix with transparent explanations. Book individually with ₹25,000 held pending delivery. Funds are released only after your personal inspection and OTP confirmation.',
      hi: 'पारदर्शी तुलना देखें और ₹25,000 की टोकन राशि से व्यक्तिगत बुकिंग करें। राशि केवल आपके भौतिक निरीक्षण और ओटीपी के बाद ही डीलर को मिलेगी।',
      mr: 'पारदर्शक तुलना तपासा आणि ₹२५,००० टोकन रकमेने वैयक्तिक बुकिंग करा. गाडीची स्वतः खात्री करून ओटीपी दिल्यावरच रक्कम डीलरला दिली जाते.',
    },
    bullets: [
      {
        en: 'Transparent "Why this quote ranks #1" breakdown',
        hi: 'पारदर्शी विश्लेषण: "यह कोटेशन नंबर 1 क्यों है"',
        mr: 'पारदर्शक विश्लेषण: "हे कोटेशन प्रथम क्रमांकावर का आहे"',
      },
      {
        en: '₹25,000 held safely pending physical PDI delivery',
        hi: 'भौतिक पीडीआई डिलीवरी तक ₹25,000 एस्क्रो में सुरक्षित',
        mr: 'प्रत्यक्ष पीडीआय डिलिव्हरीपर्यंत ₹२५,००० एस्क्रोमध्ये सुरक्षित',
      },
      {
        en: 'Live milestone shipment step-tracker on your phone',
        hi: 'आपके फोन पर लाइव शिपमेंट और डिलीवरी ट्रैकर',
        mr: 'तुमच्या फोनवर थेट वाहन वाहतूक ट्रॅकर',
      },
    ],
  },
];

export function OnboardingTour({ forceOpen = false, onClose }: OnboardingTourProps) {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const seen = localStorage.getItem('groupdrive_onboarding_completed');
      if (!seen) {
        // Auto-show for first-time visitors after short delay
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, [forceOpen]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem('groupdrive_onboarding_completed', 'true');
    } catch {
      // Ignore
    }
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Keyboard accessibility: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
      if (e.key === 'ArrowRight' && stepIndex < STEPS.length - 1) {
        setStepIndex((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, handleDismiss]);

  if (!isOpen) return null;

  const current = STEPS[stepIndex];
  const Icon = current.icon;
  const isLast = stepIndex === STEPS.length - 1;

  const labels = {
    skip: { en: 'Skip Tour', hi: 'टूर छोड़ें', mr: 'टूर वगळा' },
    back: { en: 'Previous', hi: 'पिछला', mr: 'मागे' },
    next: { en: 'Next Step', hi: 'अगला चरण', mr: 'पुढील पायरी' },
    finish: {
      en: 'Explore Marketplace',
      hi: 'मार्केटप्लेस देखें',
      mr: 'मार्केटप्लेस एक्सप्लोर करा',
    },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Brand Header Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner text-amber-300">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                {current.badge[lang]}
              </span>
              <h2 id="tour-step-title" className="text-lg font-black tracking-tight text-white">
                {current.title[lang]}
              </h2>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close onboarding walkthrough"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStepIndex(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all flex-1 ${
                idx === stepIndex
                  ? 'bg-red-600'
                  : idx < stepIndex
                    ? 'bg-emerald-600'
                    : 'bg-neutral-200 hover:bg-neutral-300'
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100">
            {current.subtitle[lang]}
          </p>

          <p id="tour-step-desc" className="text-sm text-neutral-700 leading-relaxed">
            {current.description[lang]}
          </p>

          {/* Key Bullet Highlights */}
          <div className="space-y-2 pt-1">
            {current.bullets.map((b, bIdx) => (
              <div key={bIdx} className="flex items-start gap-2.5 text-xs text-neutral-800">
                <CheckCircle2
                  className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{b[lang]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors px-2 py-1.5 rounded hover:bg-neutral-200/50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-hidden"
          >
            {labels.skip[lang]}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="flex items-center gap-1 text-xs text-neutral-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{labels.back[lang]}</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (isLast) {
                  handleDismiss();
                } else {
                  setStepIndex((prev) => prev + 1);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <span>{isLast ? labels.finish[lang] : labels.next[lang]}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
