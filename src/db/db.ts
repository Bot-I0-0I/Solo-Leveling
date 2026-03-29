import Dexie, { Table } from 'dexie';
import { toast } from 'sonner';

export interface UserStats {
  id: number;
  STR: number;
  VIT: number;
  AGI: number;
  INT: number;
  SEN: number;
  credits: number;
  xp: number;
  penaltyActive: boolean;
  lastResetDate: string;
  name?: string;
  avatar?: string;
  themeColor?: string;
  height?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  statPoints?: number;
  notes?: string;
  fitnessGoal?: 'lose' | 'maintain' | 'build';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface Quest {
  id?: number;
  title: string;
  attribute: 'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN';
  targetValue: number;
  currentValue: number;
  type: 'daily' | 'penalty';
  completed: boolean;
  date: string; // YYYY-MM-DD
  baseReward: number;
}

export interface Dungeon {
  id?: number;
  title: string;
  totalHealth: number;
  currentHealth: number;
  status: 'active' | 'cleared';
  shadowExtracted: boolean;
  rewardCredits?: number;
  rewardXp?: number;
}

export interface InventoryItem {
  id?: number;
  name: string;
  type: 'item' | 'shadow';
  attributeBoosts: Partial<Record<'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN', number>>;
  equipped: boolean;
}

export interface ShopItem {
  id?: number;
  name: string;
  cost: number;
  attributeBoosts: Partial<Record<'STR' | 'VIT' | 'AGI' | 'INT' | 'SEN', number>>;
  purchased: boolean;
}

export interface VesselLog {
  id?: number;
  date: string;
  weight?: number;
  bodyFat?: number;
  sleepHours?: number;
  stressLevel?: 1 | 2 | 3 | 4 | 5;
}

export interface WeeklyReview {
  id?: number;
  weekStartDate: string;
  accomplishments: string;
  challenges: string;
  intentions: string;
  status: 'pending' | 'completed';
}

export interface Task {
  id?: number;
  title: string;
  date: string;
  time: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  xpReward?: number;
}

export interface LedgerEntry {
  id?: number;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category?: string;
}

export interface NutritionLog {
  id?: number;
  date: string;
  type: 'food' | 'exercise' | 'water';
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  duration?: number;
  muscleGroup?: 'chest' | 'back' | 'legs' | 'arms' | 'shoulders' | 'core' | 'cardio';
  amount?: number; // For water in ml
}

export interface TacticalLog {
  id?: number;
  date: string;
  game: string;
  focusArea: string;
  result: 'win' | 'loss' | 'draw';
  kills: number;
  deaths: number;
  notes?: string;
}

export class SystemDatabase extends Dexie {
  userStats!: Table<UserStats, number>;
  quests!: Table<Quest, number>;
  dungeons!: Table<Dungeon, number>;
  inventory!: Table<InventoryItem, number>;
  shopItems!: Table<ShopItem, number>;
  vesselLogs!: Table<VesselLog, number>;
  weeklyReviews!: Table<WeeklyReview, number>;
  tasks!: Table<Task, number>;
  ledger!: Table<LedgerEntry, number>;
  nutritionLogs!: Table<NutritionLog, number>;
  tacticalLogs!: Table<TacticalLog, number>;

  constructor() {
    super('SystemDB');
    this.version(1).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
    });
    this.version(2).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
      weeklyReviews: '++id, weekStartDate, status'
    });
    this.version(3).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
      weeklyReviews: '++id, weekStartDate, status',
      tasks: '++id, date, completed',
      ledger: '++id, date, type'
    });
    this.version(4).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
      weeklyReviews: '++id, weekStartDate, status',
      tasks: '++id, date, completed',
      ledger: '++id, date, type'
    });
    this.version(5).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
      weeklyReviews: '++id, weekStartDate, status',
      tasks: '++id, date, completed',
      ledger: '++id, date, type',
      nutritionLogs: '++id, date, type'
    });
    this.version(6).stores({
      userStats: 'id',
      quests: '++id, date, type, completed',
      dungeons: '++id, status',
      inventory: '++id, type, equipped',
      shopItems: '++id, purchased',
      vesselLogs: '++id, date',
      weeklyReviews: '++id, weekStartDate, status',
      tasks: '++id, date, completed',
      ledger: '++id, date, type',
      nutritionLogs: '++id, date, type',
      tacticalLogs: '++id, date, game'
    });
  }
}

export const db = new SystemDatabase();

// Initialize default data
db.on('populate', async () => {
  await db.userStats.add({
    id: 1,
    STR: 10,
    VIT: 10,
    AGI: 10,
    INT: 10,
    SEN: 10,
    credits: 0,
    xp: 0,
    statPoints: 0,
    penaltyActive: false,
    lastResetDate: new Date().toISOString().split('T')[0],
  });

  await db.shopItems.bulkAdd([
    { name: 'Herman Miller Chair', cost: 5000, attributeBoosts: { INT: 10 }, purchased: false },
    { name: 'Mechanical Keyboard', cost: 1500, attributeBoosts: { AGI: 5 }, purchased: false },
    { name: 'Noise Cancelling Headphones', cost: 3000, attributeBoosts: { SEN: 8 }, purchased: false },
    { name: 'Premium Gym Pass', cost: 2000, attributeBoosts: { STR: 5, VIT: 5 }, purchased: false },
  ]);

  await db.quests.bulkAdd([
    { title: '100 Pushups', attribute: 'STR', targetValue: 100, currentValue: 0, type: 'daily', completed: false, date: new Date().toISOString().split('T')[0], baseReward: 50 },
    { title: '10km Run', attribute: 'VIT', targetValue: 10, currentValue: 0, type: 'daily', completed: false, date: new Date().toISOString().split('T')[0], baseReward: 100 },
    { title: 'Read 1 Chapter', attribute: 'INT', targetValue: 1, currentValue: 0, type: 'daily', completed: false, date: new Date().toISOString().split('T')[0], baseReward: 30 },
  ]);
});

export async function addXp(amount: number) {
  const stats = await db.userStats.get(1);
  if (!stats) return;

  const oldLevel = Math.floor(stats.xp / 1000) + 1;
  const newXp = stats.xp + amount;
  const newLevel = Math.floor(newXp / 1000) + 1;
  const levelsGained = newLevel - oldLevel;

  const updates: Partial<UserStats> = { xp: newXp };
  if (levelsGained > 0) {
    updates.statPoints = (stats.statPoints || 0) + (levelsGained * 3); // 3 points per level
    toast.success(`LEVEL UP! You reached level ${newLevel}. +${levelsGained * 3} Stat Points.`, {
      style: {
        background: '#141414',
        border: '1px solid #00F0FF',
        color: '#00F0FF',
        fontFamily: 'monospace'
      }
    });
  }

  await db.userStats.update(1, updates);
}
