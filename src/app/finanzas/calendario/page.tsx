'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/hooks/useTransactions';
import { useProperties } from '@/hooks/useProperties';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  tipo: 'ALQUILER' | 'IMPUESTO' | 'SUSCRIPCION';
  nombre: string;
  detalle: string;
  monto: number;
  dia: number;
  isPaid: boolean;
  pagoId?: string;
  propiedadId?: string;
  subcategoria?: string;
  categoria?: string;
  gastoFijoId?: string;
}

export default function CalendarioPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isTaxesLoading, setIsTaxesLoading] = useState<boolean>(true);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState<boolean>(true);

  // Fetch configured taxes from DB
  const fetchTaxes = async () => {
    setIsTaxesLoading(true);
    try {
      const res = await fetch('/api/impuestos');
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTaxesLoading(false);
    }
  };

  const fetchFixedExpenses = async () => {
    setIsExpensesLoading(true);
    try {
      const res = await fetch('/api/finanzas/gastos-fijos');
      if (res.ok) {
        const data = await res.json();
        setFixedExpenses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExpensesLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
    fetchFixedExpenses();
  }, []);

  // Set selectedDay to today's date if selected month matches today's month, otherwise default to day 1
  useEffect(() => {
    const today = new Date();
    const todayYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (selectedMonth === todayYearMonth) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [selectedMonth]);

  // Fetch all transactions for the month
  const { transactions, isLoading: isTxsLoading } = useTransactions({
    month: selectedMonth,
  });

  // Fetch properties (to compute rent payment due days)
  const { properties, isLoading: isPropsLoading } = useProperties();

  const isLoading = isTxsLoading || isPropsLoading || isTaxesLoading || isExpensesLoading;

  // Build list of calendar events (configured taxes + rent payments)
  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    // 1. Rent collections from active contracts
    if (properties) {
      properties.forEach((p) => {
        p.contratos?.forEach((c) => {
          const monthlyPayment = c.pagos?.find((pay) => pay.mesReferencia === selectedMonth);
          if (monthlyPayment) {
            // Due day based on contract start date (1-28 clamp)
            const startDate = new Date(c.fechaInicio);
            const dueDay = Math.min(Math.max(startDate.getUTCDate(), 1), 28);
            const isPaid = monthlyPayment.estado === 'PAGADO';

            list.push({
              id: `rent-${monthlyPayment.id}`,
              tipo: 'ALQUILER',
              nombre: `Cobro: ${c.inquilinoNombre}`,
              detalle: p.nombre,
              monto: c.montoActual,
              dia: dueDay,
              isPaid,
              pagoId: monthlyPayment.id,
              propiedadId: p.id,
              categoria: 'Alquileres',
              subcategoria: p.tipo === 'LOCAL' ? 'Locales Comerciales' : 'Departamentos'
            });
          }
        });
      });
    }

    // 2. Configured taxes and services due dates
    taxes.forEach((tax) => {
      const subcat = tax.subcategoria || tax.nombre;
      const paymentTx = transactions.find(
        (t) => t.tipo === 'GASTO' && t.subcategoria === subcat
      );
      const isPaid = !!paymentTx;
      const actualAmount = isPaid ? paymentTx.monto : tax.montoSugerido;

      list.push({
        id: `tax-${tax.id}`,
        tipo: 'IMPUESTO',
        nombre: tax.nombre,
        detalle: tax.descripcion || 'Servicio/Impuesto',
        monto: actualAmount,
        dia: tax.diaVencimiento,
        isPaid,
        subcategoria: subcat,
        categoria: tax.categoria
      });
    });

    // 3. Active fixed expenses/subscriptions
    fixedExpenses.forEach((gasto) => {
      const paymentTx = transactions.find(
        (t) => t.tipo === 'GASTO' && t.gastoFijoId === gasto.id
      );
      const isPaid = !!paymentTx;
      const actualAmount = isPaid ? paymentTx.monto : gasto.monto;

      list.push({
        id: `fixed-${gasto.id}`,
        tipo: 'SUSCRIPCION',
        nombre: `Suscripción: ${gasto.nombre}`,
        detalle: gasto.tarjeta ? `Tarjeta: ${gasto.tarjeta.nombre}` : 'Pago Directo',
        monto: actualAmount,
        dia: gasto.diaPago,
        isPaid,
        gastoFijoId: gasto.id,
        categoria: gasto.categoria,
        subcategoria: 'Gastos Fijos'
      });
    });

    return list;
  }, [properties, taxes, fixedExpenses, transactions, selectedMonth]);

  // Filter events of the selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((e) => e.dia === selectedDay);
  }, [events, selectedDay]);

  // Compute month layout: start day of week & total days
  const calendarGrid = useMemo(() => {
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    // Argentina: Week starts on Monday
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, monthNum, 0).getDate();

    const grid: { day: number | null; isCurrentMonth: boolean }[] = [];

    // Empty cells at start
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ day: null, isCurrentMonth: false });
    }

    // Real days
    for (let d = 1; d <= totalDays; d++) {
      grid.push({ day: d, isCurrentMonth: true });
    }

    // Empty cells at end
    while (grid.length % 7 !== 0) {
      grid.push({ day: null, isCurrentMonth: false });
    }

    return grid;
  }, [selectedMonth]);

  // Handler to perform quick pay/quick collect when clicking on pending items
  const handleEventClick = async (event: CalendarEvent) => {
    if (event.isPaid) {
      alert(`El evento "${event.nombre}" ya está registrado como cobrado/pagado.`);
      return;
    }

    const confirmMsg = event.tipo === 'ALQUILER'
      ? `¿Registrar cobro de alquiler de "${event.nombre}" por $${event.monto.toLocaleString('es-AR')}?`
      : event.tipo === 'SUSCRIPCION'
        ? `¿Registrar pago de la suscripción/gasto fijo "${event.nombre.replace('Suscripción: ', '')}" por $${event.monto.toLocaleString('es-AR')}?`
        : `¿Registrar pago de tasa/servicio "${event.nombre}" por $${event.monto.toLocaleString('es-AR')}?`;

    if (window.confirm(confirmMsg)) {
      try {
        const payload = {
          tipo: event.tipo === 'ALQUILER' ? 'INGRESO' : 'GASTO',
          monto: event.monto,
          descripcion: event.tipo === 'ALQUILER' 
            ? `Cobro Alquiler - ${event.nombre}`
            : event.tipo === 'SUSCRIPCION'
              ? `[Suscripción] ${event.nombre.replace('Suscripción: ', '')}`
              : `Pago ${event.nombre} - Periodo ${selectedMonth}`,
          fecha: `${selectedMonth}-${String(event.dia).padStart(2, '0')}`,
          categoria: event.categoria,
          subcategoria: event.subcategoria || null,
          pagoId: event.pagoId || null,
          propiedadId: event.propiedadId || null,
          gastoFijoId: event.gastoFijoId || null
        };

        const res = await fetch('/api/transacciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          window.location.reload();
        } else {
          alert('Error al registrar movimiento');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }
  };

  const getNextPaymentDate = (evt: CalendarEvent) => {
    const [year, m] = selectedMonth.split('-').map(Number);
    let targetMonth = m - 1; // 0-indexed month
    if (evt.isPaid) {
      targetMonth += 1; // if paid, next due is next month
    }
    const nextDate = new Date(year, targetMonth, evt.dia);
    return nextDate.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Parse human readable selected month label
  const selectedMonthLabel = useMemo(() => {
    const months: Record<string, string> = {
      '05': 'Mayo',
      '06': 'Junio',
      '07': 'Julio',
      '08': 'Agosto'
    };
    const [_, m] = selectedMonth.split('-');
    return months[m] || 'Mes';
  }, [selectedMonth]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarIcon className="h-5 w-5" />
            </span>
            Calendario de Vencimientos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Visualización mensual integrada de cobros de alquileres y vencimientos de servicios
          </p>
        </div>

        {/* Filters and Back Link */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/finanzas"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>

          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:border-zinc-700 cursor-pointer shadow-lg shadow-black/20"
            >
              <option value="2026-05">Mayo 2026</option>
              <option value="2026-06">Junio 2026</option>
              <option value="2026-07">Julio 2026</option>
              <option value="2026-08">Agosto 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend Dots Guide */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center gap-4.5 text-[11px] font-semibold text-zinc-400 select-none">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span>Alquiler Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Servicio / Impuesto Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>Gasto Fijo / Suscripción Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Completado / Pagado</span>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
          {events.filter(e => !e.isPaid).length} pendientes
        </span>
      </div>

      {/* Main split dashboard layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2/3 width): Mobile-Optimized Grid Calendar */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
              {/* Weekday Titles Header */}
              <div className="grid grid-cols-7 border-b border-zinc-900 bg-zinc-900/30 text-center py-2.5 select-none">
                {weekdays.map((day) => (
                  <span key={day} className="text-xs font-bold text-zinc-400">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 bg-zinc-950 divide-x divide-y divide-zinc-900/60">
                {calendarGrid.map((cell, index) => {
                  const dayEvents = cell.day 
                    ? events.filter((e) => e.dia === cell.day) 
                    : [];

                  const isSelected = cell.day !== null && selectedDay === cell.day;

                  return (
                    <div
                      key={index}
                      onClick={() => cell.day !== null && setSelectedDay(cell.day)}
                      className={`h-[72px] sm:h-[84px] p-1.5 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                        cell.isCurrentMonth 
                          ? isSelected
                            ? 'bg-zinc-900 border-2 border-blue-500/80 z-10 shadow-lg shadow-blue-500/10'
                            : 'bg-zinc-950 hover:bg-zinc-900/30' 
                          : 'bg-zinc-900/10 text-zinc-700 pointer-events-none'
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex justify-between items-start select-none">
                        {cell.day ? (
                          <span className={`font-mono text-xs font-bold leading-none ${
                            isSelected ? 'text-blue-400' : 'text-zinc-500'
                          }`}>
                            {cell.day}
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>

                      {/* Day Event Dots (Mobile-friendly indicator) */}
                      <div className="flex flex-wrap gap-1 items-center justify-center pb-1">
                        {dayEvents.map((evt) => (
                          <span
                            key={evt.id}
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              evt.isPaid
                                ? 'bg-emerald-400 shadow shadow-emerald-400/20'
                                : evt.tipo === 'ALQUILER'
                                ? 'bg-blue-400 shadow shadow-blue-400/20'
                                : evt.tipo === 'SUSCRIPCION'
                                ? 'bg-purple-400 shadow shadow-purple-400/20'
                                : 'bg-amber-400 shadow shadow-amber-400/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width): Selected Day details panel (stacks below calendar on mobile) */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
            {/* Header selection info */}
            <div className="border-b border-zinc-900 pb-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Detalle del Día
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {selectedDay ? `${selectedDay} de ${selectedMonthLabel}` : 'Selecciona un día'}
              </h3>
            </div>

            {/* List of events on selectedDay */}
            {isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Info className="h-8 w-8 text-zinc-700 mb-2.5 animate-pulse" />
                <p className="text-xs font-semibold text-zinc-500">Sin vencimientos programados</p>
                <p className="text-[10px] text-zinc-600 mt-1">Este día no tiene servicios ni alquileres registrados</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {selectedDayEvents.map((evt) => {
                  return (
                    <div
                      key={evt.id}
                      className={`flex flex-col p-4 rounded-xl border transition-all duration-150 ${
                        evt.isPaid
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : evt.tipo === 'ALQUILER'
                          ? 'border-blue-500/20 bg-blue-500/5'
                          : evt.tipo === 'SUSCRIPCION'
                          ? 'border-purple-500/20 bg-purple-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                      }`}
                    >
                      {/* Name & status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white leading-tight">
                          {evt.nombre}
                        </span>
                        {evt.isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 shrink-0">
                            Cobrado/Pagado
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold shrink-0 ${
                            evt.tipo === 'ALQUILER'
                              ? 'bg-blue-500/10 text-blue-400'
                              : evt.tipo === 'SUSCRIPCION'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-zinc-500 mt-1">{evt.detalle}</p>

                      {/* Next Payment Due Date (Next Vto) */}
                      {evt.tipo === 'SUSCRIPCION' && (
                        <div className="mt-2 text-[10px] flex items-center gap-1 font-mono">
                          <span className="text-zinc-550">Próximo Vto:</span>
                          <span className={evt.isPaid ? 'text-zinc-500' : 'text-purple-400 font-semibold'}>
                            {getNextPaymentDate(evt)}
                          </span>
                        </div>
                      )}

                      {/* Money and Pay Button */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900/60">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">Monto</span>
                          <span className="font-mono text-sm font-bold text-white">
                            {formatCurrency(evt.monto)}
                          </span>
                        </div>

                        {!evt.isPaid && (
                          <button
                            onClick={() => handleEventClick(evt)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-500 active:scale-95 cursor-pointer shadow-md shadow-blue-600/10"
                          >
                            {evt.tipo === 'ALQUILER' ? 'Cobrar' : 'Pagar'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
