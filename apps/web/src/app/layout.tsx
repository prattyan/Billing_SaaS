import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BillFlow — Grocery & Shop Billing SaaS',
  description: 'Multi-tenant billing and inventory management for grocery stores and shop vendors. Manage stock, generate GST-compliant bills, and send them via WhatsApp.',
  keywords: 'billing, POS, inventory, grocery, GST, India, SaaS, barcode',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: 'rgb(24, 25, 28)',
                border: '1px solid rgb(226, 232, 240)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                fontWeight: 500,
              },
              success: {
                iconTheme: { primary: 'rgb(78, 159, 118)', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: 'rgb(239, 68, 68)', secondary: '#ffffff' },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
