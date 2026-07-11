'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  ArrowRight, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Info, 
  Scale, 
  Sparkles, 
  Building2, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface IndexPoint {
  fecha: string; // YYYY-MM-DD
  valor: number;
}

interface IndicesResponse {
  icl: IndexPoint[];
  ipc: IndexPoint[];
  cac: IndexPoint[];
}

interface SimulationStep {
  monthIndex: number; // 1-indexed
  dateStr: string; // Mes Año
  rentValue: number;
  isAdjustment: boolean;
  adjustmentPct: number;
  adjustmentValue: number;
  indexStartVal: number;
  indexEndVal: number;
  isProjected: boolean;
}

interface IndexSimulationResult {
  schedule: SimulationStep[];
  totalCashflow: number;
  averageRent: number;
  totalIncreasePct: number;
  totalIncreaseValue: number;
  averageMonthlyRateUsed: number;
}

export default function SimulacionPage() {
  // Inputs
  const [ultimoCobrado, setUltimoCobrado] = useState<number>(200000);
  const [fechaInicioStr, setFechaInicioStr] = useState<string>('2024-01-01');
  const [duracion, setDuracion] = useState<number>(24);
  const [frecuencia, setFrecuencia] = useState<number>(6);
  const [indicePactado, setIndicePactado] = useState<'icl' | 'ipc' | 'cac'>('icl');

  // Indicators Data State
  const [indicesData, setIndicesData] = useState<IndicesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation Results
  const [simResults, setSimResults] = useState<Record<'icl' | 'ipc' | 'cac', IndexSimulationResult> | null>(null);

  useEffect(() => {
    async function loadIndices() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/finanzas/indices');
        if (!res.ok) {
          throw new Error('Error al cargar la serie de índices');
        }
        const data: IndicesResponse = await res.json();
        setIndicesData(data);
      } catch (err: any) {
        setError(err.message || 'Error de red al cargar índices.');
      } finally {
        setLoading(false);
      }
    }
    loadIndices();
  }, []);

  // Run simulation whenever inputs or data changes
  useEffect(() => {
    if (!indicesData) return;
    
    const results = {
      icl: runSimulationForIndex('icl'),
      ipc: runSimulationForIndex('ipc'),
      cac: runSimulationForIndex('cac'),
    };
    
    setSimResults(results);
  }, [indicesData, ultimoCobrado, fechaInicioStr, duracion, frecuencia]);

  // Math Helper: Find average growth of last 3 months of historical data
  function calculateAverageMonthlyRate(series: IndexPoint[]): number {
    if (series.length < 90) return 0.03; // default fallback 3% monthly
    
    // Sort chronological
    const sorted = [...series].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const latest = sorted[sorted.length - 1];
    const latestDate = new Date(latest.fecha);
    
    // Find point roughly 3 months ago (90 days)
    const threeMonthsAgoDate = new Date(latestDate);
    threeMonthsAgoDate.setMonth(threeMonthsAgoDate.getMonth() - 3);
    
    let threeMonthsAgoPoint = sorted.find(p => new Date(p.fecha).getTime() >= threeMonthsAgoDate.getTime());
    if (!threeMonthsAgoPoint) {
      threeMonthsAgoPoint = sorted[Math.max(0, sorted.length - 90)];
    }
    
    const ratio = latest.valor / threeMonthsAgoPoint.valor;
    // Compounded monthly rate: (latest / ago)^(1/3) - 1
    const monthlyRate = Math.pow(ratio, 1 / 3) - 1;
    return isNaN(monthlyRate) || monthlyRate <= 0 ? 0.025 : monthlyRate;
  }

  // Math Helper: Get index value for any target date
  function getIndexValueForDate(
    series: IndexPoint[], 
    targetDate: Date, 
    avgMonthlyRate: number
  ): { valor: number; isProjected: boolean } {
    const sorted = [...series].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const latest = sorted[sorted.length - 1];
    const latestDate = new Date(latest.fecha);

    // If targetDate is in the past or present (less than or equal to latest historical date)
    if (targetDate.getTime() <= latestDate.getTime()) {
      // Find the closest date
      let closest = sorted[0];
      let minDiff = Math.abs(targetDate.getTime() - new Date(closest.fecha).getTime());
      
      for (const p of sorted) {
        const diff = Math.abs(targetDate.getTime() - new Date(p.fecha).getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      return { valor: closest.valor, isProjected: false };
    } else {
      // Date is in the future, project it using average rate
      const diffTime = targetDate.getTime() - latestDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4375); // average days in month
      const projectedVal = latest.valor * Math.pow(1 + avgMonthlyRate, diffMonths);
      return { valor: projectedVal, isProjected: true };
    }
  }

  function runSimulationForIndex(indexKey: 'icl' | 'ipc' | 'cac'): IndexSimulationResult {
    const series = indicesData ? indicesData[indexKey] : [];
    const avgRate = calculateAverageMonthlyRate(series);
    const startDate = new Date(fechaInicioStr + 'T00:00:00');

    const schedule: SimulationStep[] = [];
    let currentRent = ultimoCobrado;
    
    // We store the index value at the start of each adjustment period
    // In Month 1, the index value corresponds to the startDate
    const startIdxResult = getIndexValueForDate(series, startDate, avgRate);
    let lastPeriodIndexVal = startIdxResult.valor;

    for (let m = 0; m < duracion; m++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + m);
      
      const mesNombre = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      const formattedMes = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);

      // Check if it's an adjustment month (every X months, but not the 1st month)
      const isAdjustmentMonth = m > 0 && m % frecuencia === 0;

      let isProjected = false;
      let adjustmentPct = 0;
      let adjustmentValue = 0;
      let indexStartVal = lastPeriodIndexVal;
      let indexEndVal = lastPeriodIndexVal;

      if (isAdjustmentMonth) {
        // Calculate update index values
        const idxResult = getIndexValueForDate(series, currentDate, avgRate);
        indexEndVal = idxResult.valor;
        isProjected = idxResult.isProjected;

        // Formula: Rent = PreviousRent * (IndexEnd / IndexStart)
        const previousRent = currentRent;
        const factor = indexEndVal / lastPeriodIndexVal;
        currentRent = Math.round(ultimoCobrado * (indexEndVal / startIdxResult.valor)); // Cumulative from start is standard COCIR rule
        
        // Calculate adjustment metrics
        adjustmentValue = currentRent - previousRent;
        adjustmentPct = parseFloat(((currentRent - previousRent) / previousRent * 100).toFixed(2));
        
        // Update variables for the next period
        lastPeriodIndexVal = indexEndVal;
      } else {
        // Look up index value for information
        const idxResult = getIndexValueForDate(series, currentDate, avgRate);
        indexEndVal = idxResult.valor;
        isProjected = idxResult.isProjected;
      }

      schedule.push({
        monthIndex: m + 1,
        dateStr: formattedMes,
        rentValue: currentRent,
        isAdjustment: isAdjustmentMonth,
        adjustmentPct,
        adjustmentValue,
        indexStartVal,
        indexEndVal,
        isProjected
      });
    }

    // Totals calculations
    const totalCashflow = schedule.reduce((sum, step) => sum + step.rentValue, 0);
    const averageRent = totalCashflow / duracion;
    const initialRent = schedule[0].rentValue;
    const finalRent = schedule[schedule.length - 1].rentValue;
    const totalIncreaseValue = finalRent - initialRent;
    const totalIncreasePct = parseFloat(((finalRent - initialRent) / initialRent * 100).toFixed(2));

    return {
      schedule,
      totalCashflow,
      averageRent,
      totalIncreasePct,
      totalIncreaseValue,
      averageMonthlyRateUsed: avgRate
    };
  }

  // Format Helper for month/year title
  const getIndexName = (key: 'icl' | 'ipc' | 'cac') => {
    switch (key) {
      case 'icl': return 'ICL (Contratos BCRA)';
      case 'ipc': return 'IPC (Inflación INDEC)';
      case 'cac': return 'CAC (Cámara Construcción)';
    }
  };

  const getIndexDescription = (key: 'icl' | 'ipc' | 'cac') => {
    switch (key) {
      case 'icl': return 'Fórmula combinada 50% inflación (IPC) y 50% salarios (RIPTE). Tradicional para viviendas bajo ley anterior.';
      case 'ipc': return 'Índice de Precios al Consumidor. Refleja directamente el poder adquisitivo y el costo de vida.';
      case 'cac': return 'Índice del Costo de la Construcción. Tradicional para fideicomisos, refacciones y oficinas comerciales.';
    }
  };

  const getIndexBadgeStyle = (key: 'icl' | 'ipc' | 'cac') => {
    switch (key) {
      case 'icl': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ipc': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cac': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const getIndexTextColor = (key: 'icl' | 'ipc' | 'cac') => {
    switch (key) {
      case 'icl': return 'text-blue-400';
      case 'ipc': return 'text-emerald-400';
      case 'cac': return 'text-amber-400';
    }
  };

  const getIndexBorderColor = (key: 'icl' | 'ipc' | 'cac') => {
    switch (key) {
      case 'icl': return 'border-blue-500/30';
      case 'ipc': return 'border-emerald-500/30';
      case 'cac': return 'border-amber-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-blue-500" />
        <p className="text-sm text-zinc-400 font-medium">Cargando series históricas del COCIR y Argly...</p>
      </div>
    );
  }

  if (error || !indicesData) {
    return (
      <div className="rounded-2xl border border-red-900 bg-red-950/20 p-6 max-w-lg mx-auto mt-10">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertCircle className="h-6 w-6" />
          <h3 className="text-base font-bold">Error al inicializar la calculadora</h3>
        </div>
        <p className="text-sm text-zinc-300 mb-6">
          No pudimos conectar con los servidores de índices financieros en tiempo real.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-zinc-900 text-white rounded-xl py-2 text-xs font-semibold hover:bg-zinc-800 border border-zinc-800 transition"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  const selectedResult = simResults ? simResults[indicePactado] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Eyebrow & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest font-mono">
            Administración / Alquileres
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-400" /> Simulación de Contratos
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-xl">
            Calculadora estadística avanzada. Compara ICL, IPC y CAC usando el historial real del Banco Central (BCRA) e INDEC.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-[10px] text-emerald-400 font-semibold w-fit self-start md:self-center">
          <Sparkles className="h-3 w-3" />
          <span>Índices actualizados en tiempo real</span>
        </div>
      </div>

      {/* Main Grid: Form Left, Metrics Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Card */}
        <div className="lg:col-span-1 rounded-2xl border border-zinc-900 bg-zinc-950 p-6 space-y-5 h-fit shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Scale className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Parámetros del Alquiler</h3>
          </div>

          {/* Monto Inicial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">Último Alquiler Cobrado (ARS)</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSign className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="number"
                value={ultimoCobrado}
                onChange={(e) => setUltimoCobrado(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm font-semibold font-mono text-white focus:border-zinc-700 focus:outline-none transition-colors"
                placeholder="200000"
              />
            </div>
          </div>

          {/* Fecha de Inicio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">Fecha del Último Cobro / Ajuste</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="date"
                min="2023-01-01"
                max="2027-12-31"
                value={fechaInicioStr}
                onChange={(e) => setFechaInicioStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-4 text-sm font-semibold text-white focus:border-zinc-700 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Frecuencia de Actualización */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">Frecuencia de Actualización</label>
            <select
              value={frecuencia}
              onChange={(e) => setFrecuencia(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-sm font-semibold text-white focus:border-zinc-700 focus:outline-none transition-colors cursor-pointer"
            >
              <option value={3}>Cada 3 meses (Trimestral)</option>
              <option value={4}>Cada 4 meses (Cuatrimestral)</option>
              <option value={6}>Cada 6 meses (Semestral)</option>
              <option value={12}>Cada 12 meses (Anual)</option>
            </select>
          </div>

          {/* Duración */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">Duración del Contrato</label>
            <select
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-sm font-semibold text-white focus:border-zinc-700 focus:outline-none transition-colors cursor-pointer"
            >
              <option value={12}>12 meses (1 Año)</option>
              <option value={24}>24 meses (2 Años)</option>
              <option value={36}>36 meses (3 Años)</option>
            </select>
          </div>

          {/* Índice Pactado */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-400">Índice Principal a Simular</label>
            <div className="grid grid-cols-3 gap-2">
              {(['icl', 'ipc', 'cac'] as const).map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIndicePactado(idx)}
                  className={`border rounded-xl py-2 text-xs font-bold transition-all uppercase ${
                    indicePactado === idx
                      ? idx === 'icl'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/50'
                        : idx === 'ipc'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/50'
                      : 'border-zinc-800 bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  {idx}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
              {getIndexDescription(indicePactado)}
            </p>
          </div>
        </div>

        {/* Right Column: Simulation Metrics & Comparisons */}
        <div className="lg:col-span-2 space-y-6">
          {selectedResult && (
            <>
              {/* Primary Simulation Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Flujo de caja */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Flujo Total Contrato
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {formatCurrency(selectedResult.totalCashflow)}
                  </div>
                  <span className="text-[9px] text-zinc-600 block">Suma de todos los meses de alquiler</span>
                </div>

                {/* Alquiler Promedio */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Valor Promedio Mensual
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {formatCurrency(selectedResult.averageRent)}
                  </div>
                  <span className="text-[9px] text-zinc-600 block">Monto medio ponderado</span>
                </div>

                {/* Aumento Final */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Aumento Acumulado Final
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1">
                    +{selectedResult.totalIncreasePct}%
                  </div>
                  <span className="text-[9px] text-zinc-500 block font-semibold font-mono">
                    +{formatCurrency(selectedResult.totalIncreaseValue)} final
                  </span>
                </div>
              </div>

              {/* Comparative Index Analysis (Signature Element) */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Comparativa Cruzada de Índices
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500">Mismos parámetros ({duracion}m, act. cada {frecuencia}m)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['icl', 'ipc', 'cac'] as const).map((key) => {
                    const res = simResults?.[key];
                    if (!res) return null;
                    const isSelected = key === indicePactado;

                    return (
                      <div 
                        key={key} 
                        onClick={() => setIndicePactado(key)}
                        className={`rounded-xl border p-4 cursor-pointer transition-all duration-300 space-y-3 relative overflow-hidden group ${
                          isSelected
                            ? getIndexBorderColor(key) + ' bg-zinc-900/40 shadow-inner'
                            : 'border-zinc-900 bg-transparent hover:border-zinc-800 hover:bg-zinc-900/10'
                        }`}
                      >
                        {/* Glow on Selected */}
                        {isSelected && (
                          <div className={`absolute top-0 right-0 w-2 h-2 rounded-bl-lg ${
                            key === 'icl' ? 'bg-blue-500' : key === 'ipc' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                        )}

                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase ${getIndexTextColor(key)}`}>
                            {key}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            Proy: {(res.averageMonthlyRateUsed * 100).toFixed(2)}%/m
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Total Recaudado</span>
                          <span className="text-base font-bold font-mono text-white block mt-0.5">
                            {formatCurrency(res.totalCashflow)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] border-t border-zinc-900 pt-2 text-zinc-400">
                          <span>Aumento final:</span>
                          <span className="font-semibold font-mono text-white">+{res.totalIncreasePct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Helpful Note about Projections */}
                <div className="flex items-start gap-2.5 rounded-xl bg-zinc-900/30 border border-zinc-900 p-3 text-[10px] text-zinc-500 leading-relaxed">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-400">Método de Proyección Estadístico: </span>
                    Los meses futuros sin datos publicados se proyectan automáticamente en base a la tasa de variación mensual real promedio de los últimos 3 meses: 
                    <span className="font-mono text-zinc-300 ml-1">
                      ICL: {((simResults?.icl.averageMonthlyRateUsed || 0) * 100).toFixed(2)}% | 
                      IPC: {((simResults?.ipc.averageMonthlyRateUsed || 0) * 100).toFixed(2)}% | 
                      CAC: {((simResults?.cac.averageMonthlyRateUsed || 0) * 100).toFixed(2)}%
                    </span>.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Visual Rent Steps Bar Chart */}
      {selectedResult && (
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
            <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Escalones de Alquiler</h3>
          </div>

          <div className="space-y-4">
            {/* Visual Steps */}
            <div className="h-40 flex items-end gap-1.5 border-b border-zinc-900 pb-2 pt-4">
              {selectedResult.schedule.map((step) => {
                // Calculate height percentage relative to final max rent
                const maxRent = selectedResult.schedule[selectedResult.schedule.length - 1].rentValue;
                const heightPct = (step.rentValue / maxRent) * 100;
                
                return (
                  <div 
                    key={step.monthIndex} 
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute mb-28 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-300 font-mono shadow-xl transition-all duration-200 pointer-events-none z-10 text-center">
                      <div className="font-semibold text-white">{step.dateStr}</div>
                      <div className="mt-1 font-bold text-blue-400">{formatCurrency(step.rentValue)}</div>
                      {step.isAdjustment && (
                        <div className="text-emerald-400 text-[9px] mt-0.5">+{step.adjustmentPct}% de aumento</div>
                      )}
                      <div className="text-zinc-500 text-[8px] mt-0.5">{step.isProjected ? 'Proyectado' : 'Histórico'}</div>
                    </div>

                    {/* Bar */}
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all duration-300 cursor-pointer ${
                        step.isAdjustment 
                          ? 'bg-blue-500 hover:bg-blue-400' 
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      } ${step.isProjected ? 'opacity-50' : 'opacity-100'}`}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* X Axis Labels */}
            <div className="flex justify-between text-[9px] text-zinc-500 px-1 font-mono">
              <span>Mes 1 ({selectedResult.schedule[0]?.dateStr})</span>
              <span>Mes {Math.floor(duracion / 2)}</span>
              <span>Mes {duracion} ({selectedResult.schedule[duracion - 1]?.dateStr})</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Rent Schedule Table */}
      {selectedResult && (
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-lg shadow-black/20 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Cronograma Detallado Ajuste por Ajuste
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded" />
                <span>Mes de Ajuste</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-zinc-800 rounded opacity-50" />
                <span>Valor Proyectado</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-400 font-bold">
                  <th className="py-3 px-4 text-center w-12">Mes</th>
                  <th className="py-3 px-4">Periodo / Fecha</th>
                  <th className="py-3 px-4 text-right">Valor Alquiler</th>
                  <th className="py-3 px-4 text-right">Aumento Aplicado</th>
                  <th className="py-3 px-4 text-center">Índices (Base → Actual)</th>
                  <th className="py-3 px-4 text-center">Estado del Índice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {selectedResult.schedule.map((step) => {
                  const isFirst = step.monthIndex === 1;
                  
                  return (
                    <tr 
                      key={step.monthIndex} 
                      className={`hover:bg-zinc-900/20 transition ${
                        step.isAdjustment 
                          ? 'bg-blue-500/5 font-semibold border-l-2 border-blue-500' 
                          : ''
                      }`}
                    >
                      {/* Month Index */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-400">
                        {step.monthIndex}
                      </td>

                      {/* Period Date */}
                      <td className="py-3.5 px-4 text-white">
                        {step.dateStr}
                      </td>

                      {/* Rent Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(step.rentValue)}
                      </td>

                      {/* Adjustment details */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {step.isAdjustment ? (
                          <div className="flex flex-col items-end">
                            <span className="text-emerald-400 font-bold">
                              +{formatCurrency(step.adjustmentValue)}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-semibold">
                              ({step.adjustmentPct}%)
                            </span>
                          </div>
                        ) : isFirst ? (
                          <span className="text-zinc-600 italic">Valor Inicial</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Indices details */}
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                        {step.isAdjustment ? (
                          <div className="flex items-center justify-center gap-1.5 text-[11px]">
                            <span>{step.indexStartVal.toFixed(2)}</span>
                            <ArrowRight className="h-3 w-3 text-zinc-600" />
                            <span className="text-white font-bold">{step.indexEndVal.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">{step.indexEndVal.toFixed(2)}</span>
                        )}
                      </td>

                      {/* State (Projected or historical) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${
                          step.isProjected
                            ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {step.isProjected ? 'Proyectado' : 'Histórico'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
