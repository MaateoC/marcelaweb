'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, ArrowRight } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('marcela_finance_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('marcela_finance_session', 'authenticated');
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4 overflow-y-auto select-none">
        {/* Abstract glowing graphics */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 text-center">
          <div className="space-y-4">
            {/* Logo box */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20 animate-pulse">
              <Wallet className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Marcela | Finance</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-2">
                Control unificado de finanzas personales, servicios locales y contratos de alquiler.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogin}
              className="w-full group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-750 py-3.5 px-4 text-sm font-bold text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
            >
              <span>Ingresar al Panel</span>
              <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>

          <p className="text-[10px] text-zinc-650 font-mono">
            Versión Demo • Acceso directo sin contraseña
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
