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
            staleTime: 60 * 1000, // 60 seconds instant cache — switching sections/pages renders in 0ms from RAM
            gcTime: 1000 * 60 * 60 * 24, // Retain in memory for 24 hours
            refetchInterval: 20 * 1000, // Background sync every 20s for real-time multi-user consistency
            refetchOnWindowFocus: false, // Prevent aggressive network requests on every window click
            refetchOnReconnect: true,
            retry: 1,
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
