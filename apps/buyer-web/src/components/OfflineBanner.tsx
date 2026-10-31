'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md sticky top-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
        <span className="flex-1">{t('pwa_offline_banner')}</span>
        <span className="inline-flex items-center gap-1 bg-amber-700/80 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono shrink-0">
          <Database className="w-3 h-3" />
          {t('pwa_cached_deals')}
        </span>
      </div>
    </aside>
  );
}
