'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, ArrowRight, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('marcela_finance_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleQuickEnter = () => {
    localStorage.setItem('marcela_finance_session', 'authenticated');
    document.cookie = "marcela_finance_user=demo; path=/; max-age=31536000; SameSite=Lax";
    setIsAuthenticated(true);
    window.location.reload();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() === 'marcela' && password === 'brauruguay') {
      localStorage.setItem('marcela_finance_session', 'authenticated');
      document.cookie = "marcela_finance_user=marcela; path=/; max-age=31536000; SameSite=Lax";
      setIsAuthenticated(true);
      setError('');
      window.location.reload();
    } else {
      setError('Usuario o contraseña incorrectos');
    }
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

        <div className="w-full max-w-sm rounded-3xl border border-zinc-900 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
          
          {!showForm ? (
            /* Welcome / Quick Access View */
            <div className="space-y-6 text-center">
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

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleQuickEnter}
                  className="w-full group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-750 py-3.5 px-4 text-sm font-bold text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                >
                  <span>Ingresar al Panel (Demo)</span>
                  <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 py-3 px-4 text-xs font-semibold text-zinc-350 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                  Iniciar sesión con usuario
                </button>
              </div>

              <p className="text-[10px] text-zinc-650 font-mono">
                Versión Demo • Acceso directo disponible
              </p>
            </div>
          ) : (
            /* Credentials Form View */
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setError('');
                  }}
                  className="p-2 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition-colors"
                  title="Volver"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
                  <p className="text-[10px] text-zinc-500 font-medium">Ingresa las credenciales de Marcela</p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-center text-xs text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-550" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nombre de usuario"
                      className="w-full rounded-xl border border-zinc-900 bg-zinc-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-550" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-900 bg-zinc-900/60 py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-zinc-550 hover:text-zinc-350 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-600/10 cursor-pointer"
                >
                  Entrar
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    );
  }

  return <>{children}</>;
}
