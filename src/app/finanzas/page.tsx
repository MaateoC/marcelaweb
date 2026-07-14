'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useProperties } from '@/hooks/useProperties';
import { TransactionForm } from '@/components/finanzas/TransactionForm';
import { formatCurrency } from '@/lib/utils';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Activity,
  Plus,
  TrendingDown
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
  currency: 'ARS' | 'USD';
  transactions: GoalTransaction[];
}

function FinanzasPageContent() {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'INGRESO' | 'GASTO'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('savings_goals');
    if (stored) {
      try {
        setGoals(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Defaults if not found
      const defaults: SavingsGoal[] = [
        {
          id: 'goal-1',
          name: 'Cambiar el auto',
          targetAmount: 15000,
          currency: 'USD',
          transactions: [
            { id: 't-1', type: 'CONTRIBUTION', amount: 3000, date: '2026-05-15T12:00:00Z' },
            { id: 't-2', type: 'CONTRIBUTION', amount: 1500, date: '2026-06-10T12:00:00Z' },
            { id: 't-3', type: 'CONTRIBUTION', amount: 500, date: '2026-07-02T12:00:00Z' }
          ]
        },
        {
          id: 'goal-2',
          name: 'Fondo de emergencia',
          targetAmount: 3000000,
          currency: 'ARS',
          transactions: [
            { id: 't-4', type: 'CONTRIBUTION', amount: 1000050, date: '2026-06-20T12:00:00Z' },
            { id: 't-5', type: 'CONTRIBUTION', amount: 200000, date: '2026-07-05T12:00:00Z' }
          ]
        }
      ];
      localStorage.setItem('savings_goals', JSON.stringify(defaults));
      setGoals(defaults);
    }
  }, []);

  // Listen for storage events to sync changes across pages
  useEffect(() => {
    const syncGoals = () => {
      const stored = localStorage.getItem('savings_goals');
      if (stored) {
        try {
          setGoals(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('storage', syncGoals);
    return () => window.removeEventListener('storage', syncGoals);
  }, []);

  // Fetch all transactions for the selected month
  const { transactions: allTransactions, isLoading: isTxsLoading } = useTransactions({
    month: selectedMonth,
  });

  const { properties, isLoading: isPropsLoading } = useProperties();

  const isLoading = isTxsLoading || isPropsLoading;

  // Process pending rent payments for the selected month to link collections
  const pendingPayments = useMemo(() => {
    if (!properties) return [];
    const list: { id: string; label: string; contractId: string; propiedadId: string; monto: number }[] = [];
    properties.forEach((p) => {
      p.contratos?.forEach((c) => {
        const fin = new Date(c.fechaFin);
        const hoy = new Date();
        if (fin >= hoy) {
          c.pagos?.forEach((pay) => {
            if (pay.estado === 'IMPAGO') {
              list.push({
                id: pay.id,
                label: `${p.nombre} - Mes ${pay.mesReferencia} (${c.inquilinoNombre})`,
                contractId: c.id,
                propiedadId: p.id,
                monto: c.montoActual,
              });
            }
          });
        }
      });
    });
    return list;
  }, [properties]);


  // Filter transactions based on Search input and Type filters (Exclude AHORRO completely)
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (tx.tipo === 'AHORRO') {
        return false;
      }
      if (typeFilter !== 'TODOS' && tx.tipo !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = tx.descripcion.toLowerCase().includes(query);
        const matchesCat = tx.categoria.toLowerCase().includes(query);
        const matchesSubcat = tx.subcategoria?.toLowerCase().includes(query) || false;
        const matchesProp = tx.propiedad?.nombre.toLowerCase().includes(query) || false;
        return matchesDesc || matchesCat || matchesSubcat || matchesProp;
      }
      return true;
    });
  }, [allTransactions, typeFilter, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;

    allTransactions.forEach((tx) => {
      if (tx.tipo === 'INGRESO') ingresos += tx.monto;
      else if (tx.tipo === 'GASTO') gastos += tx.monto;
    });

    return {
      ingresos,
      gastos,
      balance: ingresos - gastos,
    };
  }, [allTransactions]);

  // Calculate net monthly savings allocations for selectedMonth in ARS equivalent
  const totalAhorroNetoMes = useMemo(() => {
    let sum = 0;
    goals.forEach((g) => {
      const contMes = g.transactions
        .filter((t) => t.date.includes(selectedMonth) && t.type === 'CONTRIBUTION')
        .reduce((s, t) => s + t.amount, 0);
      const retMes = g.transactions
        .filter((t) => t.date.includes(selectedMonth) && t.type === 'WITHDRAWAL')
        .reduce((s, t) => s + t.amount, 0);
      const netMes = contMes - retMes;
      const multiplier = g.currency === 'USD' ? 1000 : 1;
      sum += (netMes * multiplier);
    });
    return sum;
  }, [goals, selectedMonth]);

  const balanceLiquido = useMemo(() => {
    return totals.ingresos - totals.gastos - totalAhorroNetoMes;
  }, [totals.ingresos, totals.gastos, totalAhorroNetoMes]);

  // Calculate category totals (Only for GASTO type transactions)
  const categoryTotals = useMemo(() => {
    const totalsMap: Record<string, number> = {};
    allTransactions.forEach((tx) => {
      if (tx.tipo === 'GASTO') {
        totalsMap[tx.categoria] = (totalsMap[tx.categoria] || 0) + tx.monto;
      }
    });

    return Object.entries(totalsMap)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [allTransactions]);

  const [formTriggerKey, setFormTriggerKey] = useState<number>(0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Finanzas Personales</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestión y control de caja, cobros de alquileres y servicios
          </p>
        </div>
        
        {/* Actions & Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Period Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-zinc-700 cursor-pointer shadow-lg shadow-black/20"
            >
              <option value="2026-05">Mayo 2026</option>
              <option value="2026-06">Junio 2026</option>
              <option value="2026-07">Julio 2026</option>
              <option value="2026-08">Agosto 2026</option>
            </select>
          </div>

          {/* "+ Registrar Movimiento" button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4.5 w-4.5" /> Registrar Movimiento
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Incomes Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Ingresos del Mes</span>
            <h3 className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
              {formatCurrency(totals.ingresos)}
            </h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Gastos del Mes</span>
            <h3 className="font-mono text-xl sm:text-2xl font-bold text-red-400">
              {formatCurrency(totals.gastos)}
            </h3>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <ArrowDownRight className="h-6 w-6" />
          </div>
        </div>

        {/* Surplus / Balance Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Balance Líquido</span>
            <h3 className={`font-mono text-xl sm:text-2xl font-bold ${balanceLiquido >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
              {balanceLiquido >= 0 ? '+' : ''}{formatCurrency(balanceLiquido)}
            </h3>
            {totalAhorroNetoMes !== 0 && (
              <span className="block text-[10px] text-zinc-500 font-mono">
                Ahorro del mes: {totalAhorroNetoMes >= 0 ? '-' : '+'}{formatCurrency(Math.abs(totalAhorroNetoMes))}
              </span>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${balanceLiquido >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main split dashboard layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2/3 width): Searchable activity feed list */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Advanced Search & Filtering Bar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              
              {/* Text Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por descripción, categoría..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
                />
              </div>

              {/* Type Filters tabs */}
              <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl overflow-x-auto shrink-0 select-none">
                {(['TODOS', 'INGRESO', 'GASTO'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      typeFilter === type
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type === 'TODOS' ? 'Todos' : type === 'INGRESO' ? 'Ingresos' : 'Gastos'}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Premium Activity Feed List */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Historial de Movimientos</h3>
                <p className="text-xs text-zinc-400">Flujo de caja del periodo seleccionado</p>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                {filteredTransactions.length} registros
              </span>
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6.5 w-6.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Activity className="h-10 w-10 text-zinc-600 animate-pulse mb-3" />
                <p className="text-sm font-semibold text-zinc-400">No se encontraron movimientos</p>
                <p className="text-xs text-zinc-500 mt-1">Prueba cambiando el mes o las palabras del buscador</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => {
                  const isIngreso = tx.tipo === 'INGRESO';
                  
                  return (
                    <div
                      key={tx.id}
                      className="flex items-start justify-between p-4 rounded-xl border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/30 hover:border-zinc-800 transition-all duration-200 group"
                    >
                      {/* Left Side: Icon and Description */}
                      <div className="flex items-start gap-3.5">
                        
                        {/* Transaction Icon Box */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                            isIngreso
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/15'
                              : 'bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500/15'
                          }`}
                        >
                          {isIngreso ? (
                            <ArrowUpRight className="h-5.5 w-5.5" />
                          ) : (
                            <ArrowDownRight className="h-5.5 w-5.5" />
                          )}
                        </div>

                        {/* Title and categories details */}
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white truncate text-sm leading-snug group-hover:text-blue-400 transition-colors">
                            {tx.descripcion}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center rounded-md bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                              {tx.categoria}
                            </span>
                            {tx.subcategoria && (
                              <span className="text-[10px] text-zinc-500 font-medium">
                                › {tx.subcategoria}
                              </span>
                            )}
                            {tx.propiedad && (
                              <span className="inline-flex items-center rounded-md bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                {tx.propiedad.nombre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Amount and Date */}
                      <div className="flex flex-col items-end shrink-0 pl-4 pt-0.5 space-y-1">
                        <span
                          className={`font-mono text-sm sm:text-base font-bold tracking-tight ${
                            isIngreso ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {!isIngreso ? '-' : ''}
                          {formatCurrency(tx.monto)}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(tx.fecha).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width): Expenses Category Summary & Collapsible Tax Panel */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Category Expenses Summary Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white">Gastos por Categoría</h3>
                <p className="text-xs text-zinc-400">Distribución mensual de consumos</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            
            {categoryTotals.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No hay gastos registrados en este periodo
              </p>
            ) : (
              <div className="space-y-4">
                {categoryTotals.map(({ categoria, total }) => {
                  const percent = totals.gastos > 0 ? (total / totals.gastos) * 100 : 0;
                  return (
                    <div key={categoria} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-300">{categoria}</span>
                        <span className="font-mono text-white">{formatCurrency(total)}</span>
                      </div>
                      {/* Bar indicator */}
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Modal overlay for creating transactions */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-lg animate-in zoom-in-95 duration-200"
          >
            <TransactionForm
              key={formTriggerKey}
              properties={properties}
              pendingPayments={pendingPayments}
              onCancel={() => setIsModalOpen(false)}
              onSuccess={() => {
                setFormTriggerKey((prev) => prev + 1);
                setIsModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinanzasPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <FinanzasPageContent />
    </Suspense>
  );
}
