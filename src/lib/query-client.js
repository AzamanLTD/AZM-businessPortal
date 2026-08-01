import { useQueryClient, keepPreviousData } from '@tanstack/react-query';

export const queryClient = new (await import('@tanstack/react-query')).QueryClient({
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
