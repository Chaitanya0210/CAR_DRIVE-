import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@groupdrive/ui';

export const metadata: Metadata = {
  title: 'GroupDrive Dealer Hub — Verified Seller Portal',
  description:
    'Dedicated portal for verified automobile dealerships across India to participate in reverse auctions and list offered inventory.',
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
