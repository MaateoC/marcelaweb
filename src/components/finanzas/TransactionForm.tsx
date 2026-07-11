'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransactions } from '@/hooks/useTransactions';
import { Propiedad } from '@/types';

const transactionSchema = z.object({
  tipo: z.enum(['INGRESO', 'GASTO', 'AHORRO']),
  monto: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  descripcion: z.string().min(3, { message: 'La descripción debe tener al menos 3 caracteres' }),
  fecha: z.string().min(1, { message: 'La fecha es requerida' }),
  categoria: z.string().min(1, { message: 'La categoría es requerida' }),
  subcategoria: z.string().optional(),
  propiedadId: z.string().optional(),
  pagoId: z.string().optional(),
  medioPago: z.enum(['EFECTIVO', 'DEBITO', 'CREDITO']).optional(),
  tarjetaId: z.string().optional(),
  cuotasTotal: z.number().int().min(1).max(36).optional(),
  recargo: z.number().min(0).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  properties: Propiedad[];
  pendingPayments: { id: string; label: string; contractId: string; propiedadId: string; monto: number }[];
  onSuccess?: () => void;
  tipoLock?: 'INGRESO' | 'GASTO' | 'AHORRO';
  onCancel?: () => void;
}

export function TransactionForm({ properties, pendingPayments, onSuccess, tipoLock, onCancel }: TransactionFormProps) {
  const { createTransaction, isCreating } = useTransactions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [tarjetas, setTarjetas] = useState<{ id: string; nombre: string }[]>([]);

  // Fetch associated credit cards
  useEffect(() => {
    fetch('/api/configuracion/tarjetas')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTarjetas(data);
        }
      })
      .catch((err) => console.error('Error fetching cards:', err));
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tipo: tipoLock || 'GASTO',
      fecha: new Date().toISOString().split('T')[0],
      categoria: '',
      subcategoria: '',
      propiedadId: '',
      pagoId: '',
      medioPago: 'EFECTIVO',
      tarjetaId: '',
      cuotasTotal: 1,
      recargo: 0,
    },
  });

  const selectedTipo = watch('tipo');
  const selectedCategoria = watch('categoria');
  const selectedPagoId = watch('pagoId');
  const selectedMedioPago = watch('medioPago');

  // Categories suggestions based on transaction type
  const categoriesMap = {
    INGRESO: ['Jubilación', 'Alquileres', 'Otros ingresos'],
    GASTO: ['Alimentos', 'Impuestos Locales', 'Servicios', 'Transporte', 'Salud', 'Salidas', 'Indumentaria', 'Regalos', 'Entretenimiento', 'Otros'],
    AHORRO: ['Inversiones', 'Dólar MEP', 'Plazo Fijo', 'Cripto', 'Otros'],
  };

  // Subcategories suggestions
  const subcategoriesMap: Record<string, string[]> = {
    Servicios: ['EPE Luz', 'ASSA Agua', 'Litoral Gas', 'Internet', 'Otros'],
    'Impuestos Locales': ['TGI Rosario', 'API Santa Fe', 'DReI Rosario', 'Otros'],
    Alquileres: ['Departamentos', 'Locales Comerciales'],
    Sueldo: ['Relación de dependencia', 'Monotributo'],
  };

  // If GASTO or INGRESO is selected, handle category changes
  useEffect(() => {
    setValue('categoria', '');
    setValue('subcategoria', '');
    setValue('pagoId', '');
  }, [selectedTipo, setValue]);

  // If Alquileres is selected, populate payment link details
  useEffect(() => {
    if (selectedPagoId) {
      const match = pendingPayments.find((p) => p.id === selectedPagoId);
      if (match) {
        setValue('monto', match.monto);
        setValue('propiedadId', match.propiedadId);
        setValue('descripcion', `Cobro Alquiler - ${match.label}`);
        setValue('subcategoria', 'Departamentos');
      }
    }
  }, [selectedPagoId, pendingPayments, setValue]);

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      setErrorMessage(null);
      
      // Clean up fields based on transaction parameters
      const payload: any = {
        tipo: data.tipo,
        monto: data.monto,
        descripcion: data.descripcion,
        fecha: data.fecha,
        categoria: data.categoria,
        subcategoria: data.subcategoria || null,
        propiedadId: data.propiedadId || null,
        pagoId: data.pagoId || null,
      };

      if (data.tipo === 'GASTO') {
        payload.medioPago = data.medioPago;
        if (data.medioPago === 'CREDITO') {
          payload.tarjetaId = data.tarjetaId || null;
          payload.cuotasTotal = Number(data.cuotasTotal || 1);
          payload.recargo = Number(data.recargo || 0);
        }
      }

      await createTransaction(payload);
      reset({
        tipo: tipoLock || 'GASTO',
        fecha: new Date().toISOString().split('T')[0],
        monto: 0,
        descripcion: '',
        categoria: '',
        subcategoria: '',
        propiedadId: '',
        pagoId: '',
        medioPago: 'EFECTIVO',
        tarjetaId: '',
        cuotasTotal: 1,
        recargo: 0,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la transacción');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Nueva Transacción</h3>
          <p className="text-xs text-zinc-400">Registrar un ingreso o gasto</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <span className="text-lg font-bold">×</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-xs text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Tipo Selector */}
      {!tipoLock && (
        <div className="grid grid-cols-2 gap-2">
          {(['INGRESO', 'GASTO'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('tipo', t)}
              className={`rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                selectedTipo === t
                  ? t === 'INGRESO'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Link to Rental Payment (Only when INGRESO and category Alquileres is chosen) */}
      {selectedTipo === 'INGRESO' && pendingPayments.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-400">Vincular a Cobro de Alquiler</label>
          <select
            {...register('pagoId')}
            className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
          >
            <option value="">-- No vincular --</option>
            {pendingPayments.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} - ${p.monto.toLocaleString('es-AR')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Monto & Fecha */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-400">Monto (ARS)</label>
          <input
            type="number"
            step="any"
            {...register('monto', { valueAsNumber: true })}
            placeholder="0"
            className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm font-mono text-white focus:border-zinc-700 focus:outline-none"
          />
          {errors.monto && <p className="mt-1 text-xs text-red-500">{errors.monto.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400">Fecha</label>
          <input
            type="date"
            {...register('fecha')}
            className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
          />
          {errors.fecha && <p className="mt-1 text-xs text-red-500">{errors.fecha.message}</p>}
        </div>
      </div>

      {/* Descripcion */}
      <div>
        <label className="block text-xs font-medium text-zinc-400">Descripción</label>
        <input
          type="text"
          {...register('descripcion')}
          placeholder={
            selectedTipo === 'INGRESO'
              ? 'Ej. Cobro alquiler, Cobro jubilación, etc.'
              : 'Ej. Pago EPE, Supermercado, etc.'
          }
          className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
        />
        {errors.descripcion && <p className="mt-1 text-xs text-red-500">{errors.descripcion.message}</p>}
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-medium text-zinc-400">Categoría</label>
        <select
          {...register('categoria')}
          className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
        >
          <option value="">Seleccionar...</option>
          {categoriesMap[selectedTipo].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.categoria && <p className="mt-1 text-xs text-red-500">{errors.categoria.message}</p>}
      </div>

      {/* Medio de pago selector (Only for GASTO) */}
      {selectedTipo === 'GASTO' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400">Medio de Pago</label>
            <select
              {...register('medioPago')}
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="DEBITO">Tarjeta de Débito</option>
              <option value="CREDITO">Tarjeta de Crédito</option>
            </select>
          </div>

          {/* Credit Card Specific Fields */}
          {selectedMedioPago === 'CREDITO' && (
            <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Seleccionar Tarjeta</label>
                <select
                  {...register('tarjetaId')}
                  className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-950 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                >
                  <option value="">Seleccionar tarjeta cargada...</option>
                  {tarjetas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Cantidad de Cuotas</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    {...register('cuotasTotal', { valueAsNumber: true })}
                    placeholder="1"
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-950 p-2.5 text-sm font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400">Recargo / Interés (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('recargo', { valueAsNumber: true })}
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-950 p-2.5 text-sm font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isCreating}
          className="flex-1 cursor-pointer rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isCreating ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}
