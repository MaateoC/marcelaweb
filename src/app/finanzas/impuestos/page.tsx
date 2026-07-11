'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/hooks/useTransactions';
import { LocalTaxPanel, ImpuestoConfigurado } from '@/components/finanzas/LocalTaxPanel';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  Trash2,
  X
} from 'lucide-react';

export default function ImpuestosPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [taxes, setTaxes] = useState<ImpuestoConfigurado[]>([]);
  const [isTaxesLoading, setIsTaxesLoading] = useState<boolean>(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Form states for manual configuration modal
  const [formNombre, setFormNombre] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formMonto, setFormMonto] = useState<number>(0);
  const [formDia, setFormDia] = useState<number>(10);
  const [formCat, setFormCat] = useState<string>('Impuestos Locales');
  const [formSubcat, setFormSubcat] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch configured taxes from the database
  const fetchTaxes = async () => {
    setIsTaxesLoading(true);
    try {
      const res = await fetch('/api/impuestos');
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } catch (err) {
      console.error('Error fetching taxes:', err);
    } finally {
      setIsTaxesLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  // Fetch all transactions for the selected month (to determine payment statuses)
  const { transactions, isLoading: isTxsLoading } = useTransactions({
    month: selectedMonth,
  });

  const isLoading = isTxsLoading || isTaxesLoading;

  // Calculate totals paid and pending counts
  const summary = useMemo(() => {
    let pagados = 0;
    let impagosCount = 0;

    taxes.forEach((tax) => {
      const subcat = tax.subcategoria || tax.nombre;
      const payment = transactions.find(
        (t) => t.tipo === 'GASTO' && t.subcategoria === subcat
      );
      if (payment) {
        pagados += payment.monto;
      } else {
        impagosCount++;
      }
    });

    return {
      pagados,
      impagosCount,
    };
  }, [transactions, taxes]);

  // Handler to register a quick payment
  const handleQuickPayTax = async (taxName: string, subcat: string, defaultAmount: number) => {
    const confirmPay = window.confirm(`¿Registrar pago de ${taxName} por $${defaultAmount.toLocaleString('es-AR')}?`);
    if (confirmPay) {
      try {
        const res = await fetch('/api/transacciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'GASTO',
            monto: defaultAmount,
            descripcion: `Pago ${taxName} - Periodo ${selectedMonth}`,
            fecha: new Date().toISOString().split('T')[0],
            categoria: 'Impuestos Locales',
            subcategoria: subcat,
          }),
        });
        if (res.ok) {
          window.location.reload();
        }
      } catch (err) {
        alert('Error al registrar pago');
      }
    }
  };

  // Handler to delete a configured tax
  const handleDeleteTax = async (id: string) => {
    const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar este impuesto configurado? Ya no figurará en la lista mensual ni en el calendario.');
    if (confirmDelete) {
      try {
        const res = await fetch(`/api/impuestos?id=${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchTaxes();
        } else {
          alert('Error al eliminar impuesto configurado');
        }
      } catch (err) {
        alert('Error de conexión');
      }
    }
  };

  // Presets array for fast auto-fill
  const presets = [
    { nombre: 'TGI Rosario', descripcion: 'Tasa General de Inmuebles (Municipal)', montoSugerido: 9200, diaVencimiento: 10, categoria: 'Impuestos Locales', subcategoria: 'TGI Rosario' },
    { nombre: 'API Inmobiliario', descripcion: 'Impuesto Inmobiliario (Provincial)', montoSugerido: 12500, diaVencimiento: 15, categoria: 'Impuestos Locales', subcategoria: 'API Santa Fe' },
    { nombre: 'EPE Luz', descripcion: 'Empresa Provincial de la Energía (EPE)', montoSugerido: 21300, diaVencimiento: 20, categoria: 'Servicios', subcategoria: 'EPE Luz' },
    { nombre: 'ASSA Agua', descripcion: 'Aguas Santafesinas (ASSA)', montoSugerido: 9500, diaVencimiento: 22, categoria: 'Servicios', subcategoria: 'ASSA Agua' },
    { nombre: 'Litoral Gas', descripcion: 'Suministro de Gas Natural', montoSugerido: 6800, diaVencimiento: 25, categoria: 'Servicios', subcategoria: 'Litoral Gas' },
    { nombre: 'DReI Rosario', descripcion: 'Derecho de Registro e Inspección (Comercios)', montoSugerido: 15400, diaVencimiento: 18, categoria: 'Impuestos Locales', subcategoria: 'DReI Rosario' },
  ];

  // Handler to submit new configured tax
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre || formMonto <= 0 || formDia < 1 || formDia > 31) {
      alert('Por favor completa todos los campos con valores válidos (Día entre 1 y 31)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/impuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formNombre,
          descripcion: formDesc,
          montoSugerido: formMonto,
          diaVencimiento: formDia,
          categoria: formCat,
          subcategoria: formSubcat || formNombre,
        }),
      });

      if (res.ok) {
        setIsConfigModalOpen(false);
        // Reset form
        setFormNombre('');
        setFormDesc('');
        setFormMonto(0);
        setFormDia(10);
        setFormCat('Impuestos Locales');
        setFormSubcat('');
        fetchTaxes();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar configuración');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Calculator className="h-5 w-5" />
            </span>
            Impuestos y Servicios
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestión manual de vencimientos y tasas locales de Santa Fe
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Configurator button */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 cursor-pointer shadow-lg shadow-black/20"
          >
            <Plus className="h-4.5 w-4.5" /> Configurar Impuesto
          </button>

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
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2/3 width): Dynamic Monitored Taxes list */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : taxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Calculator className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No hay impuestos configurados</p>
              <p className="text-xs text-zinc-500 mt-1">Haz clic en "Configurar Impuesto" para comenzar</p>
            </div>
          ) : (
            <LocalTaxPanel
              currentMonthTransactions={transactions}
              onQuickPay={handleQuickPayTax}
              taxes={taxes}
              onDeleteTax={handleDeleteTax}
              isExpanded={true}
            />
          )}
        </div>

        {/* Right Column (1/3 width): Statistics Summary Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Resumen Mensual</h3>
              <p className="text-xs text-zinc-400">Estado consolidado de las tasas locales</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Total Pagado
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {formatCurrency(summary.pagados)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Tasas Pendientes
                </span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {summary.impagosCount} pendientes
                </span>
              </div>
            </div>

            {/* Back to Finance Link Button */}
            <Link
              href="/finanzas"
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-semibold text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 w-full"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Finanzas
            </Link>
          </div>
        </div>
      </div>

      {/* Manual Configuration Modal Overlay */}
      {isConfigModalOpen && (
        <div 
          onClick={() => setIsConfigModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 p-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Configurar Impuesto/Servicio</h3>
                <p className="text-xs text-zinc-400">Establece un patrón de vencimiento recurrente</p>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              {/* Preset Selector Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400">Preconfiguraciones Rápidas</label>
                <select
                  defaultValue="custom"
                  onChange={(e) => {
                    const idx = e.target.value;
                    if (idx !== 'custom') {
                      const preset = presets[Number(idx)];
                      setFormNombre(preset.nombre);
                      setFormDesc(preset.descripcion);
                      setFormMonto(preset.montoSugerido);
                      setFormDia(preset.diaVencimiento);
                      setFormCat(preset.categoria);
                      setFormSubcat(preset.subcategoria);
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="custom">Otro (Personalizado)</option>
                  {presets.map((p, i) => (
                    <option key={p.nombre} value={i}>
                      {p.nombre} (${p.montoSugerido.toLocaleString('es-AR')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400">Nombre del Impuesto / Servicio</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Expensas Edificio"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej. Pago de expensas comunes de administración"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Monto sugerido */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400">Monto Sugerido ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(Number(e.target.value))}
                    placeholder="Monto"
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none font-mono"
                  />
                </div>

                {/* Día de vencimiento */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400">Día de Vencimiento (1-31)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={formDia || ''}
                    onChange={(e) => setFormDia(Number(e.target.value))}
                    placeholder="Ej. 10"
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Categoría Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400">Categoría Contable</label>
                <select
                  value={formCat}
                  onChange={(e) => setFormCat(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="Impuestos Locales">Impuestos Locales</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                </select>
              </div>

              {/* Subcategoría (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400">Subcategoría (Para agrupar pagos)</label>
                <input
                  type="text"
                  value={formSubcat}
                  onChange={(e) => setFormSubcat(e.target.value)}
                  placeholder="Ej. Expensas A (si se deja vacío, usa el nombre)"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
