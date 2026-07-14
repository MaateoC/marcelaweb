'use client';

import React, { useState, useEffect } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { PropertyCard } from '@/components/propiedades/PropertyCard';
import { ContractUpdateModal } from '@/components/propiedades/ContractUpdateModal';
import { Contrato } from '@/types';
import { Building2, Plus, Filter, X, AlertCircle, Calendar, RefreshCw, FileText, Calculator } from 'lucide-react';
import Link from 'next/link';

const getMonthName = (monthNum: number) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNum - 1] || '';
};

export default function PropertiesPage() {
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const { properties, isLoading, createProperty, isCreatingProperty } = useProperties(
    tipoFilter || undefined
  );

  const [latestIndices, setLatestIndices] = useState<{
    icl: { fecha: string; valor: number } | null;
    ipc: { anio: number; mes: number; valor: number } | null;
    cac: { anio: number; mes: number; valor: number } | null;
  } | null>(null);

  useEffect(() => {
    async function fetchIndices() {
      try {
        const res = await fetch('/api/finanzas/indices');
        if (res.ok) {
          const json = await res.json();
          if (json.latest) {
            setLatestIndices(json.latest);
          }
        }
      } catch (err) {
        console.error('Error fetching indices in properties page:', err);
      }
    }
    fetchIndices();
  }, []);

  // States for Contract Update Modal
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  // States for New Property Form
  const [isNewPropOpen, setIsNewPropOpen] = useState<boolean>(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropTipo, setNewPropTipo] = useState<'DEPARTAMENTO' | 'LOCAL'>('DEPARTAMENTO');
  const [newPropDireccion, setNewPropDireccion] = useState('');
  const [newPropEstado, setNewPropEstado] = useState<'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO'>('ACTIVO');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for contract in New Property Form
  const [contractInquilino, setContractInquilino] = useState('');
  const [contractFechaInicio, setContractFechaInicio] = useState('');
  const [contractDuracion, setContractDuracion] = useState<number>(24); // default 24 months
  const [contractDuracionCustom, setContractDuracionCustom] = useState('');
  const [contractMonto, setContractMonto] = useState('');
  const [contractFrecuencia, setContractFrecuencia] = useState<number>(6); // default 6 months
  const [contractIndice, setContractIndice] = useState('ICL');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenUpdateModal = (contract: Contrato) => {
    setSelectedContract(contract);
    setIsUpdateModalOpen(true);
  };

  const getCalculatedEndDate = (startDate: string, durationMonths: number) => {
    if (!startDate) return '';
    const date = new Date(startDate + 'T00:00:00');
    date.setMonth(date.getMonth() + durationMonths);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      if (
        !newPropName ||
        !newPropDireccion ||
        !contractInquilino ||
        !contractFechaInicio ||
        !contractMonto
      ) {
        setErrorMsg('Por favor completa todos los campos requeridos de la propiedad y del contrato');
        return;
      }

      const finalDuracion = contractDuracion === 0 ? Number(contractDuracionCustom) : contractDuracion;
      if (!finalDuracion || finalDuracion <= 0) {
        setErrorMsg('Por favor ingresa una duración válida en meses');
        return;
      }

      setIsUploading(true);
      let uploadedPath = null;
      if (contractFile) {
        const formData = new FormData();
        formData.append('file', contractFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Error al subir el documento del contrato');
        }

        const uploadData = await uploadRes.json();
        uploadedPath = uploadData.path;
      }

      const fechaFin = getCalculatedEndDate(contractFechaInicio, finalDuracion);

      const contractData = {
        inquilinoNombre: contractInquilino,
        fechaInicio: contractFechaInicio,
        fechaFin,
        montoInicial: Number(contractMonto),
        indiceActualizacion: contractIndice,
        frecuenciaActualizacion: Number(contractFrecuencia),
        documentoPath: uploadedPath,
      };

      await createProperty({
        nombre: newPropName,
        tipo: newPropTipo,
        direccion: newPropDireccion,
        estado: newPropEstado,
        contrato: contractData,
      });

      // Reset Property fields
      setNewPropName('');
      setNewPropDireccion('');
      setIsNewPropOpen(false);

      // Reset Contract fields
      setContractInquilino('');
      setContractFechaInicio('');
      setContractDuracion(24);
      setContractDuracionCustom('');
      setContractMonto('');
      setContractFrecuencia(6);
      setContractIndice('ICL');
      setContractFile(null);
    } catch (err) {
      const errorVal = err as Error;
      setErrorMsg(errorVal.message || 'Error al crear la propiedad');
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate alerts dynamically
  const alerts: {
    id: string;
    propiedadId: string;
    propiedadNombre: string;
    tipo: 'VENCIMIENTO' | 'AJUSTE';
    mensaje: string;
    detalle: string;
  }[] = [];

  const hoy = new Date();

  properties.forEach((p) => {
    // Find active contract
    const activeContract = p.contratos?.find((c) => {
      const fin = new Date(c.fechaFin);
      return fin >= hoy;
    });

    if (activeContract) {
      // 1. Check expiration (<= 60 days)
      const fin = new Date(activeContract.fechaFin);
      const diffTime = fin.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 60) {
        alerts.push({
          id: `venc-${activeContract.id}`,
          propiedadId: p.id,
          propiedadNombre: p.nombre,
          tipo: 'VENCIMIENTO',
          mensaje: `Contrato por vencer en ${diffDays} días`,
          detalle: `El contrato de ${activeContract.inquilinoNombre} vence el ${new Date(activeContract.fechaFin).toLocaleDateString('es-AR')}.`,
        });
      }

      // 2. Check adjustment due this month
      const inicio = new Date(activeContract.fechaInicio);
      const monthsElapsed = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
      if (monthsElapsed > 0 && monthsElapsed % activeContract.frecuenciaActualizacion === 0) {
        let alreadyUpdated = false;
        if (activeContract.ultimaActualizacion) {
          const ult = new Date(activeContract.ultimaActualizacion);
          if (ult.getFullYear() === hoy.getFullYear() && ult.getMonth() === hoy.getMonth()) {
            alreadyUpdated = true;
          }
        }

        if (!alreadyUpdated) {
          alerts.push({
            id: `ajust-${activeContract.id}`,
            propiedadId: p.id,
            propiedadNombre: p.nombre,
            tipo: 'AJUSTE',
            mensaje: `Actualización de alquiler pendiente`,
            detalle: `Corresponde ajustar por índice ${activeContract.indiceActualizacion} (frecuencia: cada ${activeContract.frecuenciaActualizacion} meses).`,
          });
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Gestión Inmobiliaria</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Administración de propiedades, contratos y actualizaciones de alquileres
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsNewPropOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
          >
            <Plus className="h-4 w-4" /> Agregar Propiedad
          </button>
        </div>
      </div>

      {/* Indicadores Oficiales (ICL, IPC, CAC) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
          Índices Actualizados
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* ICL Card */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2.5 relative overflow-hidden group hover:border-zinc-800 transition duration-300 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">
              Índice ICL (BCRA)
            </span>
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {latestIndices?.icl ? latestIndices.icl.valor.toFixed(2) : '...'}
            </div>
            <p className="text-[10px] text-zinc-500">
              {latestIndices?.icl ? `Actualizado al ${new Date(latestIndices.icl.fecha + 'T00:00:00').toLocaleDateString('es-AR')}` : 'Cargando dato oficial...'}
            </p>
          </div>
          <p className="text-[10px] text-zinc-400 border-t border-zinc-900/60 pt-2 leading-relaxed font-medium">
            Coeficiente oficial para actualizar contratos de vivienda vigentes (RIPTE + IPC).
          </p>
        </div>

        {/* IPC Card */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2.5 relative overflow-hidden group hover:border-zinc-800 transition duration-300 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
              Inflación IPC (INDEC)
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {latestIndices?.ipc ? `+${latestIndices.ipc.valor.toFixed(2)}%` : '...'}
            </div>
            <p className="text-[10px] text-zinc-500">
              {latestIndices?.ipc ? `Variación mensual de ${getMonthName(latestIndices.ipc.mes)} ${latestIndices.ipc.anio}` : 'Cargando dato oficial...'}
            </p>
          </div>
          <p className="text-[10px] text-zinc-400 border-t border-zinc-900/60 pt-2 leading-relaxed font-medium">
            Variación de precios al consumidor. Utilizado en contratos nuevos de locación.
          </p>
        </div>

        {/* CAC Card */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2.5 relative overflow-hidden group hover:border-zinc-800 transition duration-300 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
              Construcción CAC (CAMARCO)
            </span>
            <div className="h-2 w-2 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {latestIndices?.cac ? `+${latestIndices.cac.valor.toFixed(2)}%` : '...'}
            </div>
            <p className="text-[10px] text-zinc-500">
              {latestIndices?.cac ? `Variación de ${getMonthName(latestIndices.cac.mes)} ${latestIndices.cac.anio}` : 'Cargando dato oficial...'}
            </p>
          </div>
          <p className="text-[10px] text-zinc-400 border-t border-zinc-900/60 pt-2 leading-relaxed font-medium">
            Variación del costo de construcción. Usado en fideicomisos y locales comerciales.
          </p>
        </div>
      </div>
    </div>

    {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertCircle className="h-5 w-5 animate-pulse" />
            <span>Alertas de Atención ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl bg-zinc-950/40 p-3.5 border border-zinc-900 hover:border-zinc-800 transition-colors"
              >
                <div className={`p-1.5 rounded-lg ${alert.tipo === 'VENCIMIENTO' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {alert.tipo === 'VENCIMIENTO' ? <Calendar className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">{alert.propiedadNombre} - {alert.mensaje}</h4>
                  <p className="text-[11px] text-zinc-400">{alert.detalle}</p>
                  <Link
                    href={`/propiedades/${alert.propiedadId}`}
                    className="text-[10px] text-blue-450 font-semibold hover:underline inline-block pt-1"
                  >
                    Ver propiedad &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gestión de Propiedades */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
          Gestión de Propiedades
        </h2>
        {/* Filter / View Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <Filter className="h-4 w-4 text-blue-400" />
          <span>Filtrar por tipo:</span>
        </div>
        <div className="flex gap-2">
          {['', 'DEPARTAMENTO', 'LOCAL'].map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                tipoFilter === t
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-zinc-850 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {t === '' ? 'Todas' : t === 'DEPARTAMENTO' ? 'Departamentos' : 'Locales'}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-zinc-650" />
          <h3 className="mt-4 text-sm font-semibold text-white">No hay propiedades</h3>
          <p className="mt-1 text-xs text-zinc-550">Comienza agregando tu primera propiedad en el panel superior</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onApplyUpdate={handleOpenUpdateModal}
            />
          ))}
        </div>
      )}
      </div>

      {/* New Property Drawer Modal */}
      {isNewPropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-in scale-in duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md px-6 py-4">
              <h3 className="text-base font-bold text-white">Nueva Propiedad</h3>
              <button
                onClick={() => setIsNewPropOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400">Nombre / Identificador *</label>
                <input
                  type="text"
                  placeholder="Ej. Depto Pellegrini 1400"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Tipo de Activo</label>
                  <select
                    value={newPropTipo}
                    onChange={(e) => setNewPropTipo(e.target.value as 'DEPARTAMENTO' | 'LOCAL')}
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                  >
                    <option value="DEPARTAMENTO">Departamento</option>
                    <option value="LOCAL">Local Comercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400">Estado Inicial</label>
                  <select
                    value={newPropEstado}
                    onChange={(e) => setNewPropEstado(e.target.value as 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO')}
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">Dirección Completa *</label>
                <input
                  type="text"
                  placeholder="Ej. Av. Pellegrini 1420, Piso 4, Rosario"
                  value={newPropDireccion}
                  onChange={(e) => setNewPropDireccion(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white focus:border-zinc-700 focus:outline-none"
                  required
                />
              </div>

              {/* Sección Contrato de Alquiler */}
              <div className="pt-4 border-t border-zinc-900 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                  <span>Detalles del Contrato de Alquiler</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400">Nombre del Inquilino *</label>
                  <input
                    type="text"
                    placeholder="Ej. Marcela Rodríguez"
                    value={contractInquilino}
                    onChange={(e) => setContractInquilino(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Fecha Inicio *</label>
                    <input
                      type="date"
                      value={contractFechaInicio}
                      onChange={(e) => setContractFechaInicio(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Monto Inicial (ARS) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={contractMonto}
                      onChange={(e) => setContractMonto(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Duración del Contrato</label>
                    <select
                      value={contractDuracion}
                      onChange={(e) => setContractDuracion(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
                    >
                      <option value={12}>12 Meses (1 año)</option>
                      <option value={24}>24 Meses (2 años)</option>
                      <option value={36}>36 Meses (3 años)</option>
                      <option value={0}>Personalizado...</option>
                    </select>
                  </div>

                  {contractDuracion === 0 ? (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400">Duración (en meses) *</label>
                      <input
                        type="number"
                        placeholder="Meses"
                        value={contractDuracionCustom}
                        onChange={(e) => setContractDuracionCustom(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                        required={contractDuracion === 0}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400">Fecha Fin (Calculada)</label>
                      <div className="mt-2 w-full rounded-xl border border-zinc-850 bg-zinc-900/40 p-2 text-xs font-mono text-zinc-400">
                        {contractFechaInicio
                          ? new Date(
                              getCalculatedEndDate(
                                contractFechaInicio,
                                contractDuracion
                              )
                            ).toLocaleDateString('es-AR')
                          : 'Falta fecha inicio'}
                      </div>
                    </div>
                  )}
                </div>

                {contractDuracion === 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Fecha Fin (Calculada)</label>
                    <div className="mt-2 w-full rounded-xl border border-zinc-850 bg-zinc-900/40 p-2 text-xs font-mono text-zinc-400">
                      {contractFechaInicio && Number(contractDuracionCustom) > 0
                        ? new Date(
                            getCalculatedEndDate(
                              contractFechaInicio,
                              Number(contractDuracionCustom)
                            )
                          ).toLocaleDateString('es-AR')
                        : 'Falta fecha o meses'}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Índice Ajuste</label>
                    <select
                      value={contractIndice}
                      onChange={(e) => setContractIndice(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                    >
                      <option value="ICL">ICL (Contratos)</option>
                      <option value="CAC">CAC (Construcción)</option>
                      <option value="IPC">IPC (Inflación)</option>
                      <option value="FIJO">Fijo / Sin Ajuste</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Frecuencia Ajuste (Meses)</label>
                    <input
                      type="number"
                      value={contractFrecuencia}
                      onChange={(e) => setContractFrecuencia(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-400">Documento Escrito (PDF / Word) - Opcional</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setContractFile(file);
                      }}
                      className="hidden"
                      id="contract-file-upload"
                    />
                    <label
                      htmlFor="contract-file-upload"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 px-4 py-3 text-xs text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span>{contractFile ? contractFile.name : 'Subir contrato (.pdf, .doc, .docx)'}</span>
                    </label>
                    {contractFile && (
                      <button
                        type="button"
                        onClick={() => setContractFile(null)}
                        className="absolute right-2.5 top-2.5 rounded-lg p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPropOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-850 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProperty || isUploading}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isCreatingProperty || isUploading ? 'Creando...' : 'Crear Propiedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Lease Adjustment Modal */}
      <ContractUpdateModal
        contract={selectedContract}
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedContract(null);
        }}
      />
    </div>
  );
}
