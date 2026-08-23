'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#09090b',
      color: '#ffffff',
      gap: '16px',
    }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'rgb(139,92,246)' }} />
      <p style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Launching BillFlow Pro POS...</p>
    </div>
  );
}
