'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';
import { LanguageCode } from '@groupdrive/shared';

const LANGUAGES: Array<{ code: LanguageCode; label: string; script: string }> = [
  { code: 'en', label: 'EN', script: 'English' },
  { code: 'hi', label: 'हिंदी', script: 'Hindi' },
  { code: 'mr', label: 'मराठी', script: 'Marathi' },
];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 ${className}`}
    >
      <div className="flex items-center px-2 text-neutral-500" aria-hidden="true">
        <Globe className="w-4 h-4 text-primary" />
      </div>

      <div className="flex items-center gap-1">
        {LANGUAGES.map((l) => {
          const isActive = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={isActive}
              aria-label={`Switch language to ${l.script}`}
              className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                isActive
                  ? 'bg-white text-primary shadow-xs border border-neutral-200'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
