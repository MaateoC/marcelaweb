'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, Building2, TrendingUp, Calculator } from 'lucide-react';

export function MobileNavbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Finanzas', href: '/finanzas', icon: Wallet },
    { name: 'Impuestos', href: '/finanzas/impuestos', icon: Calculator },
    { name: 'Alquileres', href: '/propiedades', icon: Building2 },
    { name: 'Métricas', href: '/metricas', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-900 py-2 px-1 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : item.href === '/finanzas'
            ? pathname === '/finanzas'
            : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition-all duration-200 ${
              isActive ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <div
              className={`flex items-center justify-center p-1 rounded-lg ${
                isActive
                  ? item.name === 'Finanzas'
                    ? 'bg-blue-500/10 text-blue-400'
                    : item.name === 'Impuestos'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-blue-500/10 text-blue-400'
                  : 'text-zinc-500'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
