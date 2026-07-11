'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Trash2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Tarjeta {
  id: string;
  nombre: string;
  diaCierre: number;
  diaVencimiento: number;
}

export default function TarjetasConfigPage() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [diaCierre, setDiaCierre] = useState('20');
  const [diaVencimiento, setDiaVencimiento] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTarjetas();
  }, []);

  const fetchTarjetas = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/configuracion/tarjetas');
      if (res.ok) {
        const data = await res.json();
        setTarjetas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTarjeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ingresa un nombre para la tarjeta.');
      return;
    }

    const cierreNum = Number(diaCierre);
    const vtoNum = Number(diaVencimiento);

    if (cierreNum < 1 || cierreNum > 31 || vtoNum < 1 || vtoNum > 31) {
      alert('Los días deben estar entre 1 y 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/configuracion/tarjetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          diaCierre: cierreNum,
          diaVencimiento: vtoNum,
        }),
      });

      if (res.ok) {
        setNombre('');
        setShowAddModal(false);
        fetchTarjetas();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al guardar la tarjeta');
      }
    } catch (err) {
      alert('Error de red al guardar la tarjeta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTarjeta = async (id: string) => {
    if (!confirm('¿Estás segura de eliminar esta tarjeta? Esto desvinculará los gastos fijos asociados.')) {
      return;
    }

    try {
      const res = await fetch(`/api/configuracion/tarjetas?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTarjetas();
      }
    } catch (err) {
      alert('Error al eliminar la tarjeta');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header with Top Right Button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <Link
            href="/"
            className="flex w-fit items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al Inicio
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Tarjetas Asociadas</h1>
          <p className="text-xs sm:text-sm text-zinc-450">
            Administra las tarjetas de crédito o débito con sus días de cierre y vencimiento para proyectar tus pagos
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/10"
        >
          <Plus className="h-4.5 w-4.5" />
          Agregar tarjeta
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Mis Tarjetas Registradas</h3>
        
        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-zinc-900 bg-zinc-950/20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : tarjetas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-zinc-900 bg-zinc-950/10 text-zinc-550 space-y-3">
            <CreditCard className="h-10 w-10 text-zinc-700" />
            <span className="text-xs">No tienes tarjetas registradas todavía.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tarjetas.map((tarjeta) => (
              <div
                key={tarjeta.id}
                className="relative group overflow-hidden w-full h-44 rounded-2xl bg-gradient-to-br from-zinc-850 to-zinc-950 border border-zinc-800/80 p-6 flex flex-col justify-between shadow-lg hover:border-zinc-750 transition-all duration-300"
              >
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[0.5px]" />
                
                {/* Delete button */}
                <button
                  onClick={() => handleDeleteTarjeta(tarjeta.id)}
                  className="absolute right-4 top-4 z-20 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-805 transition-colors cursor-pointer"
                  title="Eliminar tarjeta"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="flex justify-between items-start z-10">
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-semibold">TARJETA</span>
                    <span className="text-white font-bold text-base tracking-wide block">{tarjeta.nombre}</span>
                  </div>
                </div>

                <div className="z-10 flex gap-6 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase">Cierre</span>
                    <span className="text-zinc-300 font-semibold">Día {tarjeta.diaCierre}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase">Vencimiento</span>
                    <span className="text-emerald-400 font-bold">Día {tarjeta.diaVencimiento}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-6 space-y-5 relative animate-in scale-in duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-white">Nueva Tarjeta</h3>
                <p className="text-[10px] text-zinc-500">Agrega un nuevo medio de pago asociado</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTarjeta} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-zinc-400">Nombre de la Tarjeta</label>
                <input
                  type="text"
                  placeholder="e.g. Visa Galicia, Mastercard BBVA"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs text-white placeholder-zinc-650 focus:border-zinc-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Día de Cierre (1 al 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="20"
                    value={diaCierre}
                    onChange={(e) => setDiaCierre(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-400">Día de Vencimiento (1 al 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="2"
                    value={diaVencimiento}
                    onChange={(e) => setDiaVencimiento(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-850 bg-zinc-900 p-2.5 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                  />
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
                  {isSubmitting ? 'Guardando...' : 'Agregar Tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
