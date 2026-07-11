'use client';

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  PieChart,
  Briefcase,
  Tv,
  Car,
  Utensils,
  CreditCard,
  HelpCircle,
  Wallet,
  Gift
} from 'lucide-react';

interface GoalTransaction {
  id: string;
  type: 'CONTRIBUTION' | 'WITHDRAWAL';
  amount: number;
  date: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  transactions: GoalTransaction[];
}

const getCategoryStyles = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (
    name.includes('regalo') ||
    name.includes('presente') ||
    name.includes('donacion')
  ) {
    return {
      icon: Gift,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      barColor: 'bg-purple-500',
    };
  }
  if (
    name.includes('servicio') ||
    name.includes('impuesto') ||
    name.includes('luz') ||
    name.includes('gas') ||
    name.includes('agua') ||
    name.includes('tgi') ||
    name.includes('api') ||
    name.includes('epe')
  ) {
    return {
      icon: Tv,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      barColor: 'bg-sky-500',
    };
  }
  if (
    name.includes('comida') ||
    name.includes('supermercado') ||
    name.includes('alimento') ||
    name.includes('restaurante') ||
    name.includes('compras') ||
    name.includes('salida')
  ) {
    return {
      icon: Utensils,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'bg-emerald-500',
    };
  }
  if (
    name.includes('transporte') ||
    name.includes('auto') ||
    name.includes('combustible') ||
    name.includes('nafta') ||
    name.includes('colectivo')
  ) {
    return {
      icon: Car,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      barColor: 'bg-amber-500',
    };
  }
  if (
    name.includes('tarjeta') ||
    name.includes('compras') ||
    name.includes('shopping') ||
    name.includes('gasto') ||
    name.includes('indumentaria') ||
    name.includes('ropa')
  ) {
    return {
      icon: CreditCard,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      barColor: 'bg-pink-500',
    };
  }
  if (
    name.includes('fijo') ||
    name.includes('expensa') ||
    name.includes('alquiler') ||
    name.includes('expensas')
  ) {
    return {
      icon: Briefcase,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      barColor: 'bg-indigo-500',
    };
  }
  return {
    icon: HelpCircle,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    barColor: 'bg-zinc-500',
  };
};

const getMonthName = (monthNum: number) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNum - 1] || '';
};

export default function MetricasFinanzasPage() {
  const currentMonth = '2026-07';
  const { analytics, isLoading } = useAnalytics(currentMonth);
  const activeWindow = 'mom';

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeAction, setActiveAction] = useState<{ goalId: string; type: 'CONTRIBUTION' | 'WITHDRAWAL' } | null>(null);
  const [actionAmount, setActionAmount] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('savings_goals');
    if (stored) {
      try {
        setGoals(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaults: SavingsGoal[] = [
        {
          id: 'goal-1',
          name: 'Cambiar el auto',
          targetAmount: 12000000,
          transactions: [
            { id: 't-1', type: 'CONTRIBUTION', amount: 3000000, date: '2026-05-15T12:00:00Z' },
            { id: 't-2', type: 'CONTRIBUTION', amount: 1500000, date: '2026-06-10T12:00:00Z' },
            { id: 't-3', type: 'CONTRIBUTION', amount: 500000, date: '2026-07-02T12:00:00Z' }
          ]
        },
        {
          id: 'goal-2',
          name: 'Fondo de emergencia',
          targetAmount: 3000000,
          transactions: [
            { id: 't-4', type: 'CONTRIBUTION', amount: 1000050, date: '2026-06-20T12:00:00Z' },
            { id: 't-5', type: 'CONTRIBUTION', amount: 200000, date: '2026-07-05T12:00:00Z' }
          ]
        }
      ];
      setGoals(defaults);
      localStorage.setItem('savings_goals', JSON.stringify(defaults));
    }
  }, []);

  const saveGoals = (updatedGoals: SavingsGoal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem('savings_goals', JSON.stringify(updatedGoals));
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget) return;
    const target = parseFloat(newGoalTarget);
    if (isNaN(target) || target <= 0) return;

    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: target,
      transactions: []
    };

    const updated = [...goals, newGoal];
    saveGoals(updated);
    setNewGoalName('');
    setNewGoalTarget('');
    setIsAddingGoal(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('¿Estás segura de que quieres eliminar esta meta de ahorro?')) {
      const updated = goals.filter(g => g.id !== id);
      saveGoals(updated);
    }
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || !actionAmount) return;
    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updated = goals.map(g => {
      if (g.id === activeAction.goalId) {
        const newTransaction: GoalTransaction = {
          id: `tx-${Date.now()}`,
          type: activeAction.type,
          amount: amount,
          date: new Date().toISOString()
        };
        return {
          ...g,
          transactions: [...g.transactions, newTransaction]
        };
      }
      return g;
    });

    saveGoals(updated);
    setActiveAction(null);
    setActionAmount('');
  };

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

  // Calculate net monthly savings allocations for 2026-07
  let totalAhorroNetoMes = 0;
  goals.forEach(g => {
    const contMes = g.transactions
      .filter(t => t.date.includes('2026-07') && t.type === 'CONTRIBUTION')
      .reduce((sum, t) => sum + t.amount, 0);
    const retMes = g.transactions
      .filter(t => t.date.includes('2026-07') && t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.amount, 0);
    totalAhorroNetoMes += (contMes - retMes);
  });

  const ingresosLiquidos = totalIngresos - totalGastos - totalAhorroNetoMes;

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Categories breakdown */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-blue-400">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm font-sans">Distribución por Categorías</h3>
                <span className="block text-[10px] text-zinc-500">Monto actual y porcentaje sobre total</span>
              </div>
            </div>

            {/* Categories list */}
            <div className="space-y-4 py-2 flex-1 overflow-y-auto max-h-[350px]">
              {comparison.categoriasGastos && comparison.categoriasGastos.length > 0 ? (
                comparison.categoriasGastos.map((cat: any, idx: number) => {
                  const sharePct = totalGastos > 0 ? (cat.actual / totalGastos) * 100 : 0;
                  const styles = getCategoryStyles(cat.categoria);
                  const CatIcon = styles.icon;
                  return (
                    <div key={idx} className="space-y-1.5 border-b border-zinc-900/40 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between text-xs font-medium items-center">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${styles.color}`}>
                            <CatIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-white font-semibold">{cat.categoria}</span>
                        </div>
                        <span className="text-zinc-400 font-mono text-[11px]">
                          {formatCurrency(cat.actual)} ({sharePct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className={`h-full ${styles.barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No se registran gastos para este periodo.
                </div>
              )}
            </div>
          </div>

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
                analytics.consecutiveMonths.slice(-3).map((item: any, idx: number) => {
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
                analytics.cardProjections.map((item: any, idx: number) => (
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

          <div className="overflow-x-auto font-sans">
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
                  comparison.categoriasGastos.map((cat: any, idx: number) => {
                    const isInc = cat.variacionNominal > 0;
                    const isDec = cat.variacionNominal < 0;
                    return (
                      <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3.5 pr-4 flex items-center gap-2">
                          <span className="text-white font-semibold">{cat.categoria}</span>
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

      {/* DIVIDER 3: BALANCE Y METAS DE AHORRO */}
      <div className="relative my-6 py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-850" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-black border border-zinc-800 rounded-full px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono shadow-inner shadow-black">
            3. Balance Líquido y Metas de Ahorro
          </span>
        </div>
      </div>

      {/* SECTION 3: BALANCE Y METAS DE AHORRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Balance Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Balance Líquido del Mes</h3>
              <span className="block text-[10px] text-zinc-500 font-mono">Julio 2026 • Estado de caja</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-2.5 p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 font-mono">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>(+) Ingresos Totales</span>
                <span className="text-emerald-450 font-semibold">+{formatCurrency(totalIngresos)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>(-) Gastos Totales</span>
                <span className="text-red-450 font-semibold">-{formatCurrency(totalGastos)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 border-b border-zinc-900 pb-2.5 mb-1">
                <span>(-) Ahorro Neto Destinado a Metas</span>
                <span className={`font-semibold ${totalAhorroNetoMes >= 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {totalAhorroNetoMes >= 0 ? '-' : '+'}{formatCurrency(Math.abs(totalAhorroNetoMes))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-white font-bold pt-1">
                <span>(=) Balance Líquido</span>
                <span className={ingresosLiquidos >= 0 ? 'text-white' : 'text-red-400'}>
                  {formatCurrency(ingresosLiquidos)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic text-center">
              El balance líquido representa tus ingresos menos los gastos del mes y el capital neto que has reservado/retirado para tus metas de ahorro.
            </p>
          </div>
        </div>

        {/* Savings Goals Manager (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-amber-500">
                <Briefcase className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Metas de Ahorro</h3>
                <span className="block text-[10px] text-zinc-500">Planifica, contribuye y retira fondos para tus proyectos</span>
              </div>
            </div>

            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
            >
              {isAddingGoal ? 'Cancelar' : 'Nueva Meta'}
            </button>
          </div>

          {/* Form to add a new goal */}
          {isAddingGoal && (
            <form onSubmit={handleCreateGoal} className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/30 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nueva Meta de Ahorro</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400">Nombre de la Meta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cambiar el auto, Viaje..."
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400">Monto Objetivo ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 5000000"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-all duration-200"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          )}

          {/* Form to contribute or withdraw */}
          {activeAction && (
            <form onSubmit={handleActionSubmit} className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/30 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {activeAction.type === 'CONTRIBUTION' ? 'Realizar Aporte' : 'Realizar Retiro'} a "{goals.find(g => g.id === activeAction.goalId)?.name}"
              </h4>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400">Monto ($)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 100000"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setActiveAction(null); setActionAmount(''); }}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:border-zinc-700 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition-all duration-200 ${
                      activeAction.type === 'CONTRIBUTION' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Goals List */}
          <div className="space-y-6">
            {goals.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No tienes metas de ahorro configuradas.</p>
            ) : (
              goals.map((g) => {
                const current = g.transactions.reduce((sum, t) => t.type === 'CONTRIBUTION' ? sum + t.amount : sum - t.amount, 0);
                const progressPct = Math.min((current / g.targetAmount) * 100, 100);
                return (
                  <div key={g.id} className="space-y-2 border-b border-zinc-900/60 pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{g.name}</h4>
                        <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
                          Objetivo: {formatCurrency(g.targetAmount)}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setActiveAction({ goalId: g.id, type: 'CONTRIBUTION' })}
                          className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                        >
                          Aportar
                        </button>
                        <button
                          onClick={() => setActiveAction({ goalId: g.id, type: 'WITHDRAWAL' })}
                          className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
                        >
                          Retirar
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all duration-200 ml-2"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                        <span className="font-mono">{formatCurrency(current)} ahorrado</span>
                        <span>{progressPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
