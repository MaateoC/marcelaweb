'use client';

import React from 'react';
import { Propiedad, Contrato } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Building2, Store, Calendar, CheckCircle2, XCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface PropertyCardProps {
  property: Propiedad;
  onApplyUpdate: (contract: Contrato) => void;
}

export function PropertyCard({ property, onApplyUpdate }: PropertyCardProps) {
  const activeContract = property.contratos?.find(
    (c) => {
      const fin = new Date(c.fechaFin);
      const hoy = new Date();
      return fin >= hoy;
    }
  );

  const PropertyIcon = property.tipo === 'DEPARTAMENTO' ? Building2 : Store;

  // Calculate contract progress
  let progressPercent = 0;
  let monthsRemaining = 0;
  if (activeContract) {
    const start = new Date(activeContract.fechaInicio).getTime();
    const end = new Date(activeContract.fechaFin).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const elapsed = now - start;
    progressPercent = Math.min(Math.max((elapsed / total) * 100, 0), 100);

    monthsRemaining = Math.max(
      Math.ceil((end - now) / (1000 * 60 * 60 * 24 * 30.4)),
      0
    );
  }

  // Get all payments in chronological order (ascending)
  const allPayments = activeContract?.pagos
    ? [...activeContract.pagos].sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia))
    : [];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-blue-400">
            <PropertyIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-white leading-tight">{property.nombre}</h4>
            <span className="text-xs text-zinc-500">{property.direccion}</span>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            property.estado === 'ACTIVO'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {property.estado}
        </span>
      </div>

      {activeContract ? (
        <div className="mt-5 space-y-4">
          {/* Tenant and general contract Info */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-4">
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Inquilino</span>
              <span className="font-semibold text-white">{activeContract.inquilinoNombre}</span>
            </div>

            <div className="mt-2.5 flex justify-between items-end">
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Alquiler Actual</span>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  {formatCurrency(activeContract.montoActual)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Ajuste ({activeContract.indiceActualizacion})</span>
                <span className="text-xs text-white">
                  Cada {activeContract.frecuenciaActualizacion} meses
                </span>
              </div>
            </div>

            {/* Contract duration progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Alquiler: {monthsRemaining} meses restantes
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent payments checklist */}
          {/* Cronograma de pagos horizontal timeline */}
          {allPayments.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Estados de Pago</span>
              <div className="relative mt-2 flex items-center gap-1 overflow-x-auto py-2.5 px-2 no-scrollbar border border-zinc-900 rounded-xl bg-zinc-950/40">
                {/* Connecting background line */}
                <div className="absolute left-6 right-6 top-[22px] h-0.5 bg-zinc-900" />
                
                {allPayments.map((p) => {
                  const [_, monthStr] = p.mesReferencia.split('-');
                  const monthIdx = parseInt(monthStr, 10) - 1;
                  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                  const monthName = monthNames[monthIdx] || monthStr;
                  const isPaid = p.estado === 'PAGADO';
                  
                  return (
                    <div
                      key={p.id}
                      className="relative z-10 flex flex-col items-center min-w-[38px] px-0.5"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isPaid
                            ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-450'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                        }`}
                        title={`${p.mesReferencia}: ${isPaid ? 'Cobrado' : 'Pendiente'}`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-450" />
                        ) : (
                          <XCircle className="h-3 w-3 text-zinc-650" />
                        )}
                      </div>
                      <span className="mt-1 text-[8px] font-bold text-zinc-500 uppercase font-mono">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onApplyUpdate(activeContract)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-850 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white hover:border-zinc-700 active:scale-95"
            >
              <TrendingUp className="h-3.5 w-3.5 text-zinc-500" /> Actualizar
            </button>
            <Link
              href={`/propiedades/${property.id}`}
              className="flex [flex:2] items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
            >
              Ver Movimientos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-zinc-800 p-6 text-center">
          <span className="block text-xs text-zinc-500 mb-2">Sin contrato activo</span>
          <Link
            href={`/propiedades/${property.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
          >
            Configurar Contrato <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
