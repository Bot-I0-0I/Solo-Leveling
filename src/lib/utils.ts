import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRank(level: number) {
  const cappedLevel = Math.min(level, 100);
  
  // No heavy animations to save GPU
  if (cappedLevel >= 100) return { rank: 'Monarch', color: '#fbbf24', themeUnlock: 'monarch' }; // Amber
  if (cappedLevel >= 90) return { rank: 'National', color: '#fcd34d', themeUnlock: 'national' }; // Yellow
  if (cappedLevel >= 80) return { rank: 'SSS', color: '#ef4444', themeUnlock: 'sss' }; // Red
  if (cappedLevel >= 70) return { rank: 'SS', color: '#f43f5e', themeUnlock: 'ss' }; // Rose
  if (cappedLevel >= 60) return { rank: 'S+', color: '#d946ef', themeUnlock: 's_plus' }; // Fuchsia
  if (cappedLevel >= 50) return { rank: 'S', color: '#a855f7', themeUnlock: 's' }; // Purple
  if (cappedLevel >= 40) return { rank: 'Elite', color: '#6366f1', themeUnlock: 'elite' }; // Indigo
  if (cappedLevel >= 30) return { rank: 'A', color: '#3b82f6', themeUnlock: 'none' }; // Blue
  if (cappedLevel >= 20) return { rank: 'B', color: '#0ea5e9', themeUnlock: 'none' }; // Sky
  if (cappedLevel >= 10) return { rank: 'C', color: '#10b981', themeUnlock: 'none' }; // Emerald
  if (cappedLevel >= 5) return { rank: 'D', color: '#22c55e', themeUnlock: 'none' }; // Green
  return { rank: 'Rookie', color: '#a3a3a3', themeUnlock: 'none' }; // Gray
}
