import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RANK_TIERS = [
  { minLevel: 100, rank: 'Monarch', color: '#fbbf24', themeUnlock: 'monarch' },
  { minLevel: 90, rank: 'National', color: '#fcd34d', themeUnlock: 'none' },
  { minLevel: 80, rank: 'SSS', color: '#ef4444', themeUnlock: 'none' },
  { minLevel: 70, rank: 'SS', color: '#f43f5e', themeUnlock: 'none' },
  { minLevel: 60, rank: 'S+', color: '#d946ef', themeUnlock: 'none' },
  { minLevel: 50, rank: 'S', color: '#a855f7', themeUnlock: 's_class' },
  { minLevel: 40, rank: 'Elite', color: '#6366f1', themeUnlock: 'none' },
  { minLevel: 30, rank: 'A', color: '#3b82f6', themeUnlock: 'none' },
  { minLevel: 20, rank: 'B', color: '#0ea5e9', themeUnlock: 'none' },
  { minLevel: 10, rank: 'C', color: '#10b981', themeUnlock: 'none' },
  { minLevel: 5, rank: 'D', color: '#22c55e', themeUnlock: 'none' },
  { minLevel: 0, rank: 'Rookie', color: '#a3a3a3', themeUnlock: 'none' }
];

export function getRank(level: number) {
  const cappedLevel = Math.min(level, 100);
  return RANK_TIERS.find(t => cappedLevel >= t.minLevel) || RANK_TIERS[RANK_TIERS.length - 1];
}
