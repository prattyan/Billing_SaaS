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
            refetchInterval: 5000, // Automatically auto-refresh all data every 5 seconds
            staleTime: 0,
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
