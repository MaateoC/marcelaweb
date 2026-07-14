'use client';

import React, { useState, useMemo } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { Building2, Store, ArrowLeft, CheckCircle2, AlertCircle, FileText, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { PagoAlquiler, Propiedad, GastoPropiedad } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const contractSchema = z.object({
  inquilinoNombre: z.string().min(3, { message: 'El nombre del inquilino debe tener al menos 3 caracteres' }),
  fechaInicio: z.string().min(1, { message: 'La fecha de inicio es requerida' }),
  duracion: z.number(),
  duracionCustom: z.number().optional(),
  montoInicial: z.number().positive({ message: 'El monto inicial debe ser mayor a 0' }),
  indiceActualizacion: z.enum(['ICL', 'CAC', 'IPC', 'FIJO']),
  frecuenciaActualizacion: z.number().positive({ message: 'La frecuencia debe ser mayor a 0' }),
});

type ContractFormValues = z.infer<typeof contractSchema>;

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { properties, isLoading: isPropsLoading, createContract, isCreatingContract } = useProperties();
  const queryClient = useQueryClient();
  const [contractError, setContractError] = useState<string | null>(null);
  const [selectedReceiptPago, setSelectedReceiptPago] = useState<PagoAlquiler | null>(null);
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<'pagos' | 'gastos'>('pagos');
  const [selectedMonthPago, setSelectedMonthPago] = useState<PagoAlquiler | null>(null);
  const [localSelectedYear, setLocalSelectedYear] = useState<number | null>(null);

  const property = properties.find((p) => p.id === id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      inquilinoNombre: '',
      montoInicial: 0,
      indiceActualizacion: 'ICL',
      frecuenciaActualizacion: 6,
      duracion: 24,
    },
  });

  const watchFechaInicio = watch('fechaInicio');
  const watchDuracion = watch('duracion');
  const watchDuracionCustom = watch('duracionCustom');

  const activeContract = property?.contratos?.find((c) => {
    const fin = new Date(c.fechaFin);
    const hoy = new Date();
    return fin >= hoy;
  });

  // Get unique years of payments
  const paymentYears = useMemo(() => {
    if (!activeContract?.pagos) return [];
    return Array.from(
      new Set(
        activeContract.pagos.map((p) => {
          const [yearStr] = p.mesReferencia.split('-');
          return parseInt(yearStr, 10);
        })
      )
    ).sort((a, b) => a - b);
  }, [activeContract?.pagos]);

  // Determine current year and selected year
  const selectedYear = useMemo(() => {
    if (paymentYears.length === 0) return null;
    if (localSelectedYear !== null && paymentYears.includes(localSelectedYear)) {
      return localSelectedYear;
    }
    const currentYear = new Date().getFullYear();
    if (paymentYears.includes(currentYear)) {
      return currentYear;
    }
    return paymentYears[0];
  }, [paymentYears, localSelectedYear]);

  // Filter payments for the selected year
  const paymentsForSelectedYear = useMemo(() => {
    if (!activeContract?.pagos || !selectedYear) return [];
    return activeContract.pagos
      .filter((p) => {
        const [yearStr] = p.mesReferencia.split('-');
        return parseInt(yearStr, 10) === selectedYear;
      })
      .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
  }, [activeContract?.pagos, selectedYear]);

  // Find the selected/active payment month
  const activeMonthPago = useMemo(() => {
    if (paymentsForSelectedYear.length === 0) return null;
    
    // If the user has manually selected a month and it belongs to the current list, return it
    if (selectedMonthPago) {
      const found = paymentsForSelectedYear.find((p) => p.id === selectedMonthPago.id);
      if (found) return found;
    }
    
    // Otherwise, default to current month if in list
    const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const currentMonthPago = paymentsForSelectedYear.find((p) => p.mesReferencia === currentMonthStr);
    if (currentMonthPago) return currentMonthPago;
    
    // Otherwise, default to the first unpaid month
    const firstUnpaid = paymentsForSelectedYear.find((p) => p.estado !== 'PAGADO');
    if (firstUnpaid) return firstUnpaid;
    
    // Fallback to the first month in the list
    return paymentsForSelectedYear[0];
  }, [paymentsForSelectedYear, selectedMonthPago]);

  const PropertyIcon = property?.tipo === 'DEPARTAMENTO' ? Building2 : Store;

  const handleUploadContractFileDirect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeContract) return;

    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        alert(errData.error || 'Error al subir el archivo');
        return;
      }

      const uploadData = await uploadRes.json();
      const uploadedPath = uploadData.path;

      const updateRes = await fetch('/api/contratos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContract.id,
          documentoPath: uploadedPath,
        }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        alert(errData.error || 'Error al guardar la relación del contrato');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      alert('Documento del contrato guardado con éxito.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ocurrió un error al subir el archivo';
      console.error(err);
      alert(errorMsg);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const getCalculatedEndDate = (startDate: string, durationMonths: number) => {
    if (!startDate) return '';
    const date = new Date(startDate + 'T00:00:00');
    date.setMonth(date.getMonth() + durationMonths);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const handleRegisterContract = async (data: ContractFormValues) => {
    try {
      setContractError(null);

      const finalDuracion = data.duracion === 0 ? Number(data.duracionCustom) : data.duracion;
      if (!finalDuracion || finalDuracion <= 0) {
        setContractError('Por favor ingresa una duración válida en meses');
        return;
      }

      setIsUploadingFile(true);
      let uploadedPath = null;
      if (detailFile) {
        const formData = new FormData();
        formData.append('file', detailFile);

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

      const fechaFin = getCalculatedEndDate(data.fechaInicio, finalDuracion);

      await createContract({
        propiedadId: id,
        inquilinoNombre: data.inquilinoNombre,
        fechaInicio: data.fechaInicio,
        fechaFin,
        montoInicial: data.montoInicial,
        indiceActualizacion: data.indiceActualizacion,
        frecuenciaActualizacion: data.frecuenciaActualizacion,
        documentoPath: uploadedPath,
      });
      reset();
      setDetailFile(null);
    } catch (err) {
      const errorVal = err as Error;
      setContractError(errorVal.message || 'Error al registrar el contrato');
    } finally {
      setIsUploadingFile(false);
    }
  };

  if (isPropsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-white">Propiedad no encontrada</h3>
        <Link href="/propiedades" className="text-xs text-blue-500 mt-2 block hover:underline">
          Volver a Propiedades
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link & Title */}
      <div className="flex flex-col gap-4">
        <Link
          href="/propiedades"
          className="flex w-fit items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Propiedades
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-blue-400">
            <PropertyIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">{property.nombre}</h1>
            <p className="text-xs sm:text-sm text-zinc-400">{property.direccion}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Contract Details or Register Form */}
        <div className="lg:col-span-1 space-y-6">
          {activeContract ? (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Contrato Activo</h3>
                  <p className="text-xs text-zinc-400">Detalles de locación en vigencia</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-4 space-y-3 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Inquilino:</span>
                      <span className="font-semibold text-white">{activeContract.inquilinoNombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha Inicio:</span>
                      <span className="font-semibold text-white">
                        {new Date(activeContract.fechaInicio).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha Fin:</span>
                      <span className="font-semibold text-white">
                        {new Date(activeContract.fechaFin).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Índice Ajuste:</span>
                      <span className="font-semibold text-white">{activeContract.indiceActualizacion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frecuencia:</span>
                      <span className="font-semibold text-white">Cada {activeContract.frecuenciaActualizacion} meses</span>
                    </div>
                    {!activeContract.documentoPath ? (
                      <div className="border-t border-zinc-900/60 pt-3 mt-3 space-y-2">
                        <span className="block text-[10px] text-zinc-550 uppercase tracking-wider">Cargar Contrato Escrito (PDF/Word):</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleUploadContractFileDirect}
                          disabled={isUploadingFile}
                          className="block w-full text-[11px] text-zinc-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/10 file:text-blue-400 file:cursor-pointer hover:file:bg-blue-600/20"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 border-t border-zinc-900/60 pt-3 mt-3">
                        <div className="flex justify-between items-center text-xs">
                          <span>Documento Escrito:</span>
                          <a
                            href={activeContract.documentoPath}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" /> Descargar/Ver
                          </a>
                        </div>
                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span className="text-zinc-500">Reemplazar contrato:</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleUploadContractFileDirect}
                            disabled={isUploadingFile}
                            className="w-44 text-[10px] text-zinc-400 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:bg-zinc-800 file:text-zinc-300 file:cursor-pointer hover:file:bg-zinc-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900 pt-4">
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Monto Inicial</span>
                      <span className="font-mono text-sm font-semibold text-zinc-400">
                        {formatCurrency(activeContract.montoInicial)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Monto Actual</span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        {formatCurrency(activeContract.montoActual)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white">Vincular Contrato</h3>
                <p className="text-xs text-zinc-400">Registrar un nuevo inquilino para este activo</p>
              </div>

              {contractError && (
                <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-xs text-red-400">
                  {contractError}
                </div>
              )}

              <form onSubmit={handleSubmit(handleRegisterContract)} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Nombre del Inquilino *</label>
                  <input
                    type="text"
                    placeholder="Ej. Marcela Rodríguez"
                    {...register('inquilinoNombre')}
                    className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none"
                  />
                  {errors.inquilinoNombre && <p className="mt-1 text-xs text-red-500">{errors.inquilinoNombre.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Fecha Inicio *</label>
                    <input
                      type="date"
                      {...register('fechaInicio')}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
                    />
                    {errors.fechaInicio && <p className="mt-1 text-xs text-red-500">{errors.fechaInicio.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Monto Inicial (ARS) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      {...register('montoInicial', { valueAsNumber: true })}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                    />
                    {errors.montoInicial && <p className="mt-1 text-xs text-red-500">{errors.montoInicial.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Duración del Contrato</label>
                    <select
                      {...register('duracion', { valueAsNumber: true })}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
                    >
                      <option value={12}>12 Meses (1 año)</option>
                      <option value={24}>24 Meses (2 años)</option>
                      <option value={36}>36 Meses (3 años)</option>
                      <option value={0}>Personalizado...</option>
                    </select>
                  </div>

                  {watchDuracion === 0 ? (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400">Duración (meses) *</label>
                      <input
                        type="number"
                        placeholder="Meses"
                        {...register('duracionCustom', { valueAsNumber: true })}
                        className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400">Fecha Fin (Calculada)</label>
                      <div className="mt-2 w-full rounded-xl border border-zinc-850 bg-zinc-900/40 p-2 text-xs font-mono text-zinc-400">
                        {watchFechaInicio
                          ? new Date(
                              getCalculatedEndDate(
                                watchFechaInicio,
                                watchDuracion
                              )
                            ).toLocaleDateString('es-AR')
                          : 'Falta fecha inicio'}
                      </div>
                    </div>
                  )}
                </div>

                {watchDuracion === 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Fecha Fin (Calculada)</label>
                    <div className="mt-2 w-full rounded-xl border border-zinc-850 bg-zinc-900/40 p-2 text-xs font-mono text-zinc-400">
                      {watchFechaInicio && Number(watchDuracionCustom || 0) > 0
                        ? new Date(
                            getCalculatedEndDate(
                              watchFechaInicio,
                              Number(watchDuracionCustom || 0)
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
                      {...register('indiceActualizacion')}
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
                      {...register('frecuenciaActualizacion', { valueAsNumber: true })}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
                    />
                    {errors.frecuenciaActualizacion && (
                      <p className="mt-1 text-xs text-red-500">{errors.frecuenciaActualizacion.message}</p>
                    )}
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
                        setDetailFile(file);
                      }}
                      className="hidden"
                      id="detail-file-upload"
                    />
                    <label
                      htmlFor="detail-file-upload"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 px-4 py-3 text-xs text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span>{detailFile ? detailFile.name : 'Subir contrato (.pdf, .doc, .docx)'}</span>
                    </label>
                    {detailFile && (
                      <button
                        type="button"
                        onClick={() => setDetailFile(null)}
                        className="absolute right-2.5 top-2.5 rounded-lg p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingContract || isUploadingFile}
                  className="w-full cursor-pointer rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isCreatingContract || isUploadingFile ? 'Guardando...' : 'Crear y Pre-generar Facturación'}
                </button>
              </form>
            </div>
          )}
        </div>
        {/* Right Column: Billing / Payments or Expenses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Selector */}
          <div className="flex gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-850">
            <button
              onClick={() => setActiveTab('pagos')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wider transition-all duration-200 ${
                activeTab === 'pagos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Cronograma de Pagos
            </button>
            <button
              onClick={() => setActiveTab('gastos')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wider transition-all duration-200 ${
                activeTab === 'gastos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Gastos y Mantenimiento
            </button>
          </div>

          {activeTab === 'pagos' ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-6">
                <h3 className="text-base font-bold text-white">Cronograma de Pagos</h3>
                <p className="text-xs text-zinc-400">Registro mensual de cobros y facturación del contrato</p>
              </div>

              {!activeContract || !activeContract.pagos || activeContract.pagos.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No hay periodos de facturación generados. Vincula un contrato primero.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Year Tabs Selector */}
                  {paymentYears.length > 1 && (
                    <div className="flex flex-wrap gap-2 border-b border-zinc-900 pb-3">
                      {paymentYears.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setLocalSelectedYear(y);
                            setSelectedMonthPago(null);
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 border ${
                            selectedYear === y
                              ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                              : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Horizontal Timeline */}
                  <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto px-4 py-4 overflow-x-auto no-scrollbar">
                    {/* Connecting background line */}
                    <div className="absolute left-8 right-8 top-[34px] h-0.5 bg-zinc-900" />
                    
                    {paymentsForSelectedYear.map((p) => {
                      const [_, monthStr] = p.mesReferencia.split('-');
                      const monthIdx = parseInt(monthStr, 10) - 1;
                      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                      const monthName = monthNames[monthIdx] || monthStr;
                      const isPaid = p.estado === 'PAGADO';
                      const isSelected = activeMonthPago?.id === p.id;
                      
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedMonthPago(p)}
                          className="relative z-10 flex flex-col items-center focus:outline-none group px-2 cursor-pointer"
                        >
                          {/* Outer halo / circle */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                              isSelected
                                ? 'scale-110 shadow-lg shadow-blue-500/20'
                                : 'hover:scale-105'
                            } ${
                              isPaid
                                ? isSelected
                                  ? 'bg-emerald-500 border-emerald-450 text-white'
                                  : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 group-hover:border-emerald-450'
                                : isSelected
                                  ? 'bg-red-500 border-red-450 text-white'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 group-hover:border-zinc-600 group-hover:text-zinc-300'
                            }`}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="h-4.5 w-4.5" />
                            ) : (
                              <AlertCircle className="h-4.5 w-4.5" />
                            )}
                          </div>
                          {/* Label */}
                          <span
                            className={`mt-2 text-[10px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                              isSelected
                                ? 'text-white font-extrabold'
                                : 'text-zinc-500 group-hover:text-zinc-300'
                            }`}
                          >
                            {monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Month Detail Card */}
                  {activeMonthPago && (
                    <div className="rounded-2xl border border-zinc-850 bg-zinc-900/10 p-5 space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Período</span>
                          <h4 className="text-base font-bold text-white font-mono mt-0.5">
                            {activeMonthPago.mesReferencia}
                          </h4>
                        </div>
                        
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              activeMonthPago.estado === 'PAGADO'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {activeMonthPago.estado === 'PAGADO' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Cobrado
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" /> Pendiente
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-y border-zinc-900 py-3.5">
                        <div>
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Monto de Alquiler</span>
                          <p className="text-base font-bold text-white mt-1">
                            {formatCurrency(activeMonthPago.montoCobrado || activeContract.montoActual)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Fecha de Cobro</span>
                          <p className="text-xs font-mono text-zinc-400 mt-1.5">
                            {activeMonthPago.fechaPago
                              ? new Date(activeMonthPago.fechaPago).toLocaleDateString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'No registrado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        {activeMonthPago.estado !== 'PAGADO' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const fee = activeContract.montoActual;
                                const res = await fetch('/api/transacciones', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    tipo: 'INGRESO',
                                    monto: fee,
                                    descripcion: `Alquiler ${property.nombre} - Período ${activeMonthPago.mesReferencia}`,
                                    fecha: new Date().toISOString(),
                                    categoria: 'Alquileres',
                                    subcategoria: property.nombre,
                                    propiedadId: property.id,
                                    pagoId: activeMonthPago.id,
                                  }),
                                });

                                if (!res.ok) {
                                  const errData = await res.json();
                                  throw new Error(errData.error || 'Error al procesar cobro');
                                }

                                queryClient.invalidateQueries({ queryKey: ['properties'] });
                                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                                queryClient.invalidateQueries({ queryKey: ['analytics'] });
                                
                                setSelectedMonthPago({
                                  ...activeMonthPago,
                                  estado: 'PAGADO',
                                  fechaPago: new Date().toISOString(),
                                  montoCobrado: fee
                                });
                                alert('Pago cobrado exitosamente.');
                              } catch (err) {
                                const errorMsg = err instanceof Error ? err.message : 'Error al procesar el pago';
                                alert(errorMsg);
                              }
                            }}
                            className="cursor-pointer w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 text-center shadow-lg shadow-blue-500/20 active:scale-95"
                          >
                            Registrar Cobro
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPago(activeMonthPago)}
                            className="flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all duration-200 text-center active:scale-95"
                          >
                            <Printer className="h-3.5 w-3.5 text-zinc-400" /> Ver/Imprimir Recibo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <PropertyExpensesTab property={property} queryClient={queryClient} />
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceiptPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 print:bg-white print:p-0">
          <div
            id="print-receipt"
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-8 space-y-6 relative animate-in scale-in duration-200 print:border-none print:bg-white print:text-black print:shadow-none print:w-full print:max-w-none print:p-0"
          >
            {/* Styles for printing */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-receipt, #print-receipt * {
                  visibility: visible !important;
                }
                #print-receipt {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 24px !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                }
              }
            `}</style>

            {/* Header: Hide when printing */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 print:hidden">
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-5 w-5 text-blue-450" />
                <span className="text-sm font-semibold">Comprobante de Pago</span>
              </div>
              <button
                onClick={() => setSelectedReceiptPago(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="space-y-6 print:text-black print:bg-white">
              {/* Receipt Title */}
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold tracking-wider text-white print:text-black">RECIBO DE ALQUILER</h2>
                <p className="text-xs text-zinc-400 font-mono print:text-zinc-650">
                  Período: {selectedReceiptPago.mesReferencia}
                </p>
              </div>

              {/* Receipt Text */}
              <div className="border border-dashed border-zinc-850 p-5 rounded-xl bg-zinc-900/10 text-xs leading-relaxed space-y-4 print:border-zinc-300 print:bg-transparent print:text-black">
                <p>
                  Recibí de <strong className="text-white print:text-black">{activeContract?.inquilinoNombre}</strong> la suma de{' '}
                  <strong className="text-white print:text-black">
                    {formatCurrency(selectedReceiptPago.montoCobrado || activeContract?.montoActual || 0)} ARS
                  </strong>{' '}
                  en concepto de pago de alquiler para la propiedad ubicada en:{' '}
                  <strong className="text-white print:text-black">{property.direccion}</strong> ({property.nombre}).
                </p>
                <div className="flex justify-between border-t border-zinc-900/50 pt-4 text-[11px] text-zinc-400 print:border-zinc-300 print:text-zinc-650 font-mono">
                  <span>Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</span>
                  <span>
                    Fecha de Cobro:{' '}
                    {selectedReceiptPago.fechaPago
                      ? new Date(selectedReceiptPago.fechaPago).toLocaleDateString('es-AR')
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Signature and Amount Bar */}
              <div className="grid grid-cols-2 gap-4 items-end pt-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center print:border-zinc-300">
                  <span className="block text-[9px] uppercase tracking-wider text-zinc-500">Monto Cobrado</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 print:text-black">
                    {formatCurrency(selectedReceiptPago.montoCobrado || activeContract?.montoActual || 0)}
                  </span>
                </div>
                
                <div className="text-center space-y-2 pb-2">
                  <div className="border-b border-zinc-800 w-3/4 mx-auto print:border-zinc-400" />
                  <span className="block text-[9px] uppercase tracking-wider text-zinc-500">Firma Administración</span>
                </div>
              </div>
            </div>

            {/* Actions: Hide when printing */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedReceiptPago(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-850 hover:text-white transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all active:scale-95"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PropertyExpensesTabProps {
  property: Propiedad;
  queryClient: QueryClient;
}

function PropertyExpensesTab({ property, queryClient }: PropertyExpensesTabProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<'MANTENIMIENTO' | 'EXPENSA_EXTRAORDINARIA' | 'OTRO'>('MANTENIMIENTO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || !monto || Number(monto) <= 0) {
      alert('Por favor, completa la descripción y el monto con un valor mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/propiedades/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propiedadId: property.id,
          fecha,
          descripcion,
          monto: Number(monto),
          tipo,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al registrar el gasto');
      }

      alert('Gasto registrado exitosamente en la propiedad y el flujo de caja general.');
      setDescripcion('');
      setMonto('');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al registrar el gasto';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
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

  const gastos = property.gastos || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Form Card */}
      <div className="md:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Nuevo Gasto</h3>
          <p className="text-[10px] text-zinc-500">Registrar mantenimiento o expensa extraordinaria</p>
        </div>

        <form onSubmit={handleSubmitGasto} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-medium text-zinc-400">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-850 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-zinc-400">Tipo de Gasto</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'MANTENIMIENTO' | 'EXPENSA_EXTRAORDINARIA' | 'OTRO')}
              className="mt-1 w-full rounded-lg border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
            >
              <option value="MANTENIMIENTO">Mantenimiento / Reparación</option>
              <option value="EXPENSA_EXTRAORDINARIA">Expensa Extraordinaria</option>
              <option value="OTRO">Otros Gastos</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-zinc-400">Descripción</label>
            <input
              type="text"
              placeholder="e.g. Reparación calefón"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-zinc-400">Monto</label>
            <input
              type="number"
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-850 bg-zinc-900 p-2 text-xs font-mono text-white focus:border-zinc-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? 'Guardando...' : 'Registrar en Caja'}
          </button>
        </form>
      </div>

      {/* List Card */}
      <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Gastos</h3>
          <p className="text-[10px] text-zinc-500">Reparaciones y expensas a cargo de la propietaria</p>
        </div>

        {gastos.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-900 rounded-xl text-xs text-zinc-550">
            No se han registrado gastos para esta propiedad.
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[360px] pr-1.5 space-y-2.5">
            {gastos.map((g: GastoPropiedad) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{g.descripcion}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      g.tipo === 'MANTENIMIENTO'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {g.tipo === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Exp. Extraordinaria'}
                    </span>
                  </div>
                  <span className="block text-[10px] text-zinc-500 font-mono">
                    {new Date(g.fecha).toLocaleDateString('es-AR')}
                  </span>
                </div>

                <span className="font-mono text-xs font-bold text-red-400">
                  - {formatCurrency(g.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
