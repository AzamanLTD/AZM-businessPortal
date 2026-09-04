import { useQuery } from '@tanstack/react-query';
import { request } from '../lib/apiCore';

const DEFAULT_REFRESH_SECONDS = 600;

export const unwrapRatePayload = (payload) => {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const rawRate = data?.liveRetailRate ?? data?.liveUsdToGhs ?? data?.rate;
  const rate = Number(rawRate);
  const rawInterval = data?.refreshIntervalSeconds ?? data?.quoteValiditySeconds;
  const parsedInterval = Number(rawInterval);
  const refreshSeconds = Number.isFinite(parsedInterval) && parsedInterval > 0
    ? Math.round(parsedInterval)
    : DEFAULT_REFRESH_SECONDS;

  return {
    pair: data?.pair?.toString() || 'USDC/GHS',
    settlementCurrency: data?.settlementCurrency?.toString() || 'USDC',
    displayCurrency: data?.displayCurrency?.toString() || 'GHS',
    ghsPerUsdc: Number.isFinite(rate) && rate > 0 ? rate : 0,
    source: data?.rateSource?.toString() || 'UNKNOWN',
    lastSync: data?.lastSync ? new Date(data.lastSync) : null,
    refreshSeconds,
  };
};

export function useFxRate() {
  const query = useQuery({
    queryKey: ['fx-rate', 'USDC', 'GHS'],
    queryFn: async () => unwrapRatePayload(await request('/api/oracle/rates')),
    staleTime: 0,
    refetchInterval: (currentQuery) => {
      const seconds = currentQuery.state.data?.refreshSeconds || DEFAULT_REFRESH_SECONDS;
      return seconds * 1000;
    },
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const data = query.data || {
    pair: 'USDC/GHS',
    settlementCurrency: 'USDC',
    displayCurrency: 'GHS',
    ghsPerUsdc: 0,
    source: 'UNAVAILABLE',
    lastSync: null,
    refreshSeconds: DEFAULT_REFRESH_SECONDS,
  };

  const anchor = query.dataUpdatedAt || 0;
  const expiresAt = anchor + data.refreshSeconds * 1000;
  const remainingSeconds = anchor > 0
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    : 0;

  return {
    ...query,
    ...data,
    isUsable: data.pair === 'USDC/GHS' && data.settlementCurrency === 'USDC' && data.displayCurrency === 'GHS' && data.ghsPerUsdc > 0,
    isStale: query.isError || (anchor > 0 && remainingSeconds === 0),
    remainingSeconds,
    fetchedAt: anchor > 0 ? new Date(anchor) : null,
    refetchRate: query.refetch,
  };
}
