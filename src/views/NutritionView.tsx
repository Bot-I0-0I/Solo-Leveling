import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { Flame, Utensils, Activity, Plus, Trash2, Target, Dumbbell, Droplets, Beef, Wheat, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, subDays } from 'date-fns';

export function NutritionView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const vesselLogs = useLiveQuery(() => db.vesselLogs.toArray());
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const nutritionLogs = useLiveQuery(
    () => db.nutritionLogs.where('date').equals(today).toArray(),
    [today]
  );

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
  const recentExerciseLogs = useLiveQuery(
    () => db.nutritionLogs
      .where('date').anyOf(last7Days)
      .filter(log => log.type === 'exercise' && !!log.muscleGroup)
      .toArray(),
    [last7Days]
  );

  const [activeTab, setActiveTab] = useState<'food' | 'exercise' | 'water'>('food');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [duration, setDuration] = useState('');
  const [amount, setAmount] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<'chest' | 'back' | 'legs' | 'arms' | 'shoulders' | 'core' | 'cardio' | ''>('');
  const [sleepHours, setSleepHours] = useState('');

  if (!userStats || !nutritionLogs) return <div className="animate-pulse p-4">Loading Metabolism...</div>;

  const themeColor = userStats.themeColor || '#00F0FF';

  // Calculate BMR and TDEE
  const latestLog = vesselLogs?.[vesselLogs.length - 1];
  const currentWeight = latestLog?.weight;
  
  let bmr = 0;
  if (currentWeight && userStats.height && userStats.age && userStats.gender) {
    if (userStats.gender === 'male') {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) + 5;
    } else if (userStats.gender === 'female') {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) - 161;
    } else {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) - 78; // average
    }
  }

  // Activity Multiplier
  let activityMultiplier = 1.2; // sedentary
  switch (userStats.activityLevel) {
    case 'light': activityMultiplier = 1.375; break;
    case 'moderate': activityMultiplier = 1.55; break;
    case 'active': activityMultiplier = 1.725; break;
    case 'very_active': activityMultiplier = 1.9; break;
  }

  const tdee = bmr * activityMultiplier;

  // Goal Modifier
  let goalModifier = 0;
  let goalLabel = 'MAINTAIN WEIGHT';
  let proteinMultiplier = 1.8;
  let fatMultiplier = 1.0;

  if (userStats.fitnessGoal === 'lose') {
    goalModifier = -500;
    goalLabel = 'LOSE WEIGHT / CUT';
    proteinMultiplier = 2.4; // High protein to preserve muscle
    fatMultiplier = 0.8;
  } else if (userStats.fitnessGoal === 'build') {
    goalModifier = 500;
    goalLabel = 'BUILD MUSCLE / BULK';
    proteinMultiplier = 2.2;
    fatMultiplier = 0.8;
  }

  const targetCalories = Math.round(tdee + goalModifier);
  
  // Target Macros
  let targetProtein = 0;
  let targetFat = 0;
  let targetCarbs = 0;

  if (currentWeight) {
    targetProtein = Math.round(currentWeight * proteinMultiplier);
    targetFat = Math.round(currentWeight * fatMultiplier);
    const remainingCals = targetCalories - (targetProtein * 4) - (targetFat * 9);
    targetCarbs = Math.max(0, Math.round(remainingCals / 4));
  }

  const consumedCalories = nutritionLogs.filter(log => log.type === 'food').reduce((acc, log) => acc + log.calories, 0);
  const burnedCalories = nutritionLogs.filter(log => log.type === 'exercise').reduce((acc, log) => acc + log.calories, 0);
  const consumedProtein = nutritionLogs.filter(log => log.type === 'food').reduce((acc, log) => acc + (log.protein || 0), 0);
  const consumedCarbs = nutritionLogs.filter(log => log.type === 'food').reduce((acc, log) => acc + (log.carbs || 0), 0);
  const consumedFat = nutritionLogs.filter(log => log.type === 'food').reduce((acc, log) => acc + (log.fat || 0), 0);
  const consumedWater = nutritionLogs.filter(log => log.type === 'water').reduce((acc, log) => acc + (log.amount || 0), 0);
  
  const netCalories = consumedCalories - burnedCalories;
  const remainingCalories = targetCalories - netCalories;

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'water') {
      if (!amount) return;
      await db.nutritionLogs.add({
        date: today,
        type: 'water',
        name: 'Water',
        calories: 0,
        amount: parseInt(amount)
      });
      setAmount('');
      return;
    }

    if (!name || !calories) return;

    await db.nutritionLogs.add({
      date: today,
      type: activeTab,
      name,
      calories: parseInt(calories),
      protein: protein ? parseInt(protein) : undefined,
      carbs: carbs ? parseInt(carbs) : undefined,
      fat: fat ? parseInt(fat) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      muscleGroup: activeTab === 'exercise' && muscleGroup ? (muscleGroup as any) : undefined,
    });

    if (activeTab === 'exercise') {
      await addXp(parseInt(calories) / 10); // 1 XP per 10 calories burned
    }

    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setDuration('');
    setMuscleGroup('');
  };

  const handleDelete = async (id: number) => {
    await db.nutritionLogs.delete(id);
  };

  const handleLogSleep = async () => {
    if (!sleepHours) return;
    const existing = vesselLogs?.find(l => l.date === today);
    if (existing) {
      await db.vesselLogs.update(existing.id!, { sleepHours: parseFloat(sleepHours) });
    } else {
      await db.vesselLogs.add({ date: today, sleepHours: parseFloat(sleepHours) });
    }
    setSleepHours('');
  };

  // Calculate Muscle Load
  const muscleLoad: Record<string, number> = {
    chest: 0, back: 0, legs: 0, arms: 0, shoulders: 0, core: 0, cardio: 0
  };
  
  if (recentExerciseLogs) {
    recentExerciseLogs.forEach(log => {
      if (log.muscleGroup) {
        // Use duration as primary load metric, fallback to calories / 10 if no duration
        const load = log.duration ? log.duration : (log.calories / 10);
        muscleLoad[log.muscleGroup] += load;
      }
    });
  }

  const maxLoad = Math.max(...Object.values(muscleLoad), 100); // Minimum scale of 100

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="border-b border-[#262626] pb-4 md:pb-6">
        <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <Flame className="w-6 h-6 md:w-8 md:h-8 mr-3" style={{ color: themeColor }} />
          METABOLIC ENGINE
        </h2>
        <p className="text-[#A3A3A3] text-xs md:text-sm mt-1">Advanced tracking for caloric intake, macros, and physical exertion.</p>
      </header>

      {/* Professional Dashboard */}
      {bmr > 0 ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-mono text-white flex items-center">
                <Target className="w-5 h-5 mr-2" style={{ color: themeColor }} />
                DAILY TARGET: {goalLabel}
              </h3>
              <p className="text-xs text-[#A3A3A3] font-mono mt-1">
                TDEE: {Math.round(tdee)} kcal | BMR: {Math.round(bmr)} kcal
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-3xl font-mono text-white">
                {netCalories} <span className="text-sm text-[#A3A3A3]">/ {targetCalories} kcal</span>
              </div>
              <div className={cn("text-xs font-mono mt-1", remainingCalories >= 0 ? "text-green-400" : "text-red-400")}>
                {remainingCalories >= 0 ? `${remainingCalories} REMAINING` : `${Math.abs(remainingCalories)} OVER LIMIT`}
              </div>
            </div>
          </div>

          {/* Calorie Progress Bar */}
          <div className="w-full bg-[#0A0A0A] rounded-full h-3 mb-8 border border-[#262626] overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${targetCalories > 0 ? Math.min((netCalories / targetCalories) * 100, 100) : 0}%`,
                backgroundColor: netCalories > targetCalories ? '#ef4444' : themeColor 
              }}
            />
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Protein */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-[#A3A3A3] flex items-center">
                  <Beef className="w-3 h-3 mr-1 text-red-400" /> PROTEIN
                </span>
                <span className="text-xs font-mono text-white">{consumedProtein} / {targetProtein}g</span>
              </div>
              <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${targetProtein > 0 ? Math.min((consumedProtein / targetProtein) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-[#A3A3A3] flex items-center">
                  <Wheat className="w-3 h-3 mr-1 text-yellow-400" /> CARBS
                </span>
                <span className="text-xs font-mono text-white">{consumedCarbs} / {targetCarbs}g</span>
              </div>
              <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${targetCarbs > 0 ? Math.min((consumedCarbs / targetCarbs) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-[#A3A3A3] flex items-center">
                  <Droplets className="w-3 h-3 mr-1 text-blue-400" /> FAT
                </span>
                <span className="text-xs font-mono text-white">{consumedFat} / {targetFat}g</span>
              </div>
              <div className="w-full bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${targetFat > 0 ? Math.min((consumedFat / targetFat) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 text-center">
          <p className="text-[#A3A3A3] font-mono text-sm">Update your Height, Age, Gender, Weight, and Goals in Settings & Status to unlock the Metabolic Engine.</p>
        </div>
      )}

      {/* Summary Cards (Consumed vs Burned vs Water) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3]">CONSUMED</span>
            <Utensils className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl md:text-3xl font-mono text-white">{consumedCalories} <span className="text-[10px] md:text-sm text-[#A3A3A3]">kcal</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3]">BURNED</span>
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl md:text-3xl font-mono text-white">{burnedCalories} <span className="text-[10px] md:text-sm text-[#A3A3A3]">kcal</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3]">HYDRATION</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl md:text-3xl font-mono text-white">{consumedWater} <span className="text-[10px] md:text-sm text-[#A3A3A3]">ml</span></div>
        </div>
      </div>

      {/* Muscle Load Visualization */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
        <h3 className="text-lg font-mono text-white mb-4 flex items-center">
          <Dumbbell className="w-5 h-5 mr-2" style={{ color: themeColor }} />
          MUSCLE LOAD (7-DAY ESTIMATION)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {Object.entries(muscleLoad).map(([muscle, load]) => {
            const percentage = Math.min((load / maxLoad) * 100, 100);
            return (
              <div key={muscle} className="flex items-center">
                <div className="w-24 text-xs font-mono text-[#A3A3A3] uppercase">{muscle}</div>
                <div className="flex-1 h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#262626]">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: percentage > 75 ? '#ef4444' : percentage > 40 ? '#eab308' : themeColor
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleep & Recovery Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
        <h3 className="text-lg font-mono text-white mb-4 flex items-center">
          <Moon className="w-5 h-5 mr-2 text-indigo-400" />
          SLEEP & RECOVERY
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-3xl font-mono text-white mb-2">
              {latestLog?.sleepHours || 0} <span className="text-sm text-[#A3A3A3]">hrs logged today</span>
            </div>
            <p className="text-xs text-[#A3A3A3] font-mono leading-relaxed">
              Optimal sleep (7-9 hours) is critical for metabolic health, muscle recovery, and cognitive function. Lack of sleep increases cortisol and decreases insulin sensitivity, hindering fat loss and muscle growth.
            </p>
          </div>
          <div className="flex items-end">
            <div className="w-full">
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">LOG SLEEP (HOURS)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="e.g., 7.5"
                />
                <button 
                  onClick={handleLogSleep}
                  className="bg-[#262626] hover:bg-[#333] text-white px-4 py-2 rounded-md font-mono text-sm transition-colors border border-[#262626] hover:border-indigo-400"
                >
                  LOG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Input Form */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <div className="flex space-x-4 mb-6 border-b border-[#262626]">
            <button
              onClick={() => setActiveTab('food')}
              className={cn(
                "pb-2 text-sm font-mono transition-colors relative",
                activeTab === 'food' ? "text-white" : "text-[#A3A3A3] hover:text-white"
              )}
            >
              LOG NUTRITION
              {activeTab === 'food' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: themeColor }}></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('exercise')}
              className={cn(
                "pb-2 text-sm font-mono transition-colors relative",
                activeTab === 'exercise' ? "text-white" : "text-[#A3A3A3] hover:text-white"
              )}
            >
              LOG EXERTION
              {activeTab === 'exercise' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: themeColor }}></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={cn(
                "pb-2 text-sm font-mono transition-colors relative",
                activeTab === 'water' ? "text-white" : "text-[#A3A3A3] hover:text-white"
              )}
            >
              HYDRATION
              {activeTab === 'water' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: themeColor }}></span>
              )}
            </button>
          </div>

          <form onSubmit={handleAddLog} className="space-y-4">
            {activeTab === 'water' ? (
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">AMOUNT (ml)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                  placeholder="e.g., 250"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">
                    {activeTab === 'food' ? 'FOOD / MEAL NAME' : 'EXERCISE / ACTIVITY'}
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                    placeholder={activeTab === 'food' ? "e.g., Grilled Chicken Salad" : "e.g., 5km Run"}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">CALORIES</label>
                    <input 
                      type="number" 
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                      placeholder="kcal"
                      required
                    />
                  </div>
                  
                  {activeTab === 'food' ? (
                    <>
                      <div>
                        <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PROTEIN (g)</label>
                        <input 
                          type="number" 
                          value={protein}
                          onChange={(e) => setProtein(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-[#A3A3A3] mb-1">CARBS (g)</label>
                        <input 
                          type="number" 
                          value={carbs}
                          onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">FAT (g)</label>
                    <input 
                      type="number" 
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DURATION (MIN)</label>
                    <input 
                      type="number" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PRIMARY MUSCLE GROUP</label>
                    <select 
                      value={muscleGroup}
                      onChange={(e) => setMuscleGroup(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none"
                    >
                      <option value="">None / Full Body</option>
                      <option value="chest">Chest</option>
                      <option value="back">Back</option>
                      <option value="legs">Legs</option>
                      <option value="arms">Arms</option>
                      <option value="shoulders">Shoulders</option>
                      <option value="core">Core</option>
                      <option value="cardio">Cardio</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </>
        )}

            <button
              type="submit"
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] px-4 py-3 rounded-md transition-colors text-white font-mono text-sm"
            >
              <Plus className="w-4 h-4" style={{ color: themeColor }} />
              <span>ADD LOG</span>
            </button>
          </form>
        </div>

        {/* Today's Logs */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
          <h3 className="text-lg font-mono text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            TODAY'S LOGS
          </h3>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {nutritionLogs.length === 0 ? (
              <div className="text-center py-8 text-[#A3A3A3] font-mono text-sm border border-dashed border-[#262626] rounded-lg">
                No logs recorded today.
              </div>
            ) : (
              nutritionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#262626] rounded-lg">
                  <div className="flex items-center space-x-3">
                    {log.type === 'food' ? (
                      <Utensils className="w-4 h-4 text-green-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <div className="text-sm font-mono text-white">{log.name}</div>
                      <div className="text-xs font-mono text-[#A3A3A3] flex flex-wrap gap-2 mt-1">
                        <span>{log.calories} kcal</span>
                        {log.type === 'food' && (
                          <>
                            {log.protein && <span className="text-red-400">P:{log.protein}g</span>}
                            {log.carbs && <span className="text-yellow-400">C:{log.carbs}g</span>}
                            {log.fat && <span className="text-blue-400">F:{log.fat}g</span>}
                          </>
                        )}
                        {log.type === 'exercise' && (
                          <>
                            {log.duration && <span>{log.duration} min</span>}
                            {log.muscleGroup && <span className="uppercase text-purple-400">{log.muscleGroup}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => log.id && handleDelete(log.id)}
                    className="p-2 text-[#A3A3A3] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
