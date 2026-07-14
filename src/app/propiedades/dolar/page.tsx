'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  RefreshCw, 
  ArrowLeftRight, 
  Calendar, 
  Info,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface DollarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export default function DolarPage() {
  const [rates, setRates] = useState<DollarRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculator states
  const [amount, setAmount] = useState<string>('1000');
  const [direction, setDirection] = useState<'ARS_TO_USD' | 'USD_TO_ARS'>('USD_TO_ARS');
  const [selectedType, setSelectedType] = useState<string>('blue');

  const fetchRates = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/dolar');
      if (!res.ok) {
        throw new Error('No se pudieron obtener las cotizaciones');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setRates(data);
      } else {
        throw new Error('Formato de datos incorrecto');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error de conexión';
      setError(errMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchRates();
    });

    // Auto-refresh every 2 minutes in background
    const interval = setInterval(() => {
      fetchRates(true);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchRates(true);
  };

  // Find rate helper
  const getRate = (type: string) => {
    return rates.find(r => r.casa === type);
  };

  // Calculator logic
  const activeRate = getRate(selectedType);
  const conversionResult = (() => {
    if (!activeRate || !amount || isNaN(parseFloat(amount))) return 0;
    const numAmount = parseFloat(amount);
    
    if (direction === 'USD_TO_ARS') {
      // Selling USD means we look at the buy price (compra)
      return numAmount * activeRate.compra;
    } else {
      // Buying USD means we look at the sell price (venta)
      return numAmount / activeRate.venta;
    }
  })();

  const formatCurrencyValue = (val: number, isUSD: boolean) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: isUSD ? 'USD' : 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
  };

  const getSpread = (rate: DollarRate) => {
    const diff = rate.venta - rate.compra;
    const pct = (diff / rate.compra) * 100;
    return { diff, pct };
  };

  const getBadgeStyle = (casa: string) => {
    switch (casa) {
      case 'blue':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'bolsa':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'oficial':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'tarjeta':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  // Main three dollars to display in large cards
  const primaryDollars = ['oficial', 'blue', 'bolsa']; // Bolsa is MEP

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-zinc-900 pb-5">
        <div className="space-y-1.5">
          <Link
            href="/propiedades"
            className="flex w-fit items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a Administración
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
              <DollarSign className="h-5.5 w-5.5" />
            </span>
            Cotización del Dólar
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Valores actualizados en tiempo real del dólar en Argentina (API de DolarApi)
          </p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-850 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-900 bg-zinc-950/20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-zinc-500 font-semibold">Cargando cotizaciones oficiales...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-red-500/10 bg-red-500/5 text-center text-red-400 space-y-3">
          <Info className="h-8 w-8 text-red-500" />
          <span className="text-sm font-semibold">{error}</span>
          <button
            onClick={() => fetchRates()}
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Dollars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {primaryDollars.map(casa => {
              const rate = getRate(casa);
              if (!rate) return null;

              const spread = getSpread(rate);
              const displayName = rate.casa === 'bolsa' ? 'Dólar MEP (Bolsa)' : rate.nombre;

              return (
                <div
                  key={rate.casa}
                  className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between h-52 hover:border-zinc-700 transition-all duration-300 shadow-md group"
                >
                  {/* Decorative background gradients */}
                  <div className={`absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-[0.03] blur-xl group-hover:opacity-[0.06] transition-all duration-500 ${
                    rate.casa === 'blue' ? 'bg-blue-500' : rate.casa === 'bolsa' ? 'bg-purple-500' : 'bg-emerald-500'
                  }`} />

                  {/* Top info row */}
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md uppercase font-mono tracking-wider ${getBadgeStyle(rate.casa)}`}>
                      {rate.casa === 'bolsa' ? 'MEP' : rate.casa}
                    </span>
                    <span className="text-[10px] text-zinc-550 font-mono font-medium">
                      Act: {new Date(rate.fechaActualizacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white tracking-wide mt-3 group-hover:text-blue-400 transition-colors">
                    {displayName}
                  </h3>

                  {/* Buy/Sell Prices */}
                  <div className="grid grid-cols-2 gap-4 mt-4 border-t border-zinc-900/60 pt-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Compra</span>
                      <span className="font-mono text-xl sm:text-2xl font-bold text-zinc-100">
                        {formatCurrencyValue(rate.compra, false).replace('ARS', '').trim()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Venta</span>
                      <span className="font-mono text-xl sm:text-2xl font-bold text-white">
                        {formatCurrencyValue(rate.venta, false).replace('ARS', '').trim()}
                      </span>
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 mt-3 pt-2 border-t border-zinc-950">
                    <span>Brecha: {formatCurrencyValue(spread.diff, false).replace('ARS', '').trim()}</span>
                    <span>•</span>
                    <span>{spread.pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calculator and Secondary Dollars Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Calculator Panel (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-blue-400">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Conversor de Divisas</h3>
                  <p className="text-xs text-zinc-500">Calcula conversiones al instante según la cotización seleccionada</p>
                </div>
              </div>

              {/* Calculator Form */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Amount Input */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider block">Monto a Convertir</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-500">
                        {direction === 'USD_TO_ARS' ? 'USD' : '$'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Ej. 100"
                        className="w-full rounded-xl border border-zinc-850 bg-zinc-900 py-2 pl-12 pr-3 text-xs font-mono text-white placeholder-zinc-700 focus:border-zinc-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Exchange Type Selection */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider block">Tipo de Dólar</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full rounded-xl border border-zinc-850 bg-zinc-900 px-3 py-2 text-xs font-medium text-white focus:border-zinc-700 focus:outline-none cursor-pointer"
                    >
                      {rates.map(r => {
                        const name = r.casa === 'bolsa' ? 'Dólar MEP (Bolsa)' : `Dólar ${r.nombre}`;
                        return (
                          <option key={r.casa} value={r.casa}>{name}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Direction Selector */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider block">Dirección</label>
                    <select
                      value={direction}
                    onChange={(e) => setDirection(e.target.value as 'ARS_TO_USD' | 'USD_TO_ARS')}
                    className="w-full rounded-xl border border-zinc-850 bg-zinc-900 px-3 py-2 text-xs font-medium text-white focus:border-zinc-700 focus:outline-none cursor-pointer"
                  >
                    <option value="USD_TO_ARS">Dólares a Pesos (Vender)</option>
                    <option value="ARS_TO_USD">Pesos a Dólares (Comprar)</option>
                    </select>
                  </div>
                </div>

                {/* Conversion Display Board */}
                <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Fórmula de Conversión</span>
                    <span className="text-zinc-400 text-xs">
                      {parseFloat(amount || '0').toLocaleString('es-AR')} {direction === 'USD_TO_ARS' ? 'USD' : 'ARS'} 
                      {' '}×{' '}
                      {activeRate ? (direction === 'USD_TO_ARS' ? activeRate.compra : activeRate.venta).toLocaleString('es-AR') : 0}
                    </span>
                  </div>
                  <div className="text-center sm:text-right space-y-1.5 shrink-0">
                    <span className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider block">Total Recibido</span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {formatCurrencyValue(conversionResult, direction === 'ARS_TO_USD')}
                    </h2>
                  </div>
                </div>

                {/* Informative disclaimer */}
                <div className="flex gap-2 p-3 bg-zinc-950/20 border border-zinc-900/60 rounded-xl text-[10.5px] leading-relaxed text-zinc-500">
                  <Info className="h-4.5 w-4.5 text-blue-500/80 shrink-0 mt-0.5" />
                  <span>
                    El cálculo utiliza la cotización de <strong>Compra</strong> para convertir de USD a ARS (ya que le estás vendiendo tus dólares a una entidad), y la de <strong>Venta</strong> para convertir de ARS a USD (ya que estás adquiriendo dólares).
                  </span>
                </div>
              </div>
            </div>

            {/* Other Dollars Panel (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-purple-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Otras Cotizaciones</h3>
                  <p className="text-xs text-zinc-500 font-medium">Otros dólares del mercado local</p>
                </div>
              </div>

              {/* List of other dollars */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {rates
                  .filter(r => !primaryDollars.includes(r.casa))
                  .map(rate => {
                    const spread = getSpread(rate);
                    return (
                      <div
                        key={rate.casa}
                        className="flex flex-col p-3 rounded-xl border border-zinc-900 bg-zinc-950/60 text-xs space-y-2 hover:border-zinc-850 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white leading-none">{rate.nombre}</span>
                          <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded uppercase font-mono tracking-wider ${getBadgeStyle(rate.casa)}`}>
                            {rate.casa}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 font-mono mt-1 text-[11px]">
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-sans">Compra</span>
                            <span className="text-zinc-300 font-semibold">{formatCurrencyValue(rate.compra, false).replace('ARS', '').trim()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-sans">Venta</span>
                            <span className="text-white font-bold">{formatCurrencyValue(rate.venta, false).replace('ARS', '').trim()}</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-1.5 border-t border-zinc-900/30">
                          <span>Brecha: {spread.pct.toFixed(1)}%</span>
                          <span>Act: {new Date(rate.fechaActualizacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
