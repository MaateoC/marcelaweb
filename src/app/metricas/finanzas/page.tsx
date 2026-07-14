'use client';

import React from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Briefcase,
  Wallet,
  CreditCard
} from 'lucide-react';

export default function MetricasFinanzasPage() {
  const currentMonth = '2026-07';
  const { analytics, isLoading } = useAnalytics(currentMonth);
  const activeWindow = 'mom';


  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Get comparison data dynamically from our updated API
  const comparison = analytics?.comparisons?.[activeWindow] || {
    period: 'Mensual (MoM)',
    ingresos: { actual: 0, anterior: 0, variacionPorcentual: 0 },
    gastos: { actual: 0, anterior: 0, variacionPorcentual: 0 },
    ahorros: { actual: 0, anterior: 0, variacionPorcentual: 0 },
    alquileres: { actual: 0, anterior: 0, variacionPorcentual: 0 },
    jubilacion: { actual: 0, anterior: 0, variacionPorcentual: 0 },
    categoriasGastos: [],
  };

  const getTrendStyles = (pct: number) => {
    const isIncrease = pct >= 0;
    return {
      color: isIncrease ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      icon: isIncrease ? TrendingUp : TrendingDown,
    };
  };

  const getIncomeTrendStyles = (pct: number) => {
    const isIncrease = pct >= 0;
    return {
      color: isIncrease ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5',
      icon: isIncrease ? TrendingUp : TrendingDown,
    };
  };

  const totalIngresos = comparison.ingresos.actual;
  const ingresosAlquiler = comparison.alquileres.actual;
  const ingresosJubilacion = comparison.jubilacion?.actual || 0;

  const pctAlquiler = totalIngresos > 0 ? (ingresosAlquiler / totalIngresos) * 100 : 0;
  const pctJubilacion = totalIngresos > 0 ? (ingresosJubilacion / totalIngresos) * 100 : 0;

  // Spend KPI metrics
  const totalGastos = comparison.gastos.actual;
  const gastosTarjetaPct = analytics?.current ? (analytics.current.gastosTarjeta / Math.max(analytics.current.gastos, 1)) * 100 : 0;
  const gastosVariablesPct = analytics?.current ? (analytics.current.gastosVariables / Math.max(analytics.current.gastos, 1)) * 100 : 0;

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Finanzas Personales</h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            Seguimiento y análisis comparativo mensual de ingresos y egresos.
          </p>
        </div>
      </div>

      {/* DIVIDER 1: CONTROL DE INGRESOS */}
      <div className="relative my-6 py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-850" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-black border border-zinc-800 rounded-full px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono shadow-inner shadow-black">
            1. Control de Ingresos
          </span>
        </div>
      </div>

      {/* SECTION 1: INGRESOS */}
      <div className="space-y-6">
        {/* Income KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Income */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-emerald-455">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Ingresos Totales</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  getIncomeTrendStyles(comparison.ingresos.variacionPorcentual).color
                }`}
              >
                {comparison.ingresos.variacionPorcentual >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {formatPercent(comparison.ingresos.variacionPorcentual)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-2xl font-bold text-white">
                {formatCurrency(totalIngresos)}
              </span>
              <span className="block text-[10px] text-zinc-500 font-medium">
                Suma de cobros de alquileres y jubilación
              </span>
            </div>
          </div>

          {/* Rental Income */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-indigo-400">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Cobro de Alquileres</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  getIncomeTrendStyles(comparison.alquileres.variacionPorcentual).color
                }`}
              >
                {comparison.alquileres.variacionPorcentual >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {formatPercent(comparison.alquileres.variacionPorcentual)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-2xl font-bold text-white">
                {formatCurrency(ingresosAlquiler)}
              </span>
              <span className="block text-[10px] text-zinc-500 font-medium">
                {pctAlquiler.toFixed(1)}% del total de ingresos
              </span>
            </div>
          </div>

          {/* Retirement Pension Income */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-amber-500">
                  <Briefcase className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Cobro de Jubilación</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  getIncomeTrendStyles(comparison.jubilacion?.variacionPorcentual || 0).color
                }`}
              >
                {(comparison.jubilacion?.variacionPorcentual || 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {formatPercent(comparison.jubilacion?.variacionPorcentual || 0)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-2xl font-bold text-white">
                {formatCurrency(ingresosJubilacion)}
              </span>
              <span className="block text-[10px] text-zinc-500 font-medium">
                {pctJubilacion.toFixed(1)}% del total de ingresos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DIVIDER 2: EGRESOS Y GASTOS */}
      <div className="relative my-6 py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-850" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-black border border-zinc-800 rounded-full px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono shadow-inner shadow-black">
            2. Control de Egresos y Gastos
          </span>
        </div>
      </div>

      {/* SECTION 2: EGRESOS Y GASTOS */}
      <div className="space-y-6">
        {/* Expenses KPI Card (Full width horizontal layout with CC / Variable details) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col justify-between md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Gastos Totales del Mes</h3>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                  Salida de dinero este mes, incluyendo servicios, compras y expensas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-bold text-white">
                {formatCurrency(totalGastos)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  getTrendStyles(comparison.gastos.variacionPorcentual).color
                }`}
              >
                {comparison.gastos.variacionPorcentual >= 0 ? '+' : ''}
                {formatPercent(comparison.gastos.variacionPorcentual)}
              </span>
            </div>
          </div>

          {/* Credit Card and Variable Expenses percentages */}
          {analytics?.current && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-900/60 pt-3.5 mt-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-2 font-medium">
                <CreditCard className="h-4 w-4 text-pink-400 shrink-0" />
                Pago con Tarjeta: <strong className="text-white font-mono">{gastosTarjetaPct.toFixed(1)}%</strong> ({formatCurrency(analytics.current.gastosTarjeta)})
              </span>
              <span className="flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4 text-emerald-400 shrink-0" />
                Gastos Variables / Efectivo: <strong className="text-white font-mono">{gastosVariablesPct.toFixed(1)}%</strong> ({formatCurrency(analytics.current.gastosVariables)})
              </span>
            </div>
          )}
        </div>

        {/* Categories Layout and Recent History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Historial Reciente de Gastos (T-2, T-1, T) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm font-sans">Historial Reciente de Gastos</h3>
                <span className="block text-[10px] text-zinc-500 font-medium">Comparación consecutiva mes a mes</span>
              </div>
            </div>

            {/* Consecutive list */}
            <div className="space-y-4 py-2 flex-1 overflow-y-auto max-h-[350px]">
              {analytics?.consecutiveMonths && analytics.consecutiveMonths.length > 0 ? (
                // Only show T-2, T-1, T (the last 3 items)
                analytics.consecutiveMonths.slice(-3).map((item: { mesNombre: string; gastos: number; variacionNominal: number; variacionPorcentual: number }, idx: number) => {
                  const isInc = item.variacionNominal > 0;
                  const isDec = item.variacionNominal < 0;
                  
                  return (
                    <div key={idx} className="border-b border-zinc-900/40 pb-3.5 last:border-0 last:pb-0 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold text-xs">{item.mesNombre}</span>
                        <span className="text-white font-mono font-bold text-sm">
                          {formatCurrency(item.gastos)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="text-zinc-500 font-medium">Egresos mensuales</span>
                        {item.variacionNominal !== 0 ? (
                          <span className={`font-semibold ${
                            isInc ? 'text-red-400' : isDec ? 'text-emerald-400' : 'text-zinc-500'
                          }`}>
                            Gastaste <span className="font-mono">{formatCurrency(Math.abs(item.variacionNominal))}</span> {isInc ? 'más' : 'menos'} ({isInc ? '+' : ''}{item.variacionPorcentual.toFixed(1)}%) que el mes anterior
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">Gastaste lo mismo que el mes anterior</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No hay datos históricos disponibles.
                </div>
              )}
            </div>
          </div>

          {/* Proyección de Tarjeta (Próximos Meses: T+1, T+2, T+3) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-pink-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm font-sans">Proyección de Tarjeta</h3>
                <span className="block text-[10px] text-zinc-500 font-medium">Gastos fijos + cuotas futuras</span>
              </div>
            </div>

            {/* Projections list */}
            <div className="space-y-4 py-2 flex-1 overflow-y-auto max-h-[350px]">
              {analytics?.cardProjections && analytics.cardProjections.length > 0 ? (
                analytics.cardProjections.map((item: { mesNombre: string; total: number; fijosMonto: number; cuotasMonto: number }, idx: number) => (
                  <div key={idx} className="border-b border-zinc-900/40 pb-3.5 last:border-0 last:pb-0 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold text-xs">{item.mesNombre}</span>
                      <span className="text-pink-400 font-mono font-bold text-sm">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
                      <span>Total proyectado</span>
                      <span>
                        Fijos: {formatCurrency(item.fijosMonto)} • Cuotas: {formatCurrency(item.cuotasMonto)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No hay proyecciones de tarjetas disponibles.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed table representing category changes */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 font-sans">
          <div>
            <h3 className="font-bold text-white text-sm font-sans">Variación Detallada de Gastos</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
              Desglose nominal y porcentual de los gastos comparados con el periodo anterior de la ventana elegida ({comparison.period})
            </p>
          </div>

          {/* Mobile Stack View (lg:hidden) */}
          <div className="lg:hidden">
            {comparison.categoriasGastos && comparison.categoriasGastos.length > 0 ? (
              <div className="space-y-3">
                {comparison.categoriasGastos.map((cat: any, idx: number) => {
                  const isInc = cat.variacionNominal > 0;
                  const isDec = cat.variacionNominal < 0;
                  return (
                    <div 
                      key={idx}
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/10 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {cat.categoria}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono ${
                            isInc
                              ? 'bg-red-500/5 border-red-500/10 text-red-400'
                              : isDec
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isInc ? '+' : ''}
                          {formatPercent(cat.variacionPorcentual)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-900/60 text-left">
                        <div>
                          <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Actual</span>
                          <span className="font-mono text-xs font-bold text-white mt-0.5 block">
                            {formatCurrency(cat.actual)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Anterior</span>
                          <span className="font-mono text-xs text-zinc-500 mt-0.5 block">
                            {formatCurrency(cat.anterior)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Var. Nominal</span>
                          <span
                            className={`font-mono text-xs font-bold mt-0.5 block ${
                              isInc ? 'text-red-400' : isDec ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            {isInc ? '+' : ''}
                            {formatCurrency(cat.variacionNominal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
                No hay datos cargados para comparar.
              </div>
            )}
          </div>

          {/* Desktop Table View (hidden lg:block) */}
          <div className="hidden lg:block overflow-x-auto font-sans">
            <table className="w-full text-left text-xs text-zinc-400">
              <thead className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                <tr>
                  <th className="pb-3 pr-4">Categoría</th>
                  <th className="pb-3 text-right">Gasto Actual</th>
                  <th className="pb-3 text-right">Gasto Anterior ({comparison.period.split(' ')[0]})</th>
                  <th className="pb-3 text-right">Var. Nominal</th>
                  <th className="pb-3 text-right">Var. Porcentual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 font-medium">
                {comparison.categoriasGastos && comparison.categoriasGastos.length > 0 ? (
                  comparison.categoriasGastos.map((cat: { categoria: string; actual: number; anterior: number; variacionNominal: number; variacionPorcentual: number }, idx: number) => {
                    const isInc = cat.variacionNominal > 0;
                    const isDec = cat.variacionNominal < 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{cat.categoria}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-mono text-white">
                          {formatCurrency(cat.actual)}
                        </td>
                        <td className="py-3.5 text-right font-mono text-zinc-500">
                          {formatCurrency(cat.anterior)}
                        </td>
                        <td
                          className={`py-3.5 text-right font-mono font-bold ${
                            isInc ? 'text-red-400' : isDec ? 'text-emerald-400' : 'text-zinc-500'
                          }`}
                        >
                          {isInc ? '+' : ''}
                          {formatCurrency(cat.variacionNominal)}
                        </td>
                        <td
                          className={`py-3.5 text-right font-mono font-bold`}
                        >
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                              isInc
                                ? 'bg-red-500/5 border-red-500/10 text-red-400'
                                : isDec
                                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isInc ? '+' : ''}
                            {formatPercent(cat.variacionPorcentual)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 font-mono">
                      No hay datos cargados para comparar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
