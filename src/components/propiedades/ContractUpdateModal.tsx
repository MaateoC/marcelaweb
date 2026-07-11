'use client';

import React, { useState, useEffect } from 'react';
import { Contrato } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useProperties } from '@/hooks/useProperties';
import { X, TrendingUp } from 'lucide-react';

interface ContractUpdateModalProps {
  contract: Contrato | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContractUpdateModal({ contract, isOpen, onClose }: ContractUpdateModalProps) {
  const { updateContractLease, isUpdatingLease } = useProperties();
  const [percentIncrease, setPercentIncrease] = useState<number>(15); // default mock 15% increase
  const [newMonto, setNewMonto] = useState<number>(0);
  const [updateDate, setUpdateDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
      const calculated = contract.montoActual * (1 + percentIncrease / 100);
      setNewMonto(Math.round(calculated));
    }
  }, [contract, percentIncrease]);

  if (!isOpen || !contract) return null;

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPercentIncrease(val);
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setNewMonto(val);
    if (contract.montoActual > 0) {
      const computedPct = ((val - contract.montoActual) / contract.montoActual) * 100;
      setPercentIncrease(parseFloat(computedPct.toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      await updateContractLease({
        contractId: contract.id,
        newMonto,
        updateDate,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el alquiler');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-in scale-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Actualización de Alquiler</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Inquilino:</span>
              <span className="font-semibold text-white">{contract.inquilinoNombre}</span>
            </div>
            <div className="flex justify-between">
              <span>Índice Pactado:</span>
              <span className="font-semibold text-white">{contract.indiceActualizacion}</span>
            </div>
            <div className="flex justify-between">
              <span>Último Valor:</span>
              <span className="font-semibold font-mono text-white">
                {formatCurrency(contract.montoActual)}
              </span>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* Porcentaje de Aumento */}
          <div>
            <label className="block text-xs font-medium text-zinc-400">Porcentaje de Aumento (%)</label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={percentIncrease}
                onChange={handlePercentChange}
                className="h-1.5 flex-1 cursor-pointer rounded-lg bg-zinc-800 accent-blue-500"
              />
              <input
                type="number"
                step="any"
                value={percentIncrease}
                onChange={handlePercentChange}
                className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-center text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Nuevo Alquiler */}
          <div>
            <label className="block text-xs font-medium text-zinc-400">Nuevo Valor del Alquiler (ARS)</label>
            <input
              type="number"
              value={newMonto}
              onChange={handleMontoChange}
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm font-mono text-white focus:border-zinc-700 focus:outline-none"
            />
          </div>

          {/* Fecha de actualización */}
          <div>
            <label className="block text-xs font-medium text-zinc-400">Fecha de Aplicación</label>
            <input
              type="date"
              value={updateDate}
              onChange={(e) => setUpdateDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-850 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdatingLease}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isUpdatingLease ? 'Aplicando...' : 'Aplicar Aumento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
