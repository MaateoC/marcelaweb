'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  PiggyBank,
  Trash2,
  History,
  Coins,
  ArrowUpRight,
  TrendingUp,
  Plus
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

interface BaseHoldings {
  ARS: number;
  USD: number;
}

export default function MetasAhorroPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrency, setNewGoalCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeAction, setActiveAction] = useState<{ goalId: string; type: 'CONTRIBUTION' | 'WITHDRAWAL' } | null>(null);
  const [actionAmount, setActionAmount] = useState('');

  // Base holdings state (cash/bank savings outside of specific goals)
  const [baseHoldings, setBaseHoldings] = useState<BaseHoldings>({ ARS: 500000, USD: 1200 });
  const [isEnteringTenencia, setIsEnteringTenencia] = useState(false);
  const [tenenciaAmount, setTenenciaAmount] = useState('');
  const [tenenciaCurrency, setTenenciaCurrency] = useState<'ARS' | 'USD'>('USD');

  useEffect(() => {
    // Load goals
    const storedGoals = localStorage.getItem('savings_goals');
    if (storedGoals) {
      try {
        setGoals(JSON.parse(storedGoals));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultGoals: SavingsGoal[] = [
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
      setGoals(defaultGoals);
      localStorage.setItem('savings_goals', JSON.stringify(defaultGoals));
    }

    // Load base holdings
    const storedHoldings = localStorage.getItem('savings_base_holdings');
    if (storedHoldings) {
      try {
        setBaseHoldings(JSON.parse(storedHoldings));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultHoldings = { ARS: 500000, USD: 1200 };
      setBaseHoldings(defaultHoldings);
      localStorage.setItem('savings_base_holdings', JSON.stringify(defaultHoldings));
    }
  }, []);

  // Listen for storage events to sync changes across pages
  useEffect(() => {
    const syncAll = () => {
      const storedGoals = localStorage.getItem('savings_goals');
      if (storedGoals) {
        try {
          setGoals(JSON.parse(storedGoals));
        } catch (e) {
          console.error(e);
        }
      }
      const storedHoldings = localStorage.getItem('savings_base_holdings');
      if (storedHoldings) {
        try {
          setBaseHoldings(JSON.parse(storedHoldings));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('storage', syncAll);
    return () => window.removeEventListener('storage', syncAll);
  }, []);

  const saveGoals = (updatedGoals: SavingsGoal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem('savings_goals', JSON.stringify(updatedGoals));
    window.dispatchEvent(new Event('storage'));
  };

  const saveBaseHoldings = (updatedHoldings: BaseHoldings) => {
    setBaseHoldings(updatedHoldings);
    localStorage.setItem('savings_base_holdings', JSON.stringify(updatedHoldings));
    window.dispatchEvent(new Event('storage'));
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
      currency: newGoalCurrency,
      transactions: []
    };

    const updated = [...goals, newGoal];
    saveGoals(updated);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrency('ARS');
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

  const handleTenenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenenciaAmount) return;
    const amount = parseFloat(tenenciaAmount);
    if (isNaN(amount) || amount < 0) return;

    const updated = { ...baseHoldings };
    updated[tenenciaCurrency] = amount;

    saveBaseHoldings(updated);
    setTenenciaAmount('');
    setIsEnteringTenencia(false);
  };

  const formatGoalCurrency = (amount: number, currency: 'ARS' | 'USD') => {
    if (currency === 'USD') {
      return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(amount);
  };

  // Calculate totals saved in goals
  const goalsTotals = useMemo(() => {
    let ars = 0;
    let usd = 0;
    goals.forEach((g) => {
      const current = g.transactions.reduce((sum, t) => t.type === 'CONTRIBUTION' ? sum + t.amount : sum - t.amount, 0);
      if (g.currency === 'USD') {
        usd += current;
      } else {
        ars += current;
      }
    });
    return { ars, usd };
  }, [goals]);

  // Compute Total Savings (Base Holdings + Sum of Goals Savings)
  const totalUSD = useMemo(() => {
    return baseHoldings.USD + goalsTotals.usd;
  }, [baseHoldings.USD, goalsTotals.usd]);

  const totalARS = useMemo(() => {
    return baseHoldings.ARS + goalsTotals.ars;
  }, [baseHoldings.ARS, goalsTotals.ars]);

  // Consolidate all transactions from all goals for the ledger
  const allLedgerTransactions = useMemo(() => {
    const list: { goalName: string; txId: string; type: 'CONTRIBUTION' | 'WITHDRAWAL'; amount: number; currency: 'ARS' | 'USD'; date: string }[] = [];
    goals.forEach(g => {
      g.transactions.forEach(t => {
        list.push({
          goalName: g.name,
          txId: t.id,
          type: t.type,
          amount: t.amount,
          currency: g.currency,
          date: t.date
        });
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [goals]);

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Metas de Ahorro</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestiona tus reservas y capital de ahorro total en Pesos y Dólares
          </p>
        </div>

        {/* Action Button: Ingresar Tenencia */}
        <button
          onClick={() => setIsEnteringTenencia(!isEnteringTenencia)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 px-4 py-2.5 text-sm font-bold text-white transition-all shadow-lg cursor-pointer"
        >
          {isEnteringTenencia ? 'Cancelar' : 'Ingresar tenencia libre'}
        </button>
      </div>

      {/* Tenencia Form (Conditional Drawer) */}
      {isEnteringTenencia && (
        <form onSubmit={handleTenenciaSubmit} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 max-w-xl animate-in slide-in-from-top-3 duration-250">
          <div>
            <h3 className="text-sm font-bold text-white">Ingresar Tenencia Libre</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Ingresa capital ahorrado libre (fuera de las metas de ahorro, ej. efectivo o saldo bancario)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-550">Moneda</label>
              <select
                value={tenenciaCurrency}
                onChange={(e) => setTenenciaCurrency(e.target.value as 'ARS' | 'USD')}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="USD">Dólares (USD)</option>
                <option value="ARS">Pesos (ARS)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-550">Monto</label>
              <input
                type="number"
                required
                min="0"
                placeholder="Ej. 2000"
                value={tenenciaAmount}
                onChange={(e) => setTenenciaAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              Guardar tenencia libre
            </button>
          </div>
        </form>
      )}

      {/* Premium Savings Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Total USD Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Ahorro Total en Dólares</span>
            <h2 className="font-mono text-3xl sm:text-4xl font-bold text-white mt-2">
              {formatGoalCurrency(totalUSD, 'USD')}
            </h2>
            <div className="flex items-center gap-4 text-xs text-zinc-450 font-medium pt-3 mt-3 border-t border-zinc-900">
              <span>Tenencia libre: <strong className="text-zinc-300">{formatGoalCurrency(baseHoldings.USD, 'USD')}</strong></span>
              <span className="text-zinc-700">|</span>
              <span>En metas: <strong className="text-zinc-300">{formatGoalCurrency(goalsTotals.usd, 'USD')}</strong></span>
            </div>
          </div>
          <div className="absolute right-6 top-6 h-12 w-12 flex items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-all">
            <Coins className="h-6 w-6" />
          </div>
        </div>

        {/* Total ARS Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Ahorro Total en Pesos</span>
            <h2 className="font-mono text-3xl sm:text-4xl font-bold text-white mt-2">
              {formatGoalCurrency(totalARS, 'ARS')}
            </h2>
            <div className="flex items-center gap-4 text-xs text-zinc-450 font-medium pt-3 mt-3 border-t border-zinc-900">
              <span>Tenencia libre: <strong className="text-zinc-300">{formatGoalCurrency(baseHoldings.ARS, 'ARS')}</strong></span>
              <span className="text-zinc-700">|</span>
              <span>En metas: <strong className="text-zinc-300">{formatGoalCurrency(goalsTotals.ars, 'ARS')}</strong></span>
            </div>
          </div>
          <div className="absolute right-6 top-6 h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-all">
            <PiggyBank className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main split details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (7 cols): Goals List */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-amber-500">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Tus Metas de Ahorro</h3>
                <p className="text-xs text-zinc-400">Progreso acumulado y objetivo fijado</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-all duration-200"
            >
              {isAddingGoal ? 'Cancelar' : '+ Nueva Meta'}
            </button>
          </div>

          {/* Form: Add Goal */}
          {isAddingGoal && (
            <form onSubmit={handleCreateGoal} className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 space-y-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Crear Nueva Meta</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-zinc-550">Moneda</label>
                  <select
                    value={newGoalCurrency}
                    onChange={(e) => setNewGoalCurrency(e.target.value as 'ARS' | 'USD')}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ARS">Pesos ($)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-zinc-550">Nombre de la Meta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Viaje a Europa"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-zinc-550">Monto Objetivo</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={newGoalCurrency === 'USD' ? "Ej. 5000" : "Ej. 3500000"}
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition"
                >
                  Confirmar
                </button>
              </div>
            </form>
          )}

          {/* Form: Contribute / Withdraw */}
          {activeAction && (
            <form onSubmit={handleActionSubmit} className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {activeAction.type === 'CONTRIBUTION' ? 'Registrar Aporte' : 'Registrar Retiro'} a "{goals.find(g => g.id === activeAction.goalId)?.name}"
              </h4>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-550">
                    Monto en {goals.find(g => g.id === activeAction.goalId)?.currency}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500">
                      {goals.find(g => g.id === activeAction.goalId)?.currency === 'USD' ? 'USD' : '$'}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ej. 150"
                      value={actionAmount}
                      onChange={(e) => setActionAmount(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-12 pr-3 text-xs text-white placeholder-zinc-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setActiveAction(null); setActionAmount(''); }}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-zinc-400 hover:border-zinc-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white transition ${
                      activeAction.type === 'CONTRIBUTION' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-650 hover:bg-emerald-500'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List of Goals */}
          <div className="space-y-6">
            {goals.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No tienes metas configuradas.</p>
            ) : (
              goals.map(g => {
                const currentSaved = g.transactions.reduce((sum, t) => t.type === 'CONTRIBUTION' ? sum + t.amount : sum - t.amount, 0);
                const progress = Math.min((currentSaved / g.targetAmount) * 100, 100);
                return (
                  <div key={g.id} className="space-y-3.5 border-b border-zinc-900 pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{g.name}</h4>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold ${
                            g.currency === 'USD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {g.currency}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-550 block font-mono mt-0.5">
                          Objetivo: {formatGoalCurrency(g.targetAmount, g.currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveAction({ goalId: g.id, type: 'CONTRIBUTION' })}
                          className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                        >
                          Aportar
                        </button>
                        <button
                          onClick={() => setActiveAction({ goalId: g.id, type: 'WITHDRAWAL' })}
                          className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-450 hover:bg-emerald-550/20 transition-all duration-200"
                        >
                          Retirar
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 p-1 text-red-400 hover:bg-red-500/20 transition-all duration-200 ml-1.5"
                          title="Eliminar Meta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span className="font-mono text-white">{formatGoalCurrency(currentSaved, g.currency)} ahorrado</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): History Ledger logs */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-purple-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Historial de Ahorros</h3>
              <p className="text-xs text-zinc-400 font-medium">Historial cronológico de aportes y retiros</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {allLedgerTransactions.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No se registran movimientos en tus metas.</p>
            ) : (
              allLedgerTransactions.map((tx) => {
                const isContribution = tx.type === 'CONTRIBUTION';
                return (
                  <div key={tx.txId} className="flex items-center justify-between p-3 rounded-xl border border-zinc-900 bg-zinc-950/60 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-white block truncate">{tx.goalName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(tx.date).toLocaleDateString('es-AR')} - {new Date(tx.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`font-mono font-bold shrink-0 pl-3 ${isContribution ? 'text-blue-450' : 'text-emerald-450'}`}>
                      {isContribution ? '+' : '-'}{formatGoalCurrency(tx.amount, tx.currency)}
                    </span>
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
