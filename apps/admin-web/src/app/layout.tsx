import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@groupdrive/ui';

export const metadata: Metadata = {
  title: 'GroupDrive Ops Console — Internal Admin',
  description:
    'Internal operations portal for KYB approvals, tax rate verification, and immutable audit logs.',
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
