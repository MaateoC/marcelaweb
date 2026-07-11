'use client';

import React from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProperties } from '@/hooks/useProperties';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Clock,
  PieChart,
  CheckCircle2
} from 'lucide-react';

export default function MetricasAlquileresPage() {
  const currentMonth = '2026-07';
  const { analytics, isLoading: isAnalyticsLoading } = useAnalytics(currentMonth);
  const { properties, isLoading: isPropsLoading } = useProperties();

  if (isAnalyticsLoading || isPropsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const hoy = new Date(2026, 6, 10); // Baseline July 10, 2026

  // Get active contracts list
  const activeContractsList = properties
    .flatMap((p) => p.contratos || [])
    .filter((c) => new Date(c.fechaFin) >= hoy);

  const totalContratosActivos = activeContractsList.length;

  // Rent amounts & general averages
  const totalRentAmount = activeContractsList.reduce((sum, c) => sum + c.montoActual, 0);
  const promedioAlquiler = totalContratosActivos > 0 ? totalRentAmount / totalContratosActivos : 0;

  // 1. Occupancy Rate
  const totalPropiedades = properties.length;
  const propiedadesOcupadas = properties.filter((p) =>
    p.contratos?.some((c) => new Date(c.fechaFin) >= hoy)
  ).length;
  const tasaOcupacion = totalPropiedades > 0 ? (propiedadesOcupadas / totalPropiedades) * 100 : 0;

  // 2. Collection performance for the current month (2026-07)
  let totalEsperadoCobro = 0;
  let totalCobrado = 0;

  properties.forEach((p) => {
    const activeC = p.contratos?.find((c) => new Date(c.fechaFin) >= hoy);
    if (activeC) {
      totalEsperadoCobro += activeC.montoActual;
      const pagoEsteMes = activeC.pagos?.find((pay) => pay.mesReferencia === currentMonth);
      if (pagoEsteMes) {
        if (pagoEsteMes.estado === 'PAGADO' || pagoEsteMes.estado === 'PARCIAL') {
          totalCobrado += pagoEsteMes.montoCobrado;
        }
      }
    }
  });

  const totalPendienteCobro = Math.max(totalEsperadoCobro - totalCobrado, 0);
  const tasaCobranza = totalEsperadoCobro > 0 ? (totalCobrado / totalEsperadoCobro) * 100 : 0;

  // 3. Average rent by property type
  let sumDeptos = 0;
  let countDeptos = 0;
  let sumLocales = 0;
  let countLocales = 0;

  properties.forEach((p) => {
    const activeC = p.contratos?.find((c) => new Date(c.fechaFin) >= hoy);
    if (activeC) {
      if (p.tipo === 'DEPARTAMENTO') {
        sumDeptos += activeC.montoActual;
        countDeptos++;
      } else if (p.tipo === 'LOCAL') {
        sumLocales += activeC.montoActual;
        countLocales++;
      }
    }
  });

  const promedioDeptos = countDeptos > 0 ? sumDeptos / countDeptos : 0;
  const promedioLocales = countLocales > 0 ? sumLocales / countLocales : 0;

  // 4. Index Distribution
  const indexCounts: Record<string, number> = {};
  activeContractsList.forEach((c) => {
    const idx = c.indiceActualizacion || 'FIJO';
    indexCounts[idx] = (indexCounts[idx] || 0) + 1;
  });

  // Timeframe comparisons for Alquileres
  const rentMom = analytics?.comparisons?.mom?.alquileres || { actual: 0, anterior: 0, variacionPorcentual: 0 };
  const rentQoq = analytics?.comparisons?.qoq?.alquileres || { actual: 0, anterior: 0, variacionPorcentual: 0 };
  const rentHoh = analytics?.comparisons?.hoh?.alquileres || { actual: 0, anterior: 0, variacionPorcentual: 0 };
  const rentYoy = analytics?.comparisons?.yoy?.alquileres || { actual: 0, anterior: 0, variacionPorcentual: 0 };

  // Gather all price adjustments from all contracts across all properties
  const allAdjustments = properties
    .flatMap((p) =>
      (p.contratos || []).flatMap((c) =>
        (c.historialAjustes || []).map((h) => ({
          ...h,
          propiedadNombre: p.nombre,
          inquilinoNombre: c.inquilinoNombre,
        }))
      )
    )
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Evolución de Alquileres</h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium">
          Métricas clave, tasas de ocupación y análisis de variación de montos de renta.
        </p>
      </div>

      {/* Main KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rent Expected */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-blue-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Renta Total Mensual</h3>
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-white block">
              {formatCurrency(totalRentAmount)}
            </span>
            <span className="block text-[10px] text-zinc-550 font-medium">
              Suma de alquileres activos
            </span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Tasa de Ocupación</h3>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-450">
              {tasaOcupacion.toFixed(0)}%
            </span>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-white block">
              {propiedadesOcupadas} de {totalPropiedades}
            </span>
            <span className="block text-[10px] text-zinc-550 font-medium">
              Propiedades con contrato activo
            </span>
          </div>
        </div>

        {/* Collection Status */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Cobranza del Mes</h3>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-450 font-mono">
              {tasaCobranza.toFixed(0)}%
            </span>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-white block">
              {formatCurrency(totalCobrado)}
            </span>
            <span className="block text-[10px] text-zinc-550 font-medium">
              Pendiente: {formatCurrency(totalPendienteCobro)}
            </span>
          </div>
        </div>

        {/* Average Rental Price */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Alquiler Promedio</h3>
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-white block">
              {formatCurrency(promedioAlquiler)}
            </span>
            <span className="block text-[10px] text-zinc-550 font-medium">
              Por contrato activo ({totalContratosActivos} en total)
            </span>
          </div>
        </div>
      </div>

      {/* Variaciones de Alquiler (Mensual, Cuatrimestral, Semestral, Anual) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Variaciones Históricas de Alquileres</h2>
          <p className="text-xs text-zinc-400">Comparativa del rendimiento del monto del alquiler en diferentes intervalos temporales ($ y %)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Mensual (MoM)', actual: rentMom.actual, anterior: rentMom.anterior, pct: rentMom.variacionPorcentual, desc: 'vs. mes anterior' },
            { name: 'Cuatrimestral (QoQ)', actual: rentQoq.actual, anterior: rentQoq.anterior, pct: rentQoq.variacionPorcentual, desc: 'vs. hace 4 meses' },
            { name: 'Semestral (HoH)', actual: rentHoh.actual, anterior: rentHoh.anterior, pct: rentHoh.variacionPorcentual, desc: 'vs. hace 6 meses' },
            { name: 'Anual (YoY)', actual: rentYoy.actual, anterior: rentYoy.anterior, pct: rentYoy.variacionPorcentual, desc: 'vs. hace 1 año' },
          ].map((item) => {
            const diff = item.actual - item.anterior;
            const isPositive = diff >= 0;
            return (
              <div key={item.name} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{item.name}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    isPositive ? 'text-emerald-450 border-emerald-500/20 bg-emerald-500/5' : 'text-red-405 border-red-500/20 bg-red-500/5'
                  }`}>
                    {isPositive ? '+' : ''}{item.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-1">
                  <span className={`font-mono text-xl font-bold block ${isPositive ? 'text-emerald-455' : 'text-red-405'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(diff)}
                  </span>
                  <div className="text-[10px] text-zinc-550 space-y-0.5 font-medium">
                    <span className="block font-mono">Anterior: {formatCurrency(item.anterior)}</span>
                    <span className="block font-mono text-zinc-450">Actual: {formatCurrency(item.actual)}</span>
                    <span className="block mt-1.5 text-zinc-600 font-medium italic">{item.desc}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tipo de Propiedad & Distribución de Índices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Promedio por Tipo de Propiedad */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Alquiler Promedio por Tipo</h3>
              <span className="block text-[10px] text-zinc-500">Monto medio según categoría de propiedad</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/60">
              <div>
                <span className="text-xs font-bold text-white block">Departamentos</span>
                <span className="text-[10px] text-zinc-550 mt-0.5 block">{countDeptos} activos</span>
              </div>
              <span className="font-mono text-sm font-bold text-white">{formatCurrency(promedioDeptos)}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/60">
              <div>
                <span className="text-xs font-bold text-white block">Locales Comerciales</span>
                <span className="text-[10px] text-zinc-550 mt-0.5 block">{countLocales} activos</span>
              </div>
              <span className="font-mono text-sm font-bold text-white">{formatCurrency(promedioLocales)}</span>
            </div>
          </div>
        </div>

        {/* Distribución de Índices de Ajuste */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-amber-450">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Distribución de Índices</h3>
              <span className="block text-[10px] text-zinc-500">Porcentaje y conteo de contratos por índice de actualización</span>
            </div>
          </div>

          <div className="space-y-3.5">
            {Object.keys(indexCounts).length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-4">No hay contratos activos para agrupar.</p>
            ) : (
              Object.entries(indexCounts).map(([idx, count]) => {
                const percentage = totalContratosActivos > 0 ? (count / totalContratosActivos) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white font-mono">{idx}</span>
                      <span className="text-zinc-450 font-mono">{count} {count === 1 ? 'contrato' : 'contratos'} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          idx === 'IPC' ? 'bg-blue-500' :
                          idx === 'ICL' ? 'bg-emerald-500' :
                          idx === 'CAC' ? 'bg-purple-500' : 'bg-zinc-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Property List Source Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h3 className="text-base font-bold text-white">Detalle de Renta por Propiedad</h3>
          <p className="text-xs text-zinc-400">Listado de ingresos individuales de cada contrato activo</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-semibold uppercase">
                <th className="pb-3 pl-2">Propiedad</th>
                <th className="pb-3">Inquilino</th>
                <th className="pb-3 text-center">Índice</th>
                <th className="pb-3 text-center">Frecuencia</th>
                <th className="pb-3 text-right">Renta Inicial</th>
                <th className="pb-3 text-right pr-2">Renta Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {properties.map((p) => {
                const activeC = p.contratos?.find((c) => new Date(c.fechaFin) >= hoy);
                return (
                  <tr key={p.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="py-3.5 pl-2 font-medium text-white">{p.nombre}</td>
                    <td className="py-3.5 text-xs text-zinc-300">
                      {activeC ? activeC.inquilinoNombre : 'Disponible'}
                    </td>
                    <td className="py-3.5 text-center font-mono text-xs text-zinc-450">
                      {activeC ? activeC.indiceActualizacion : '-'}
                    </td>
                    <td className="py-3.5 text-center text-xs text-zinc-500">
                      {activeC ? `Cada ${activeC.frecuenciaActualizacion} meses` : '-'}
                    </td>
                    <td className="py-3.5 text-right font-mono text-zinc-450">
                      {activeC ? formatCurrency(activeC.montoInicial) : '-'}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-white pr-2">
                      {activeC ? formatCurrency(activeC.montoActual) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Adjustments Log */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h3 className="text-base font-bold text-white">Historial Cronológico de Ajustes</h3>
          <p className="text-xs text-zinc-400">Aumentos e incrementos de renta aplicados a los contratos</p>
        </div>

        {allAdjustments.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-900 p-6 text-center text-xs text-zinc-500">
            No se han registrado aumentos de precios de alquiler en el sistema.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="pb-3 pl-2">Fecha</th>
                  <th className="pb-3">Propiedad</th>
                  <th className="pb-3">Inquilino</th>
                  <th className="pb-3 text-right">Renta Previa</th>
                  <th className="pb-3 text-right">Nueva Renta</th>
                  <th className="pb-3 text-center pr-2">Incremento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {allAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="py-3.5 pl-2 font-mono text-xs text-zinc-450">
                      {new Date(a.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-3.5 font-medium text-white">{a.propiedadNombre}</td>
                    <td className="py-3.5 text-xs text-zinc-400">{a.inquilinoNombre}</td>
                    <td className="py-3.5 text-right font-mono text-zinc-450">
                      {formatCurrency(a.montoPrevio)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-semibold text-white">
                      {formatCurrency(a.montoNuevo)}
                    </td>
                    <td className="py-3.5 text-center pr-2">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                        +{a.porcentaje}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
