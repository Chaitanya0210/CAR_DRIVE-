import type { Config } from 'tailwindcss';

export const groupDrivePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Brand Red
        primary: {
          DEFAULT: '#DC2626', // Crimson Red
          dark: '#991B1B',
          light: '#FEE2E2',
          hover: '#B91C1C',
        },
        // Surfaces & Borders
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F9FAFB',
          card: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#F3F4F6',
          strong: '#D1D5DB',
          focus: '#DC2626',
        },
        // Neutral Grayscale
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Semantic Tokens (Success, Warning, Info, Error)
        // CRITICAL: Error is a distinct deep-crimson (#881337) and must NOT collide with brand primary red (#DC2626)
        success: {
          DEFAULT: '#059669', // Emerald
          dark: '#065F46',
          light: '#D1FAE5',
          border: '#A7F3D0',
        },
        warning: {
          DEFAULT: '#D97706', // Amber
          dark: '#92400E',
          light: '#FEF3C7',
          border: '#FDE68A',
        },
        error: {
          DEFAULT: '#881337', // Deep Crimson / Burgundy (Rose 900) - distinct from primary brand
          dark: '#4C0519',
          light: '#FFE4E6',
          border: '#FECDD3',
        },
        info: {
          DEFAULT: '#0284C7', // Sky Blue
          dark: '#075985',
          light: '#E0F2FE',
          border: '#BAE6FD',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-noto-sans)',
          'Noto Sans',
          'var(--font-noto-devanagari)',
          'Noto Sans Devanagari',
          'system-ui',
          'sans-serif',
        ],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
};

export default groupDrivePreset;
