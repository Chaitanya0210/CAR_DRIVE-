import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@groupdrive/ui';
import { LanguageProvider } from '../context/LanguageContext';
import { OfflineBanner } from '../components/OfflineBanner';

export const viewport: Viewport = {
  themeColor: '#DC2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'GroupDrive — India Group Car-Buying Marketplace',
  description:
    'Two-sided rural-first automotive reverse auction marketplace. Aggregate demand by delivery zone to get guaranteed landed prices.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GroupDrive',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        <LanguageProvider>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </LanguageProvider>

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('[GroupDrive PWA] ServiceWorker registered with scope: ', reg.scope);
                    },
                    function(err) {
                      console.log('[GroupDrive PWA] ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
