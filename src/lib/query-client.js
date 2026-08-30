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

// Auth restoration can create the socket after this module loads. Keep the
// short bootstrap window, but expose an explicit hook for later login/logout
// cycles where SocketService creates a new singleton instance.
export function ensureRealtimeQueryBridge() {
  return installRealtimeQueryBridge(queryClient);
}

const bridgeBootstrap = setInterval(() => {
  if (ensureRealtimeQueryBridge()) {
    clearInterval(bridgeBootstrap);
  }
}, 100);
setTimeout(() => clearInterval(bridgeBootstrap), 30_000);
