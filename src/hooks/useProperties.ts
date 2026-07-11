import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Propiedad, Contrato } from '@/types';

export function useProperties(tipo?: string) {
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery<Propiedad[]>({
    queryKey: ['properties', tipo],
    queryFn: async () => {
      const url = tipo ? `/api/propiedades?tipo=${tipo}` : '/api/propiedades';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch properties');
      }
      return res.json();
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (
      newProp: Omit<Propiedad, 'id' | 'createdAt' | 'updatedAt'> & {
        contrato?: {
          inquilinoNombre: string;
          fechaInicio: string;
          fechaFin: string;
          montoInicial: number;
          indiceActualizacion: string;
          frecuenciaActualizacion: number;
          documentoPath?: string | null;
        };
      }
    ) => {
      const res = await fetch('/api/propiedades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProp),
      });
      if (!res.ok) {
        throw new Error('Failed to create property');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (newContract: Omit<Contrato, 'id' | 'montoActual' | 'createdAt' | 'updatedAt'>) => {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContract),
      });
      if (!res.ok) {
        throw new Error('Failed to create contract');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const updateContractLeaseMutation = useMutation({
    mutationFn: async (payload: { contractId: string; newMonto: number; updateDate: string | Date }) => {
      const res = await fetch('/api/contratos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Failed to update contract lease amount');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  return {
    properties: propertiesQuery.data || [],
    isLoading: propertiesQuery.isLoading,
    isError: propertiesQuery.isError,
    error: propertiesQuery.error,
    createProperty: createPropertyMutation.mutateAsync,
    isCreatingProperty: createPropertyMutation.isPending,
    createContract: createContractMutation.mutateAsync,
    isCreatingContract: createContractMutation.isPending,
    updateContractLease: updateContractLeaseMutation.mutateAsync,
    isUpdatingLease: updateContractLeaseMutation.isPending,
  };
}
