import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { installRealtimeQueryBridge } from './realtimeQueryBridge';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => err?.status >= 500 && count < 2,
      placeholderData: keepPreviousData,
    },
    mutations: { retry: 0 },
  },
});

// Auth restoration creates the socket asynchronously, after this module may
// already have loaded. Poll briefly for that singleton and bind exactly once.
const bridgeBootstrap = setInterval(() => {
  if (installRealtimeQueryBridge(queryClient)) {
    clearInterval(bridgeBootstrap);
  }
}, 100);
setTimeout(() => clearInterval(bridgeBootstrap), 30_000);
