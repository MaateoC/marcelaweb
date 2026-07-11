import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaccion } from '@/types';

interface Filters {
  tipo?: string;
  categoria?: string;
  month?: string;
  propiedadId?: string;
}

export function useTransactions(filters: Filters = {}) {
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery<Transaccion[]>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.month) params.append('month', filters.month);
      if (filters.propiedadId) params.append('propiedadId', filters.propiedadId);

      const res = await fetch(`/api/transacciones?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return res.json();
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (newTx: Omit<Transaccion, 'id' | 'createdAt' | 'updatedAt'>) => {
      const res = await fetch('/api/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      if (!res.ok) {
        throw new Error('Failed to create transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    isError: transactionsQuery.isError,
    error: transactionsQuery.error,
    createTransaction: createTransactionMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
  };
}
