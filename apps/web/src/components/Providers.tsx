'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import OfflineSyncProvider from './OfflineSyncProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000, // 10 seconds cache validity — renders instantly from RAM cache
            gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
            refetchInterval: 10 * 1000, // Auto-sync in background every 10s for real-time multi-user stock consistency
            refetchOnWindowFocus: true, // Auto-sync latest database records when cashier focuses window
            refetchOnReconnect: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineSyncProvider>
        {children}
      </OfflineSyncProvider>
    </QueryClientProvider>
  );
}
