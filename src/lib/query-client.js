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
// already have loaded. Poll briefly for that singleton and bind exactly once;
// the bridge itself is idempotent and removes stale listeners when a socket is
// replaced. This keeps realtime events as invalidation signals rather than a
// second client-side source of truth.
const bridgeBootstrap = setInterval(() => {
  if (installRealtimeQueryBridge() !== undefined) {
    // installRealtimeQueryBridge is idempotent; stop once a socket exists.
    // The returned cleanup function is intentionally not invoked here.
    clearInterval(bridgeBootstrap);
  }
}, 100);
setTimeout(() => clearInterval(bridgeBootstrap), 30_000);
