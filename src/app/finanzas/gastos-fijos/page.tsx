'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ToggleLeft, ToggleRight, Trash2, Calendar, CreditCard, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Tarjeta {
  id: string;
  nombre: string;
}

interface GastoFijo {
  id: string;
  nombre: string;
  categoria: string;
  monto: number;
  diaPago: number;
  tarjetaId: string | null;
  tarjeta: Tarjeta | null;
  estado: string; // "ACTIVO" | "INACTIVO"
}

export default function GastosFijosPage() {
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [diaPago, setDiaPago] = useState('10');
  const [categoria, setCategoria] = useState('Servicios');
  const [tarjetaId, setTarjetaId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [gastosRes, tarjetasRes, txsRes] = await Promise.all([
        fetch('/api/finanzas/gastos-fijos'),
        fetch('/api/configuracion/tarjetas'),
        fetch('/api/transacciones'),
      ]);

      if (gastosRes.ok) {
        const gastosData = await gastosRes.json();
        setGastosFijos(gastosData);
      }
      if (tarjetasRes.ok) {
        const tarjetasData = await tarjetasRes.json();
        setTarjetas(tarjetasData);
      }
      if (txsRes.ok) {
        const txsData = await txsRes.json();
        setTransactions(txsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !monto || Number(monto) <= 0) {
      alert('Por favor, completa el nombre y un monto válido.');
      return;
    }

    const diaNum = Number(diaPago);
    if (diaNum < 1 || diaNum > 31) {
      alert('El día de pago debe ser entre 1 y 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/finanzas/gastos-fijos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          monto: Number(monto),
          diaPago: diaNum,
          categoria,
          tarjetaId: tarjetaId || null,
        }),
      });

      if (res.ok) {
        setNombre('');
        setMonto('');
        setTarjetaId('');
        setShowAddModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar el gasto fijo');
      }
    } catch (err) {
      alert('Error al registrar el gasto fijo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (gasto: GastoFijo) => {
    const nuevoEstado = gasto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const res = await fetch('/api/finanzas/gastos-fijos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gasto.id,
          estado: nuevoEstado,
        }),
      });

      if (res.ok) {
        // Trigger transactions api evaluation by fetching transactions list
        await fetch('/api/transacciones');
        fetchData();
      }
    } catch (err) {
      alert('Error al actualizar el estado');
    }
  };

  const handleDeleteGasto = async (id: string) => {
    if (!confirm('¿Estás segura de eliminar este gasto fijo?')) {
      return;
    }

    try {
      const res = await fetch(`/api/finanzas/gastos-fijos?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Error al eliminar el gasto');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculations
  const activeGastos = gastosFijos.filter((g) => g.estado === 'ACTIVO');
  const totalMensualProyectado = activeGastos.reduce((sum, g) => sum + g.monto, 0);
  const totalSuscripcionesActivas = activeGastos.length;

  // Filter credit card installments from active/future months (July 2026 onwards)
  const startOfCurrentMonth = new Date(2026, 6, 1); // July 1st 2026
  const activeInstallments = transactions.filter((t) => 
    t.tipo === 'GASTO' && 
    t.medioPago === 'CREDITO' && 
    t.cuotasTotal !== null && 
    t.cuotasTotal > 1 && 
    new Date(t.fecha) >= startOfCurrentMonth
  );
  activeInstallments.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Dynamically calculate totals for the next 6 months starting from July 2026 (current + 5 future months)
  const getProjections = () => {
    const months = [];
    const baseYear = 2026;
    const baseMonth = 6; // July (zero-indexed)
    
    // Sum of active fixed expenses
    const activeFixedExpensesTotal = gastosFijos
      .filter((g) => g.estado === 'ACTIVO')
      .reduce((sum, g) => sum + g.monto, 0);

    for (let i = 0; i <= 5; i++) {
      const targetDate = new Date(baseYear, baseMonth + i, 1);
      const year = targetDate.getFullYear();
      const monthIdx = targetDate.getMonth();
      const monthName = targetDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      const installmentsTotal = transactions
        .filter((t) => {
          if (t.tipo !== 'GASTO' || t.medioPago !== 'CREDITO' || t.cuotasTotal === null || t.cuotasTotal <= 1) {
            return false;
          }
          const d = new Date(t.fecha);
          return d.getFullYear() === year && d.getMonth() === monthIdx;
        })
        .reduce((sum, t) => sum + t.monto, 0);
        
      const total = installmentsTotal + activeFixedExpensesTotal;
        
      months.push({
        label: capitalizedMonth,
        total,
        installmentsTotal,
        fixedExpensesTotal: activeFixedExpensesTotal,
        isCurrent: i === 0
      });
    }
    return months;
  };

  const monthlyProjections = getProjections();

  // Construct the unified list of all scheduled commitments (Fixed subscriptions + installments)
  const getUnifiedItems = () => {
    const activeSubs = gastosFijos
      .filter((g) => g.estado === 'ACTIVO')
      .map((g) => ({
        id: g.id,
        tipo: 'DEBITO',
        descripcion: g.nombre,
        categoria: g.categoria,
        tarjetaNombre: g.tarjeta ? g.tarjeta.nombre : 'Débito Directo',
        cuotaTexto: 'Recurrente',
        monto: g.monto,
        fechaTexto: `Día ${g.diaPago} de cada mes`,
        recargo: '-'
      }));

    const activeInsts = activeInstallments.map((tx) => ({
      id: tx.id,
      tipo: 'CUOTA',
      descripcion: tx.descripcion.replace(/^\[Cuota \d+\/\d+\]\s*/, ''),
      categoria: tx.categoria,
      tarjetaNombre: tx.tarjeta?.nombre || 'Tarjeta de Crédito',
      cuotaTexto: `${tx.cuotaNumero} / ${tx.cuotasTotal}`,
      monto: tx.monto,
      fechaTexto: new Date(tx.fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      recargo: tx.recargo !== null && tx.recargo > 0 ? `${tx.recargo}%` : 'Sin recargo'
    }));

    return [...activeSubs, ...activeInsts];
  };

  const unifiedItems = getUnifiedItems();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header with Top Right Button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <Link
            href="/finanzas"
            className="flex w-fit items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a Finanzas
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Gastos Fijos y Suscripciones</h1>
          <p className="text-xs sm:text-sm text-zinc-455">
            Monitorea tus suscripciones y débitos recurrentes con cobro automatizado en tu flujo de caja
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/10"
        >
          <Plus className="h-4.5 w-4.5" />
          Nuevo Gasto Fijo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-2 shadow-sm">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Mensual Proyectado</span>
          <span className="text-3xl font-bold font-mono text-white">
            {formatCurrency(totalMensualProyectado)}
          </span>
          <span className="text-[10px] text-zinc-550">
            Suma total estimada de débitos fijos recurrentes a cobrar este mes
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-2 shadow-sm">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Suscripciones Activas</span>
          <span className="text-3xl font-bold font-mono text-blue-450">
            {totalSuscripcionesActivas}
          </span>
          <span className="text-[10px] text-zinc-550">
            Servicios recurrentes activos con débito automático
          </span>
        </div>
      </div>

      {/* Mis Suscripciones Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mis Suscripciones y Débitos</h3>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-zinc-900 bg-zinc-950/20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : gastosFijos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-zinc-900 bg-zinc-950/10 text-zinc-550 space-y-3">
            <RefreshCw className="h-10 w-10 text-zinc-700 animate-pulse" />
            <span className="text-xs">No tienes gastos fijos o suscripciones registradas.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gastosFijos.map((gasto) => (
              <div
                key={gasto.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 h-52 bg-zinc-950 ${
                  gasto.estado === 'ACTIVO'
                    ? 'border-zinc-800 hover:border-zinc-700 shadow-md'
                    : 'border-zinc-900/60 opacity-60'
                }`}
              >
                {/* Header: Name and category */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-base font-bold text-white tracking-wide block truncate max-w-[150px]">
                      {gasto.nombre}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleEstado(gasto)}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title={gasto.estado === 'ACTIVO' ? 'Desactivar suscripción' : 'Activar suscripción'}
                      >
                        {gasto.estado === 'ACTIVO' ? (
                          <ToggleRight className="h-6 w-6 text-blue-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-zinc-650" />
                        )}
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteGasto(gasto.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-zinc-900 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    {gasto.categoria}
                  </span>
                </div>

                {/* Amount */}
                <div className="my-2">
                  <span className="text-xl font-bold font-mono text-zinc-100">
                    {formatCurrency(gasto.monto)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">por mes</span>
                </div>

                {/* Footer: Date and Card */}
                <div className="border-t border-zinc-900 pt-3 flex flex-col gap-1.5 text-[10px] text-zinc-450 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-550" />
                    <span>Día de pago: {gasto.diaPago} de cada mes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-zinc-550" />
                    <span>Tarjeta: {gasto.tarjeta ? gasto.tarjeta.nombre : 'Sin tarjeta'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative my-10 py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-900" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-black border border-zinc-800 rounded-full px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono shadow-inner shadow-black">
            Compras Financiadas en Cuotas (Tarjetas)
          </span>
        </div>
      </div>

      {/* Resumen Mensual Proyectado de Cuotas (Mes corriente + 5 meses siguientes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {monthlyProjections.map((proj, idx) => (
          <div 
            key={idx} 
            className={`rounded-2xl border bg-zinc-950 p-4 flex flex-col justify-between h-28 transition-all ${
              proj.isCurrent 
                ? 'border-blue-600 shadow-md shadow-blue-600/5' 
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-widest block truncate ${
              proj.isCurrent ? 'text-blue-400' : 'text-zinc-500'
            }`}>
              {proj.label}
            </span>
            <span className={`text-lg font-bold font-mono block my-1 ${
              proj.total > 0 ? (proj.isCurrent ? 'text-white' : 'text-pink-400') : 'text-zinc-700'
            }`}>
              {formatCurrency(proj.total)}
            </span>
            <span className="text-[8px] text-zinc-500 font-mono leading-tight">
              Fijos: {formatCurrency(proj.fixedExpensesTotal)} <br />
              Cuotas: {formatCurrency(proj.installmentsTotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Compras en cuotas Section */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-zinc-555 uppercase tracking-widest">Cronograma de Egresos Programados</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Suscripciones recurrentes y cuotas a pagar en el mes corriente y futuros meses</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-zinc-900 bg-zinc-950/20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : unifiedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-zinc-900 bg-zinc-950/10 text-zinc-550 space-y-2">
            <CreditCard className="h-8 w-8 text-zinc-800" />
            <span className="text-xs">No tienes gastos fijos ni cuotas pendientes de pago.</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs text-zinc-400">
              <thead className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono bg-zinc-950/50">
                <tr>
                  <th className="p-4">Concepto / Débito</th>
                  <th className="p-4">Tarjeta / Medio</th>
                  <th className="p-4 text-center">Frecuencia / Cuota</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-right">Fecha de Cobro</th>
                  <th className="p-4 text-center">Recargo (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 font-medium bg-zinc-950/10">
                {unifiedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="p-4">
                      <span className="text-white font-semibold block">{item.descripcion}</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{item.categoria}</span>
                    </td>
                    <td className="p-4 text-zinc-350">
                      <span className="flex items-center gap-1.5 font-sans">
                        <CreditCard className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        {item.tarjetaNombre}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-white text-xs">
                      {item.cuotaTexto}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white text-xs">
                      {formatCurrency(item.monto)}
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-500 text-xs">
                      {item.fechaTexto}
                    </td>
                    <td className="p-4 text-center font-mono text-zinc-500 text-xs">
                      {item.recargo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-6 relative animate-in scale-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Nuevo Gasto Fijo</h3>
                <p className="text-[10px] text-zinc-500">Registrar una nueva suscripción periódica</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGastoFijo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-zinc-400">Nombre del Servicio</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Gimnasio, Obra Social"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Monto Mensual</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Día de Pago (1 al 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={diaPago}
                    onChange={(e) => setDiaPago(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  >
                    <option value="Servicios">Servicios</option>
                    <option value="Salud">Salud</option>
                    <option value="Entretenimiento">Entretenimiento</option>
                    <option value="Salidas">Salidas</option>
                    <option value="Indumentaria">Indumentaria</option>
                    <option value="Regalos">Regalos</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Tarjeta Asociada</label>
                  <select
                    value={tarjetaId}
                    onChange={(e) => setTarjetaId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  >
                    <option value="">Ninguna / Efectivo</option>
                    {tarjetas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-850 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Gasto Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
