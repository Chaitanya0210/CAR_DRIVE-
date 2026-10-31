import { describe, it, expect } from 'vitest';
import {
  formatIndianNumber,
  formatLakhCrore,
  getTranslation,
  TRANSLATIONS,
} from '../i18n/index.js';

describe('i18n & Indian Currency Number Formatting', () => {
  describe('formatIndianNumber', () => {
    it('formats numbers using Indian grouping (last 3, then groups of 2)', () => {
      expect(formatIndianNumber(500)).toBe('500');
      expect(formatIndianNumber(1250)).toBe('1,250');
      expect(formatIndianNumber(12500)).toBe('12,500');
      expect(formatIndianNumber(125000)).toBe('1,25,000');
      expect(formatIndianNumber(1250000)).toBe('12,50,000');
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
    });

    it('handles negative values and decimals', () => {
      expect(formatIndianNumber(-1250000)).toBe('-12,50,000');
      expect(formatIndianNumber(125000.5)).toBe('1,25,000.5');
    });
  });

  describe('formatLakhCrore', () => {
    it('formats paise into localized Lakh representation', () => {
      const twelveLakhPaise = 125000000; // ₹12.5L
      expect(formatLakhCrore(twelveLakhPaise, 'en')).toBe('₹12.50 Lakh');
      expect(formatLakhCrore(twelveLakhPaise, 'hi')).toBe('₹12.50 लाख');
      expect(formatLakhCrore(twelveLakhPaise, 'mr')).toBe('₹12.50 लाख');
    });

    it('formats paise into localized Crore representation', () => {
      const onePointFiveCrorePaise = 1500000000; // ₹1.5 Cr
      expect(formatLakhCrore(onePointFiveCrorePaise, 'en')).toBe('₹1.50 Crore');
      expect(formatLakhCrore(onePointFiveCrorePaise, 'hi')).toBe('₹1.50 करोड़');
      expect(formatLakhCrore(onePointFiveCrorePaise, 'mr')).toBe('₹1.50 कोटी');
    });
  });

  describe('Multilingual Dictionary Coverage', () => {
    it('has matching translation keys across en, hi, and mr', () => {
      const enKeys = Object.keys(TRANSLATIONS.en).sort();
      const hiKeys = Object.keys(TRANSLATIONS.hi).sort();
      const mrKeys = Object.keys(TRANSLATIONS.mr).sort();

      expect(hiKeys).toEqual(enKeys);
      expect(mrKeys).toEqual(enKeys);
    });

    it('retrieves correct translated string by key', () => {
      expect(getTranslation('hero_title', 'en')).toContain('Form a buyer group');
      expect(getTranslation('hero_title', 'hi')).toContain(
        'अपने तालुका में खरीदारों का ग्रुप बनाएं',
      );
      expect(getTranslation('hero_title', 'mr')).toContain(
        'तुमच्या तालुक्यात खरेदीदारांचा गट तयार करा',
      );
    });
  });
});
