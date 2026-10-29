import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@groupdrive/ui';

export const metadata: Metadata = {
  title: 'GroupDrive — India Group Car-Buying Marketplace',
  description:
    'Two-sided rural-first automotive reverse auction marketplace. Aggregate demand by delivery zone to get guaranteed landed prices.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
