import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function calculatePercentageChange(actual: number, previous: number): number {
  if (previous === 0) {
    return actual === 0 ? 0 : 100;
  }
  return ((actual - previous) / previous) * 100;
}

export function getMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getRelativeMonths(date: Date, offset: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + offset);
  return getMonthString(d);
}
