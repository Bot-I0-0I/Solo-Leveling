import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Flame, Utensils, Activity, Plus, Trash2, Target, Dumbbell } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'food' | 'exercise'>('food');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [duration, setDuration] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<'chest' | 'back' | 'legs' | 'arms' | 'shoulders' | 'core' | 'cardio' | ''>('');

  if (!userStats || !nutritionLogs) return <div className="animate-pulse">Loading Metabolism...</div>;

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

  // Assume sedentary multiplier for base TDEE, exercise is added on top
  const baseTDEE = bmr * 1.2;

  const consumedCalories = nutritionLogs.filter(log => log.type === 'food').reduce((acc, log) => acc + log.calories, 0);
  const burnedCalories = nutritionLogs.filter(log => log.type === 'exercise').reduce((acc, log) => acc + log.calories, 0);
  
  const netCalories = consumedCalories - burnedCalories;
  const remainingMaintain = Math.round(baseTDEE - netCalories);
  const remainingLose = Math.round((baseTDEE - 500) - netCalories);
  const remainingGain = Math.round((baseTDEE + 500) - netCalories);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <Flame className="w-8 h-8 mr-3" style={{ color: themeColor }} />
          METABOLISM & ENERGY
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Track caloric intake, exercise expenditure, and vessel maintenance.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">CONSUMED</span>
            <Utensils className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-mono text-white">{consumedCalories} <span className="text-sm text-[#A3A3A3]">kcal</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">BURNED (ACTIVE)</span>
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-mono text-white">{burnedCalories} <span className="text-sm text-[#A3A3A3]">kcal</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">NET INTAKE</span>
            <Target className="w-4 h-4" style={{ color: themeColor }} />
          </div>
          <div className="text-3xl font-mono text-white">{netCalories} <span className="text-sm text-[#A3A3A3]">kcal</span></div>
        </div>
      </div>

      {/* Goals & TDEE */}
      {bmr > 0 ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-lg font-mono text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            ENERGY TARGETS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#262626]">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1">LOSE WEIGHT (-500 kcal)</div>
              <div className="text-2xl font-mono text-white mb-2">{Math.round(baseTDEE - 500)} <span className="text-xs text-[#A3A3A3]">kcal/day</span></div>
              <div className={cn("text-sm font-mono", remainingLose >= 0 ? "text-green-400" : "text-red-400")}>
                {remainingLose >= 0 ? `${remainingLose} remaining` : `${Math.abs(remainingLose)} over limit`}
              </div>
            </div>
            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#262626]">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1">MAINTAIN WEIGHT</div>
              <div className="text-2xl font-mono text-white mb-2">{Math.round(baseTDEE)} <span className="text-xs text-[#A3A3A3]">kcal/day</span></div>
              <div className={cn("text-sm font-mono", remainingMaintain >= 0 ? "text-green-400" : "text-red-400")}>
                {remainingMaintain >= 0 ? `${remainingMaintain} remaining` : `${Math.abs(remainingMaintain)} over limit`}
              </div>
            </div>
            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#262626]">
              <div className="text-xs font-mono text-[#A3A3A3] mb-1">GAIN WEIGHT (+500 kcal)</div>
              <div className="text-2xl font-mono text-white mb-2">{Math.round(baseTDEE + 500)} <span className="text-xs text-[#A3A3A3]">kcal/day</span></div>
              <div className={cn("text-sm font-mono", remainingGain >= 0 ? "text-green-400" : "text-red-400")}>
                {remainingGain >= 0 ? `${remainingGain} remaining` : `${Math.abs(remainingGain)} over limit`}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-[#A3A3A3] font-mono">
            * Base Metabolic Rate (BMR): {Math.round(bmr)} kcal. Targets include a sedentary multiplier (1.2x). Active calories burned are subtracted from your net intake.
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 text-center">
          <p className="text-[#A3A3A3] font-mono text-sm">Update your Height, Age, Gender, and Weight in Settings & Status to see personalized energy targets.</p>
        </div>
      )}

      {/* Muscle Load Visualization */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="text-lg font-mono text-white mb-4 flex items-center">
          <Dumbbell className="w-5 h-5 mr-2" style={{ color: themeColor }} />
          MUSCLE LOAD (7-DAY ESTIMATION)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {Object.entries(muscleLoad).map(([muscle, load]) => {
            const percentage = Math.min((load / maxLoad) * 100, 100);
            return (
              <div key={muscle} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#A3A3A3] uppercase">{muscle}</span>
                  <span className="text-white">{Math.round(load)} pts</span>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#262626]">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: themeColor,
                      opacity: percentage > 0 ? 0.8 : 0.2
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Form & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex space-x-4 mb-6 border-b border-[#262626]">
            <button
              type="button"
              onClick={() => setActiveTab('food')}
              className={cn(
                "pb-3 text-sm font-mono font-bold transition-colors relative",
                activeTab === 'food' ? "text-white" : "text-[#A3A3A3] hover:text-white"
              )}
            >
              LOG FOOD
              {activeTab === 'food' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: themeColor }}></div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exercise')}
              className={cn(
                "pb-3 text-sm font-mono font-bold transition-colors relative",
                activeTab === 'exercise' ? "text-white" : "text-[#A3A3A3] hover:text-white"
              )}
            >
              LOG EXERCISE
              {activeTab === 'exercise' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: themeColor }}></div>
              )}
            </button>
          </div>

          <form onSubmit={handleAddLog} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">
                {activeTab === 'food' ? 'FOOD / MEAL NAME' : 'EXERCISE NAME'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                placeholder={activeTab === 'food' ? 'e.g., Chicken Breast' : 'e.g., Running (5km)'}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">
                  {activeTab === 'food' ? 'CALORIES' : 'CALORIES BURNED'}
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                  placeholder="kcal"
                  required
                  min="1"
                />
              </div>
              {activeTab === 'exercise' && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DURATION (MINS)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                      placeholder="mins"
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-mono text-[#A3A3A3] mb-1">TARGET MUSCLE GROUP</label>
                    <select
                      value={muscleGroup}
                      onChange={(e) => setMuscleGroup(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
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

            {activeTab === 'food' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PROTEIN (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                    placeholder="g"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">CARBS (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                    placeholder="g"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">FAT (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                    placeholder="g"
                    min="0"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#1A1A1A] hover:bg-[#262626] border border-[#333] text-white py-2 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'food' ? 'LOG FOOD' : 'LOG EXERCISE'}
            </button>
          </form>
        </div>

        {/* Logs List */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-mono text-white mb-4">TODAY'S LOGS</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {nutritionLogs.length === 0 ? (
              <div className="text-center text-[#A3A3A3] font-mono text-sm py-8">No logs for today.</div>
            ) : (
              nutritionLogs.slice().reverse().map((log) => (
                <div key={log.id} className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    {log.type === 'food' ? (
                      <Utensils className="w-4 h-4 text-green-400 mr-3" />
                    ) : (
                      <Activity className="w-4 h-4 text-red-400 mr-3" />
                    )}
                    <div>
                      <div className="text-sm font-mono text-white">{log.name}</div>
                      <div className="text-xs font-mono text-[#A3A3A3]">
                        {log.type === 'food' ? (
                          <>
                            {log.protein ? `${log.protein}g P ` : ''}
                            {log.carbs ? `${log.carbs}g C ` : ''}
                            {log.fat ? `${log.fat}g F` : ''}
                          </>
                        ) : (
                          <>
                            {log.duration ? `${log.duration} mins` : 'Exercise'}
                            {log.muscleGroup && ` • ${log.muscleGroup.toUpperCase()}`}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={cn(
                      "font-mono text-sm mr-4",
                      log.type === 'food' ? "text-green-400" : "text-red-400"
                    )}>
                      {log.type === 'food' ? '+' : '-'}{log.calories}
                    </span>
                    <button
                      onClick={() => log.id && handleDelete(log.id)}
                      className="text-[#A3A3A3] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
