import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Build a fresh QueryClient per test so cache state never leaks across cases.
 * Disable retries so failed mocks fail fast.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

export const withQueryClient = (children: ReactNode, client = createTestQueryClient()) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
