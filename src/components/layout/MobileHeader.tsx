'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Wallet, 
  Building2, 
  Settings,
  Calendar,
  Calculator,
  PiggyBank,
  DollarSign,
  CreditCard,
  Layers,
  LogOut
} from 'lucide-react';

export function MobileHeader() {
  const pathname = usePathname();

  // Define subsections for each main area
  const finanzasTabs = [
    { name: 'Transacciones', href: '/finanzas', icon: Wallet },
    { name: 'Gastos Fijos', href: '/finanzas/gastos-fijos', icon: Calendar },
    { name: 'Impuestos', href: '/finanzas/impuestos', icon: Calculator },
    { name: 'Vencimientos', href: '/finanzas/calendario', icon: Calendar },
    { name: 'Metas', href: '/finanzas/metas', icon: PiggyBank },
  ];

  const propiedadesTabs = [
    { name: 'Alquileres', href: '/propiedades', icon: Building2 },
    { name: 'Simulación', href: '/propiedades/simulacion', icon: Calculator },
    { name: 'Dólar', href: '/propiedades/dolar', icon: DollarSign },
  ];

  const configuracionTabs = [
    { name: 'Tarjetas', href: '/configuracion/tarjetas', icon: CreditCard },
  ];

  const metricasTabs = [
    { name: 'Resumen Finanzas', href: '/metricas/finanzas', icon: Wallet },
    { name: 'Alquileres', href: '/metricas/alquileres', icon: Building2 },
  ];

  // Determine active section and tabs
  let activeSectionTitle = '';
  let activeSectionIcon: React.ReactNode = null;
  let tabs: typeof finanzasTabs = [];

  if (pathname.startsWith('/finanzas')) {
    activeSectionTitle = 'Finanzas';
    activeSectionIcon = <Wallet className="h-4 w-4 text-blue-400" />;
    tabs = finanzasTabs;
  } else if (pathname.startsWith('/propiedades')) {
    activeSectionTitle = 'Administración';
    activeSectionIcon = <Building2 className="h-4 w-4 text-purple-400" />;
    tabs = propiedadesTabs;
  } else if (pathname.startsWith('/configuracion')) {
    activeSectionTitle = 'Configuración';
    activeSectionIcon = <Settings className="h-4 w-4 text-zinc-400" />;
    tabs = configuracionTabs;
  } else if (pathname.startsWith('/metricas')) {
    activeSectionTitle = 'Métricas';
    activeSectionIcon = <Layers className="h-4 w-4 text-indigo-400" />;
    tabs = metricasTabs;
  } else {
    // Other pages
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md md:hidden">
      <div className="flex flex-col px-4 py-2.5 gap-2.5">
        {/* Top title area */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight text-xs">
              Marcela <span className="text-blue-500">| Finance</span>
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('marcela_finance_session');
                document.cookie = "marcela_finance_user=; path=/; max-age=0; SameSite=Lax";
                window.location.reload();
              }}
              className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-900/60 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
            {activeSectionIcon}
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
              {activeSectionTitle}
            </span>
          </div>
        </div>

        {/* Horizontal tabs */}
        {tabs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = tab.href === '/finanzas' 
                ? pathname === '/finanzas' 
                : tab.href === '/propiedades'
                ? pathname === '/propiedades'
                : pathname === tab.href;

              const Icon = tab.icon;

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-1.5 shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner shadow-black/20'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
