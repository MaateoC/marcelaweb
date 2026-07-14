'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  TrendingUp, 
  Wallet, 
  Calculator,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Calendar,
  CreditCard,
  Settings,
  Bell,
  X,
  PiggyBank,
  DollarSign,
  LogOut
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const sections = [
    {
      id: 'finanzas',
      title: 'Finanzas',
      icon: Wallet,
      items: [
        { name: 'Ingresos y gastos', href: '/finanzas', icon: Wallet },
        { name: 'Gastos Fijos y Suscripciones', href: '/finanzas/gastos-fijos', icon: CreditCard },
        { name: 'Impuestos y Servicios', href: '/finanzas/impuestos', icon: Calculator },
        { name: 'Calendario de Vencimientos', href: '/finanzas/calendario', icon: Calendar },
        { name: 'Metas de ahorro', href: '/finanzas/metas', icon: PiggyBank },
      ],
    },
    {
      id: 'administracion',
      title: 'Administración',
      icon: Briefcase,
      items: [
        { name: 'Alquileres', href: '/propiedades', icon: Building2 },
        { name: 'Simulación', href: '/propiedades/simulacion', icon: Calculator },
        { name: 'Dólar', href: '/propiedades/dolar', icon: DollarSign },
      ],
    },
    {
      id: 'metricas',
      title: 'Métricas',
      icon: TrendingUp,
      items: [
        { name: 'Finanzas personales', href: '/metricas/finanzas', icon: Wallet },
      ],
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      icon: Settings,
      items: [
        { name: 'Tarjetas asociadas', href: '/configuracion/tarjetas', icon: CreditCard },
      ],
    },
  ];

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    finanzas: false,
    administracion: false,
    metricas: false,
    configuracion: false,
  });

  // Automatically expand the section that contains the active route
  useEffect(() => {
    sections.forEach((section) => {
      const hasActiveChild = section.items.some((item) => {
        return item.href === '/finanzas'
          ? pathname === '/finanzas'
          : pathname.startsWith(item.href);
      });

      if (hasActiveChild) {
        setExpandedSections((prev) => ({
          ...prev,
          [section.id]: true,
        }));
      }
    });
  }, [pathname]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Notifications Center State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // Load dismissed and read notifications from localStorage on mount
  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem('dismissed_notifications');
      if (savedDismissed) {
        setDismissedIds(JSON.parse(savedDismissed));
      }
      const savedRead = localStorage.getItem('read_notifications');
      if (savedRead) {
        setReadIds(JSON.parse(savedRead));
      }
    } catch (e) {
      console.error('Error loading notifications local state', e);
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = () => {
    setIsLoadingNotifications(true);
    fetch('/api/notificaciones')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
        setIsLoadingNotifications(false);
      })
      .catch((err) => {
        console.error('Error fetching notifications:', err);
        setIsLoadingNotifications(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 5 minutes in background
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('read_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRestoreAll = () => {
    setDismissedIds([]);
    setReadIds([]);
    try {
      localStorage.removeItem('dismissed_notifications');
      localStorage.removeItem('read_notifications');
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = () => {
    const activeIds = activeNotifications.map((n) => n.id);
    const updated = [...readIds, ...activeIds];
    const uniqueUpdated = Array.from(new Set(updated));
    setReadIds(uniqueUpdated);
    try {
      localStorage.setItem('read_notifications', JSON.stringify(uniqueUpdated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = () => {
    const activeIds = activeNotifications.map((n) => n.id);
    const updated = [...dismissedIds, ...activeIds];
    const uniqueUpdated = Array.from(new Set(updated));
    setDismissedIds(uniqueUpdated);
    try {
      localStorage.setItem('dismissed_notifications', JSON.stringify(uniqueUpdated));
    } catch (e) {
      console.error(e);
    }
  };

  const activeNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));
  const unreadNotifications = activeNotifications.filter((n) => !readIds.includes(n.id));

  return (
    <aside className="fixed top-0 bottom-0 left-0 z-40 hidden w-64 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md p-6 md:flex flex-col justify-between">
      {/* Upper Logo Section */}
      <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 relative pb-3 border-b border-zinc-900/60">
        <Link href="/finanzas" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-tight text-xs leading-none">
              Marcela <span className="text-blue-500">| Finance</span>
            </span>
            <span className="text-[9px] text-zinc-550 font-semibold mt-0.5">Control Financiero</span>
          </div>
        </Link>

        {/* Bell Icon Notification center */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-800 transition-all cursor-pointer ${
              isOpen ? 'border-zinc-700 bg-zinc-900 text-white' : ''
            }`}
          >
            <Bell className={`h-4 w-4 ${unreadNotifications.length > 0 ? 'text-amber-500' : ''}`} />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 font-mono text-[8px] font-bold text-white shadow-lg">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown Panel */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsOpen(false)} 
              />
              
              <div className="absolute left-full ml-3 top-[-10px] w-80 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notificaciones</span>
                    {unreadNotifications.length > 0 && (
                      <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold text-blue-400">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </div>
                </div>

                {isLoadingNotifications ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : activeNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold">
                      ✓
                    </div>
                    <p className="text-[11px] font-semibold text-white">¡Todo al día!</p>
                    <p className="text-[9px] text-zinc-550 leading-relaxed max-w-[200px]">No tienes alertas financieras ni vencimientos pendientes.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {activeNotifications.map((notif) => {
                      const isRead = readIds.includes(notif.id);
                      return (
                        <div 
                          key={notif.id}
                          className="group relative flex items-start gap-2.5 p-2 rounded-lg border border-zinc-900 bg-zinc-950/60 hover:bg-zinc-900/30 hover:border-zinc-850 transition-all duration-150"
                        >
                          <div className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-zinc-900 items-center justify-center">
                            <span className={`h-1.5 w-1.5 rounded-full transition-all ${
                              isRead ? 'bg-zinc-700' :
                              notif.tipo === 'ALQUILER' ? 'bg-emerald-500' :
                              notif.tipo === 'IMPUESTO' ? 'bg-purple-500' :
                              notif.tipo === 'SUSCRIPCION' ? 'bg-blue-500' :
                              notif.tipo === 'AJUSTE' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <Link 
                              href={notif.link}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className={`text-[10px] block transition-colors leading-snug ${
                                isRead ? 'font-medium text-zinc-550 hover:text-zinc-400' : 'font-bold text-white hover:text-blue-400'
                              }`}
                            >
                              {notif.titulo}
                            </Link>
                            <p className={`text-[9px] mt-0.5 leading-relaxed font-medium break-words transition-colors ${
                              isRead ? 'text-zinc-600' : 'text-zinc-400'
                            }`}>
                              {notif.detalle}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDismiss(notif.id)}
                            className="opacity-0 group-hover:opacity-100 absolute right-1.5 top-1.5 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-850 transition-all cursor-pointer"
                            title="Descartar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Popover actions footer */}
                {(activeNotifications.length > 0 || dismissedIds.length > 0 || readIds.length > 0) && (
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5 mt-3 text-[9px] font-bold uppercase tracking-wider gap-2">
                    <div className="flex items-center gap-3">
                      {unreadNotifications.length > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                      {activeNotifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-red-500/80 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>
                    {(dismissedIds.length > 0 || readIds.length > 0) && (
                      <button
                        onClick={handleRestoreAll}
                        className="text-zinc-550 hover:text-zinc-350 transition-colors cursor-pointer ml-auto"
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

        {/* Navigation List Accordion */}
        <nav className="space-y-4">

          {sections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections[section.id];

            return (
              <div key={section.id} className="space-y-1">
                {/* Large Collapsible Category Header Button */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-200 hover:text-white hover:bg-zinc-900/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon className="h-4.5 w-4.5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                    <span>{section.title}</span>
                  </div>
                  <div className="text-zinc-500 group-hover:text-zinc-300">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Subsections List (Indented & Connected by left border line) */}
                {isExpanded && (
                  <div className="ml-5 pl-4 border-l border-zinc-900 space-y-1.5 mt-1.5 transition-all duration-300 animate-in fade-in slide-in-from-top-1">
                    {section.items.map((item) => {
                      const isActive = (() => {
                        if (item.href === '/propiedades') {
                          return pathname === '/propiedades' || (pathname.startsWith('/propiedades/') && pathname !== '/propiedades/simulacion' && pathname !== '/propiedades/dolar');
                        }
                        return pathname === item.href;
                      })();

                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 group ${
                            isActive
                              ? 'bg-zinc-900 text-white border-l-2 border-blue-500 pl-2'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                          }`}
                        >
                          <ItemIcon
                            className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                              isActive
                                ? item.name === 'Ingresos y gastos'
                                  ? 'text-emerald-400'
                                  : item.name === 'Impuestos y Servicios'
                                  ? 'text-amber-400'
                                  : 'text-blue-500'
                                : 'text-zinc-500 group-hover:text-zinc-300'
                            }`}
                          />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Logout Button */}
      <button
        onClick={() => {
          localStorage.removeItem('marcela_finance_session');
          window.location.reload();
        }}
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer border border-transparent hover:border-red-950/30 mb-2"
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar Sesión</span>
      </button>

      {/* Footer Info with Status Dot */}
      <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Localización</span>
          <span className="text-xs text-zinc-400 font-semibold mt-0.5">Rosario, Santa Fe</span>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded-full px-2 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-mono font-bold text-zinc-400">Online</span>
        </div>
      </div>
    </aside>
  );
}
