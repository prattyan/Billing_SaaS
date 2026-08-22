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
                background: 'rgb(28, 28, 35)',
                color: 'rgb(250, 250, 250)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: { primary: 'rgb(52, 211, 153)', secondary: 'rgb(28,28,35)' },
              },
              error: {
                iconTheme: { primary: 'rgb(239, 68, 68)', secondary: 'rgb(28,28,35)' },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
