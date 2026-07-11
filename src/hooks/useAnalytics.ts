import { useQuery } from '@tanstack/react-query';

export function useAnalytics(month: string = '2026-07') {
  const analyticsQuery = useQuery({
    queryKey: ['analytics', month],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?month=${month}`);
      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return res.json();
    },
  });

  return {
    analytics: analyticsQuery.data,
    isLoading: analyticsQuery.isLoading,
    isError: analyticsQuery.isError,
    error: analyticsQuery.error,
  };
}
