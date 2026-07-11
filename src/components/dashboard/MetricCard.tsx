'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  variation: number;
  comparisonLabel: string;
  icon: LucideIcon;
  type?: 'positive' | 'negative' | 'neutral'; // determines if increase is good or bad
}

export function MetricCard({
  title,
  value,
  variation,
  comparisonLabel,
  icon: Icon,
  type = 'positive',
}: MetricCardProps) {
  const isIncrease = variation >= 0;
  
  // Determine color matching whether the variation is positive or negative for this card
  let isGood = isIncrease;
  if (type === 'negative') {
    isGood = !isIncrease; // For expenses, increase is bad, decrease is good
  }

  const trendColor = isGood ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10';
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all duration-300 hover:translate-y-[-2px] hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40">
      {/* Background radial gradient glow */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">{title}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-3xl font-bold font-mono tracking-tight text-white">
          {formatCurrency(value)}
        </h3>
        
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {formatPercent(variation)}
          </span>
          <span className="text-xs text-zinc-500">{comparisonLabel}</span>
        </div>
      </div>
    </div>
  );
}
