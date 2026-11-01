'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LanguageCode,
  TranslationKey,
  getTranslation,
  formatLakhCrore,
  formatIndianNumber,
} from '@groupdrive/shared';

interface LanguageContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  formatPrice: (paise: number) => string;
  formatNumber: (num: number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  formatPrice: (paise) => `₹${paise / 100}`,
  formatNumber: (n) => String(n),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>('en');

  useEffect(() => {
    try {
      localStorage.setItem('groupdrive_lang', 'en');
      document.cookie = `groupdrive_lang=en; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = 'en';
    } catch {
      // Fallback
    }
  }, []);

  const setLang = (newLang: LanguageCode) => {
    setLangState(newLang);
    try {
      localStorage.setItem('groupdrive_lang', newLang);
      document.cookie = `groupdrive_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLang;
    } catch {
      // Ignore in private browsing
    }
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(key, lang);
  };

  const formatPrice = (paise: number): string => {
    return formatLakhCrore(paise, lang);
  };

  const formatNumber = (num: number): string => {
    return formatIndianNumber(num);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, formatPrice, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
