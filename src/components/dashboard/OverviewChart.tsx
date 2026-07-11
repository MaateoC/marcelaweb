'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface ChartDataPoint {
  label: string; // e.g. "May 2026"
  ingresos: number;
  gastos: number;
  ahorros: number;
}

interface OverviewChartProps {
  data: ChartDataPoint[];
}

export function OverviewChart({ data }: OverviewChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-500">
        No hay datos disponibles
      </div>
    );
  }

  // Find max value to scale chart
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.ingresos, d.gastos, d.ahorros)),
    100000 // avoid division by zero
  );

  // Chart measurements
  const height = 240;
  const paddingBottom = 40;
  const chartHeight = height - paddingBottom;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Resumen Mensual</h3>
          <p className="text-xs text-zinc-400">Comparación de flujos de efectivo</p>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-zinc-400">Gastos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-zinc-400">Ahorros</span>
          </div>
        </div>
      </div>

      <div className="relative mt-8 h-[240px]">
        {/* Y-Axis helper lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const val = maxVal * pct;
          const y = chartHeight - pct * chartHeight;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center border-t border-zinc-900"
              style={{ top: `${y}px` }}
            >
              <span className="absolute right-0 -mt-3.5 bg-zinc-950 px-1 text-[10px] font-mono text-zinc-500">
                {pct === 0 ? '$0' : formatCurrency(val)}
              </span>
            </div>
          );
        })}

        {/* Columns / Bars */}
        <div className="absolute inset-0 flex items-end justify-around px-8 pb-[40px]">
          {data.map((d, index) => {
            const hIngresos = (d.ingresos / maxVal) * chartHeight;
            const hGastos = (d.gastos / maxVal) * chartHeight;
            const hAhorros = (d.ahorros / maxVal) * chartHeight;

            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                className="group relative flex flex-col items-center justify-end h-full w-[20%]"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Visual grouping container */}
                <div className="flex items-end gap-1.5 sm:gap-2">
                  {/* Ingresos bar */}
                  <div
                    className="w-3 rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-400 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] sm:w-4"
                    style={{ height: `${hIngresos}px` }}
                  />
                  {/* Gastos bar */}
                  <div
                    className="w-3 rounded-t bg-red-500 transition-all duration-300 group-hover:bg-red-400 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] sm:w-4"
                    style={{ height: `${hGastos}px` }}
                  />
                  {/* Ahorros bar */}
                  <div
                    className="w-3 rounded-t bg-blue-500 transition-all duration-300 group-hover:bg-blue-400 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] sm:w-4"
                    style={{ height: `${hAhorros}px` }}
                  />
                </div>

                {/* X-axis label */}
                <div className="absolute bottom-[-32px] text-center text-xs font-medium text-zinc-400 transition-colors group-hover:text-white">
                  {d.label}
                </div>

                {/* Hover Tooltip card */}
                {isHovered && (
                  <div className="absolute bottom-[100%] z-20 mb-2 flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{d.label}</span>
                    <div className="mt-1 flex items-center justify-between gap-4 text-xs">
                      <span className="text-zinc-400">Ingresos:</span>
                      <span className="font-bold font-mono text-emerald-400">{formatCurrency(d.ingresos)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-zinc-400">Gastos:</span>
                      <span className="font-bold font-mono text-red-400">{formatCurrency(d.gastos)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-zinc-400">Ahorros:</span>
                      <span className="font-bold font-mono text-blue-400">{formatCurrency(d.ahorros)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
