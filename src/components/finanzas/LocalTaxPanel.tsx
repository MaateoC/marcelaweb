'use client';

import React from 'react';
import { Transaccion } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Trash2
} from 'lucide-react';

export interface ImpuestoConfigurado {
  id: string;
  nombre: string;
  descripcion?: string | null;
  montoSugerido: number;
  diaVencimiento: number;
  categoria: string;
  subcategoria?: string | null;
}

interface LocalTaxPanelProps {
  currentMonthTransactions: Transaccion[];
  onQuickPay?: (taxName: string, subcat: string, suggestedAmount: number) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
  taxes?: ImpuestoConfigurado[];
  onDeleteTax?: (id: string) => void;
}

export function LocalTaxPanel({ 
  currentMonthTransactions, 
  onQuickPay, 
  isExpanded = false, 
  onToggle,
  taxes,
  onDeleteTax
}: LocalTaxPanelProps) {
  // Fallback defaults if no taxes configured or loaded
  const defaultTaxes = [
    { id: '1', nombre: 'TGI Rosario', subcategoria: 'TGI Rosario', descripcion: 'Tasa General de Inmuebles (Municipal)', montoSugerido: 9200, diaVencimiento: 10, categoria: 'Impuestos Locales' },
    { id: '2', nombre: 'API Inmobiliario', subcategoria: 'API Santa Fe', descripcion: 'Impuesto Inmobiliario (Provincial)', montoSugerido: 12500, diaVencimiento: 15, categoria: 'Impuestos Locales' },
    { id: '3', nombre: 'EPE Luz', subcategoria: 'EPE Luz', descripcion: 'Empresa Provincial de la Energía (EPE)', montoSugerido: 21300, diaVencimiento: 20, categoria: 'Servicios' },
    { id: '4', nombre: 'ASSA Agua', subcategoria: 'ASSA Agua', descripcion: 'Aguas Santafesinas (ASSA)', montoSugerido: 9500, diaVencimiento: 22, categoria: 'Servicios' },
    { id: '5', nombre: 'Litoral Gas', subcategoria: 'Litoral Gas', descripcion: 'Suministro de Gas Natural', montoSugerido: 6800, diaVencimiento: 25, categoria: 'Servicios' },
    { id: '6', nombre: 'DReI Rosario', subcategoria: 'DReI Rosario', descripcion: 'Derecho de Registro e Inspección (Comercios)', montoSugerido: 15400, diaVencimiento: 18, categoria: 'Impuestos Locales' },
  ];

  const displayTaxes = taxes || defaultTaxes;

  // Helper to check if paid in the transaction list
  const getTaxPaymentStatus = (subcat: string) => {
    return currentMonthTransactions.find(
      (t) => t.tipo === 'GASTO' && t.subcategoria === subcat
    );
  };

  return (
    <div id="tax-panel" className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all duration-300">
      {/* Clickable Header */}
      <div 
        onClick={onToggle}
        className={`flex items-center justify-between ${onToggle ? 'cursor-pointer select-none group' : ''}`}
      >
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
            Impuestos y Servicios Rosario
          </h3>
          <p className="text-xs text-zinc-400">Control de vencimientos y tasas locales de Santa Fe</p>
        </div>
        {onToggle && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-4.5 w-4.5" />
            ) : (
              <ChevronDown className="h-4.5 w-4.5" />
            )}
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="mt-5 space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          {displayTaxes.map((tax) => {
            const subcat = tax.subcategoria || tax.nombre;
            const payment = getTaxPaymentStatus(subcat);
            const isPaid = !!payment;

            return (
              <div
                key={tax.id}
                className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                  isPaid
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{tax.nombre}</span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {tax.descripcion || ''} {tax.diaVencimiento ? `• Vence el día ${tax.diaVencimiento}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs text-zinc-500">Monto</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {isPaid ? formatCurrency(payment.monto) : formatCurrency(tax.montoSugerido)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isPaid && onQuickPay && (
                      <button
                        onClick={() => onQuickPay(tax.nombre, subcat, tax.montoSugerido)}
                        className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-600/10 font-medium"
                      >
                        Pagar ahora
                      </button>
                    )}

                    {onDeleteTax && (
                      <button
                        onClick={() => onDeleteTax(tax.id)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-950 transition-colors"
                        title="Eliminar configuración"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
