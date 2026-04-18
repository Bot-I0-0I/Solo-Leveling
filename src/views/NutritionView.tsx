import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp, FoodTemplate } from '../db/db';
import { Flame, Utensils, Activity, Plus, Trash2, Target, Dumbbell, Droplets, Beef, Wheat, Moon, Save, Download, BarChart3 } from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

export function NutritionView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const vesselLogs = useLiveQuery(() => db.vesselLogs.orderBy('date').toArray());
  const foodTemplates = useLiveQuery(() => db.foodTemplates.toArray());
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const nutritionLogs = useLiveQuery(
    () => db.nutritionLogs.where('date').equals(today).toArray(),
    [today]
  );

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
  
  const weeklyLogs = useLiveQuery(
    () => db.nutritionLogs.where('date').anyOf(last7Days).toArray(),
    [last7Days]
  );

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [stressLevel, setStressLevel] = useState('');

  if (!userStats || !nutritionLogs) return <div className="opacity-80 p-4">Loading Metabolism...</div>;

  const level = Math.floor((userStats.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  // Calculate BMR, TDEE, and BMI
  const latestWeightLog = vesselLogs?.slice().reverse().find(log => log.weight !== undefined);
  const currentWeight = latestWeightLog?.weight;
  const todayLog = vesselLogs?.find(l => l.date === today);
  
  let bmr = 0;
  let bmi = null;
  let bmiCategory = '';
  let idealWeightMin = 0;
  let idealWeightMax = 0;

  if (currentWeight && userStats.height && userStats.age && userStats.gender) {
    if (userStats.gender === 'male') {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) + 5;
    } else if (userStats.gender === 'female') {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) - 161;
    } else {
      bmr = (10 * currentWeight) + (6.25 * userStats.height) - (5 * userStats.age) - 78; // average
    }

    const heightM = userStats.height / 100;
    bmi = currentWeight / (heightM * heightM);
    
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Optimal';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';

    idealWeightMin = 18.5 * (heightM * heightM);
    idealWeightMax = 24.9 * (heightM * heightM);
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
  
  // Weekly Chart Data
  const weeklyChartData = last7Days.map(date => {
    const dayLogs = weeklyLogs?.filter(log => log.date === date && log.type === 'food') || [];
    const protein = dayLogs.reduce((sum, log) => sum + (log.protein || 0), 0);
    const carbs = dayLogs.reduce((sum, log) => sum + (log.carbs || 0), 0);
    const fat = dayLogs.reduce((sum, log) => sum + (log.fat || 0), 0);
    
    return {
      date: format(parseISO(date), 'EEE'),
      fullDate: date,
      calories: dayLogs.reduce((sum, log) => sum + (log.calories || 0), 0),
      protein: protein,
      carbs: carbs,
      fat: fat,
      proteinCals: protein * 4,
      carbsCals: carbs * 4,
      fatCals: fat * 9,
    };
  });

  const totalWeeklyCalories = weeklyChartData.reduce((sum, day) => sum + day.calories, 0);
  const avgWeeklyCalories = Math.round(totalWeeklyCalories / 7);

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

    const logData: any = {
      date: today,
      type: activeTab,
      name,
      calories: parseInt(calories),
    };

    if (protein) logData.protein = parseInt(protein);
    if (carbs) logData.carbs = parseInt(carbs);
    if (fat) logData.fat = parseInt(fat);
    if (duration) logData.duration = parseInt(duration);
    if (activeTab === 'exercise' && muscleGroup) logData.muscleGroup = muscleGroup;

    await db.nutritionLogs.add(logData);

    if (activeTab === 'exercise') {
      const xpGained = parseInt(calories) * 2 + 500; // Generous XP to make leveling easy
      await addXp(xpGained);
      if (muscleGroup) {
        const stats = await db.userStats.get(1);
        if (stats) {
          const xpField = `${muscleGroup}Xp` as keyof typeof stats;
          await db.userStats.update(1, {
            [xpField]: ((stats[xpField] as number) || 0) + xpGained
          });
        }
      }
    }

    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setDuration('');
    setMuscleGroup('');
    setSelectedTemplateId('');
  };

  const handleSaveTemplate = async () => {
    if (!name || !calories) {
      alert("Please enter at least a name and calories to save a template.");
      return;
    }

    await db.foodTemplates.add({
      name: name,
      calories: Number(calories),
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
    });
    
    alert("Food template saved!");
  };

  const handleLoadTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      return;
    }

    const template = foodTemplates?.find(t => t.id === Number(templateId));
    if (template) {
      setName(template.name);
      setCalories(template.calories.toString());
      setProtein(template.protein?.toString() || '');
      setCarbs(template.carbs?.toString() || '');
      setFat(template.fat?.toString() || '');
    }
  };

  const handleDelete = async (id: number) => {
    const log = await db.nutritionLogs.get(id);
    if (log && log.type === 'exercise' && log.calories) {
      const xpToRemove = Math.floor(log.calories / 10);
      if (userStats) {
        await db.userStats.update(1, {
          xp: Math.max(0, userStats.xp - xpToRemove)
        });
      }
    }
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

  const handleLogVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;

    const existing = await db.vesselLogs.where('date').equals(today).first();

    const logData = {
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      stressLevel: stressLevel ? parseInt(stressLevel) as 1|2|3|4|5 : undefined
    };

    if (existing) {
      await db.vesselLogs.update(existing.id!, logData);
    } else {
      await db.vesselLogs.add({
        date: today,
        ...logData
      });
    }

    setWeight('');
    setBodyFat('');
    setStressLevel('');
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

  const muscleChartData = Object.entries(muscleLoad).map(([muscle, load]) => ({
    name: muscle.toUpperCase(),
    load: Math.round(load)
  }));

  // Recovery Status Calculation
  const last7DaysLogs = vesselLogs?.filter(log => {
    const logDate = new Date(log.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return logDate >= sevenDaysAgo;
  }) || [];

  const sleepLogs = last7DaysLogs.filter(l => l.sleepHours !== undefined);
  const avgSleep = sleepLogs.length > 0 
    ? sleepLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / sleepLogs.length 
    : 0;

  let recoveryStatus = 'Unknown';
  if (avgSleep > 0) {
    if (avgSleep >= 7 && avgSleep <= 9) {
      recoveryStatus = 'Optimal';
    } else if (avgSleep >= 6) {
      recoveryStatus = 'Fair';
    } else {
      recoveryStatus = 'Poor';
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <header className="hidden md:block border-b border-[#262626] pb-4 md:pb-6">
        <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-white flex items-center uppercase" style={{ color: themeColor }}>
          METABOLIC ENGINE
        </h2>
        <p className="text-[#A3A3A3] text-xs md:text-sm mt-1 font-mono uppercase">Advanced tracking for caloric intake, macros, and physical exertion.</p>
      </header>

      {/* Metabolic Profile */}
      {bmr > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#262626]"></div>
            <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center uppercase">
              <Activity className="w-3 h-3 mr-1" />
              BASAL METABOLIC RATE
            </div>
            <div className="text-2xl font-mono font-bold text-white">{Math.round(bmr)} <span className="text-sm text-[#A3A3A3]">KCAL</span></div>
            <div className="text-[10px] font-mono text-[#A3A3A3] mt-1 uppercase tracking-widest">Calories burned at rest</div>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#262626]"></div>
            <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center uppercase">
              <Flame className="w-3 h-3 mr-1" />
              TOTAL DAILY ENERGY (TDEE)
            </div>
            <div className="text-2xl font-mono font-bold text-orange-400">{Math.round(tdee)} <span className="text-sm text-orange-400/50">KCAL</span></div>
            <div className="text-[10px] font-mono text-[#A3A3A3] mt-1 uppercase tracking-widest">Maintenance calories</div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#262626]"></div>
            <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center uppercase">
              <Activity className="w-3 h-3 mr-1" />
              BMI INDEX
            </div>
            <div className="text-2xl font-mono font-bold text-white">{bmi?.toFixed(1)}</div>
            <div className={cn(
              "text-[10px] font-mono mt-1 uppercase tracking-widest",
              bmiCategory === 'Optimal' ? "text-green-400" :
              bmiCategory === 'Underweight' ? "text-blue-400" :
              "text-red-400"
            )}>
              {bmiCategory.toUpperCase()}
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#262626]"></div>
            <div className="text-[#A3A3A3] text-[10px] font-mono tracking-widest mb-1 flex items-center uppercase">
              <Target className="w-3 h-3 mr-1" />
              OPTIMAL CAPACITY
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {idealWeightMin.toFixed(1)}<span className="text-sm text-[#A3A3A3]">-</span>{idealWeightMax.toFixed(1)} <span className="text-sm text-[#A3A3A3]">KG</span>
            </div>
            <div className="text-[10px] font-mono text-[#A3A3A3] mt-1 uppercase tracking-widest">Target weight range</div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-dashed border-[#262626] rounded-sm p-6 text-center">
          <p className="text-[#A3A3A3] font-mono text-xs tracking-widest uppercase">Please update your profile (height, age, gender) and log your weight to calculate your metabolic profile.</p>
        </div>
      )}

      {/* Professional Dashboard */}
      {bmr > 0 && (
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: themeColor }}></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-mono text-white flex items-center font-bold tracking-widest uppercase">
                <Target className="w-5 h-5 mr-2" style={{ color: themeColor }} />
                DAILY TARGET: {goalLabel}
              </h3>
            </div>
            <div className="text-left md:text-right">
              <div className="text-3xl font-mono text-white font-black">
                {netCalories} <span className="text-sm text-[#A3A3A3]">/ {targetCalories} KCAL</span>
              </div>
              <div className={cn("text-[10px] font-mono mt-1 tracking-widest uppercase", remainingCalories >= 0 ? "text-green-400" : "text-red-400")}>
                {remainingCalories >= 0 ? `${remainingCalories} REMAINING` : `${Math.abs(remainingCalories)} OVER LIMIT`}
              </div>
            </div>
          </div>

          {/* Calorie Progress Bar */}
          <div className="w-full bg-[#141414] rounded-sm h-2 mb-8 border border-[#262626] overflow-hidden">
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${targetCalories > 0 ? Math.min((netCalories / targetCalories) * 100, 100) : 0}%`,
                backgroundColor: netCalories > targetCalories ? '#ef4444' : themeColor 
              }}
            />
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* Protein */}
            <div className="bg-[#141414] border border-[#262626] rounded-sm p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#A3A3A3] flex items-center tracking-widest uppercase">
                  <Beef className="w-3 h-3 mr-1 text-red-400" /> PROTEIN
                </span>
                <span className="text-[10px] font-mono text-white tracking-widest">{consumedProtein} / {targetProtein}G</span>
              </div>
              <div className="w-full bg-[#0A0A0A] rounded-sm h-1 overflow-hidden">
                <div 
                  className="h-full bg-red-400 transition-all duration-500"
                  style={{ width: `${targetProtein > 0 ? Math.min((consumedProtein / targetProtein) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-[#141414] border border-[#262626] rounded-sm p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#A3A3A3] flex items-center tracking-widest uppercase">
                  <Wheat className="w-3 h-3 mr-1 text-yellow-400" /> CARBS
                </span>
                <span className="text-[10px] font-mono text-white tracking-widest">{consumedCarbs} / {targetCarbs}G</span>
              </div>
              <div className="w-full bg-[#0A0A0A] rounded-sm h-1 overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-500"
                  style={{ width: `${targetCarbs > 0 ? Math.min((consumedCarbs / targetCarbs) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="bg-[#141414] border border-[#262626] rounded-sm p-3 md:p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#A3A3A3] flex items-center tracking-widest uppercase">
                  <Droplets className="w-3 h-3 mr-1 text-blue-400" /> FAT
                </span>
                <span className="text-[10px] font-mono text-white tracking-widest">{consumedFat} / {targetFat}G</span>
              </div>
              <div className="w-full bg-[#0A0A0A] rounded-sm h-1 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${targetFat > 0 ? Math.min((consumedFat / targetFat) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="mt-8 pt-8 border-t border-[#262626]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-mono text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" style={{ color: themeColor }} />
                  WEEKLY NUTRITION ANALYSIS
                </h3>
                <p className="text-[10px] font-mono text-[#A3A3A3] mt-1">
                  Total: {totalWeeklyCalories} kcal | Avg: {avgWeeklyCalories} kcal/day
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div> PROTEIN</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#10B981] rounded-full"></div> CARBS</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div> FAT</div>
              </div>
            </div>
            <div className="h-[250px] w-full min-h-[250px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px', fontFamily: 'monospace' }}
                    itemStyle={{ fontSize: '12px' }}
                    cursor={{ fill: '#262626', opacity: 0.4 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'proteinCals') return [`${value} kcal`, 'Protein'];
                      if (name === 'carbsCals') return [`${value} kcal`, 'Carbs'];
                      if (name === 'fatCals') return [`${value} kcal`, 'Fat'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="proteinCals" name="Protein" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="carbsCals" name="Carbs" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="fatCals" name="Fat" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards (Consumed vs Burned vs Water) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-400"></div>
          <div className="flex justify-between items-center mb-2 pl-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3] tracking-widest uppercase">CONSUMED</span>
            <Utensils className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl md:text-3xl font-black font-mono text-white pl-2">{consumedCalories} <span className="text-[10px] md:text-sm text-[#A3A3A3]">KCAL</span></div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
          <div className="flex justify-between items-center mb-2 pl-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3] tracking-widest uppercase">BURNED</span>
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl md:text-3xl font-black font-mono text-white pl-2">{burnedCalories} <span className="text-[10px] md:text-sm text-[#A3A3A3]">KCAL</span></div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
          <div className="flex justify-between items-center mb-2 pl-2">
            <span className="text-[10px] md:text-xs font-mono text-[#A3A3A3] tracking-widest uppercase">HYDRATION</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl md:text-3xl font-black font-mono text-white pl-2">{consumedWater} <span className="text-[10px] md:text-sm text-[#A3A3A3]">ML</span></div>
        </div>
      </div>

      {/* Muscle Load Visualization */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#262626]"></div>
        <h3 className="text-lg font-mono text-white mb-4 flex items-center font-bold tracking-widest uppercase">
          <Dumbbell className="w-5 h-5 mr-2" style={{ color: themeColor }} />
          MUSCLE LOAD (7-DAY ESTIMATION)
        </h3>
        <div className="h-[250px] w-full min-h-[250px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={muscleChartData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px', fontFamily: 'monospace' }}
                itemStyle={{ fontSize: '12px', color: '#fff' }}
                cursor={{ fill: '#262626', opacity: 0.4 }}
                formatter={(value: number) => [`${value} Load`, 'Strain']}
              />
              <Bar dataKey="load" radius={[0, 4, 4, 0]}>
                {muscleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.load > 75 ? '#ef4444' : entry.load > 40 ? '#eab308' : themeColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sleep & Recovery Card */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#262626]"></div>
        <h3 className="text-lg font-mono text-white mb-4 flex items-center font-bold tracking-widest uppercase">
          <Moon className="w-5 h-5 mr-2 text-indigo-400" />
          SLEEP & RECOVERY
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-3xl font-black font-mono text-white mb-2">
              {todayLog?.sleepHours || 0} <span className="text-sm font-normal text-[#A3A3A3] tracking-widest uppercase">HRS LOGGED TODAY</span>
            </div>
            <p className="text-xs text-[#A3A3A3] font-mono leading-relaxed uppercase tracking-wider">
              Optimal sleep (7-9 hours) is critical for metabolic health, muscle recovery, and cognitive function. Lack of sleep increases cortisol and decreases insulin sensitivity, hindering fat loss and muscle growth.
            </p>
          </div>
          <div className="flex items-end">
            <div className="w-full">
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">LOG SLEEP (HOURS)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="E.G., 7.5"
                />
                <button 
                  onClick={handleLogSleep}
                  className="bg-[#262626] hover:bg-[#333] text-white px-6 py-2 rounded-sm font-mono text-xs font-bold tracking-widest transition-colors border border-[#262626] hover:border-indigo-400"
                >
                  LOG
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECOVERY STATUS */}
        <div className="pt-6 border-t border-[#262626]">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-4 h-4 text-[#A3A3A3]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#A3A3A3]">RECOVERY STATUS</span>
          </div>
          
          <div className="flex items-baseline space-x-2 mb-2">
            <h3 className="text-2xl font-black font-mono text-white tracking-widest uppercase">{recoveryStatus}</h3>
            <span className="text-xs font-mono text-[#A3A3A3]">({avgSleep > 0 ? avgSleep.toFixed(1) : '--'} HRS AVG)</span>
          </div>
          
          <p className="text-xs font-mono text-[#A3A3A3] mb-6 leading-relaxed">
            {recoveryStatus === 'Optimal' && "Your vessel is in an optimal state for muscle synthesis and cognitive recovery. Maintain current sleep patterns."}
            {recoveryStatus === 'Fair' && "Recovery is adequate but could be improved. Aim for 7-9 hours of sleep to maximize growth and performance."}
            {recoveryStatus === 'Poor' && "Warning: Insufficient recovery detected. Cortisol levels may be elevated, hindering muscle growth and fat loss. Prioritize rest."}
            {recoveryStatus === 'Unknown' && "Insufficient data to determine recovery status. Log your sleep in the Metabolism tab."}
          </p>
          
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-2 h-6" style={{ backgroundColor: i <= (recoveryStatus === 'Optimal' ? 5 : recoveryStatus === 'Fair' ? 3 : recoveryStatus === 'Poor' ? 1 : 0) ? themeColor : '#262626' }}></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Input Form */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <div className="flex flex-wrap gap-4 mb-6 border-b border-[#262626]">
            <button
              onClick={() => setActiveTab('food')}
              className={cn(
                "pb-2 text-xs font-mono font-bold tracking-widest transition-colors relative uppercase",
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
                "pb-2 text-xs font-mono font-bold tracking-widest transition-colors relative uppercase",
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
                "pb-2 text-xs font-mono font-bold tracking-widest transition-colors relative uppercase",
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
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">AMOUNT (ML)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-sm focus:outline-none mb-3"
                  placeholder="E.G., 250"
                  required
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAmount('250')} className="flex-1 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-[#A3A3A3] py-2 rounded-sm font-mono text-xs transition-colors">+250ML</button>
                  <button type="button" onClick={() => setAmount('500')} className="flex-1 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-[#A3A3A3] py-2 rounded-sm font-mono text-xs transition-colors">+500ML</button>
                  <button type="button" onClick={() => setAmount('1000')} className="flex-1 bg-[#141414] hover:bg-[#262626] border border-[#262626] text-[#A3A3A3] py-2 rounded-sm font-mono text-xs transition-colors">+1L</button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'food' && (
                  <div className="mb-4">
                    <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 flex items-center tracking-widest uppercase">
                      <Download className="w-3 h-3 mr-1" /> LOAD TEMPLATE
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleLoadTemplate(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    >
                      <option value="">-- SELECT A SAVED FOOD --</option>
                      {foodTemplates?.map(t => (
                        <option key={t.id} value={t.id}>{t.name.toUpperCase()} ({t.calories} KCAL)</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">
                    {activeTab === 'food' ? 'FOOD / MEAL NAME' : 'EXERCISE / ACTIVITY'}
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase placeholder:text-[#555]"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    placeholder={activeTab === 'food' ? "E.G., GRILLED CHICKEN SALAD" : "E.G., 5KM RUN"}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">CALORIES</label>
                    <input 
                      type="number" 
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                      placeholder="KCAL"
                      required
                    />
                  </div>
                  
                  {activeTab === 'food' ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">PROTEIN (G)</label>
                        <input 
                          type="number" 
                          value={protein}
                          onChange={(e) => setProtein(e.target.value)}
                          className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                          style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                          placeholder="OPTIONAL"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">CARBS (G)</label>
                        <input 
                          type="number" 
                          value={carbs}
                          onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                      placeholder="OPTIONAL"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">FAT (G)</label>
                    <input 
                      type="number" 
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                      placeholder="OPTIONAL"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">DURATION (MIN)</label>
                    <input 
                      type="number" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                      placeholder="OPTIONAL"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">PRIMARY MUSCLE GROUP</label>
                    <select 
                      value={muscleGroup}
                      onChange={(e) => setMuscleGroup(e.target.value as any)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors uppercase"
                      style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                    >
                      <option value="">NONE / FULL BODY</option>
                      <option value="chest">CHEST</option>
                      <option value="back">BACK</option>
                      <option value="legs">LEGS</option>
                      <option value="arms">ARMS</option>
                      <option value="shoulders">SHOULDERS</option>
                      <option value="core">CORE</option>
                      <option value="cardio">CARDIO</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </>
        )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 mt-4 flex items-center justify-center space-x-2 border border-[#262626] px-4 py-3 rounded-sm transition-colors text-black font-mono text-xs font-bold tracking-widest uppercase"
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="w-4 h-4 text-black" />
                <span>ADD LOG</span>
              </button>
              {activeTab === 'food' && (
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="mt-4 flex items-center justify-center space-x-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] px-4 py-3 rounded-md transition-colors text-white font-mono text-sm"
                  title="Save as Template"
                >
                  <Save className="w-4 h-4 text-indigo-400" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Today's Logs */}
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#262626]"></div>
          <h3 className="text-lg font-mono text-white mb-4 flex items-center font-bold tracking-widest uppercase">
            <Activity className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            TODAY'S LOGS
          </h3>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {nutritionLogs.length === 0 ? (
              <div className="text-center py-8 text-[#A3A3A3] font-mono text-xs tracking-widest uppercase border border-dashed border-[#262626] rounded-sm">
                NO LOGS RECORDED TODAY.
              </div>
            ) : (
              nutritionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-[#141414] border border-[#262626] rounded-sm">
                  <div className="flex items-center space-x-3">
                    {log.type === 'food' ? (
                      <Utensils className="w-4 h-4 text-green-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <div className="text-xs font-mono text-white font-bold tracking-widest uppercase">{log.name}</div>
                      <div className="text-[10px] font-mono text-[#A3A3A3] flex flex-wrap gap-2 mt-1 tracking-widest uppercase">
                        <span>{log.calories} KCAL</span>
                        {log.type === 'food' && (
                          <>
                            {log.protein && <span className="text-red-400">P:{log.protein}G</span>}
                            {log.carbs && <span className="text-yellow-400">C:{log.carbs}G</span>}
                            {log.fat && <span className="text-blue-400">F:{log.fat}G</span>}
                          </>
                        )}
                        {log.type === 'exercise' && (
                          <>
                            {log.duration && <span>{log.duration} MIN</span>}
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

      {/* Vessel Tracker & Growth Analysis */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#262626]"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#262626]"></div>
        <h3 className="text-lg font-mono text-white mb-4 flex items-center font-bold tracking-widest uppercase">
          <Activity className="w-5 h-5 mr-2 text-blue-400" />
          VESSEL TRACKER
        </h3>
        <p className="text-[10px] text-[#A3A3A3] mb-6 font-mono tracking-widest uppercase">Log your physical capacity metrics and monitor vessel integrity over time.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[300px] min-h-[250px] bg-[#141414] border border-[#262626] rounded-sm p-4">
            {vesselLogs && vesselLogs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={vesselLogs.map(log => ({
                  ...log,
                  weight: log.weight ?? null,
                  bodyFat: log.bodyFat ?? null,
                  stressLevel: log.stressLevel ?? null,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickFormatter={(val) => val.substring(5)} />
                  <YAxis yAxisId="left" stroke="#A3A3A3" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#A3A3A3" fontSize={10} domain={[0, 'dataMax + 5']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#262626', color: '#fff', borderRadius: '2px' }}
                    itemStyle={{ color: themeColor }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="weight" name="WEIGHT (KG)" stroke={themeColor} strokeWidth={2} dot={{ r: 4, fill: themeColor }} activeDot={{ r: 6 }} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="bodyFat" name="BODY FAT %" stroke="#FFD700" strokeWidth={2} dot={{ r: 4, fill: '#FFD700' }} connectNulls />
                  <Line yAxisId="right" type="monotone" dataKey="stressLevel" name="STRESS (1-5)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A3A3A3] font-mono text-xs tracking-widest uppercase">
                NO VESSEL DATA LOGGED YET.
              </div>
            )}
          </div>

          <div>
            <form onSubmit={handleLogVessel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">WEIGHT (KG)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="E.G., 75.5" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">BODY FAT % (OPTIONAL)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="E.G., 15.2" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">STRESS (1-5)</label>
                <input 
                  type="number" 
                  min="1"
                  max="5"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value)}
                  placeholder="1 = LOW" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-4 py-3 text-white font-mono text-xs tracking-wider focus:outline-none focus:ring-1 transition-colors placeholder:text-[#555]"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                />
              </div>
              <button type="submit" className="w-full bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-sm font-mono text-xs font-bold tracking-widest transition-colors flex items-center justify-center mt-2 border border-[#262626] hover:border-blue-400 uppercase">
                <Plus className="w-4 h-4 mr-2" /> LOG VESSEL DATA
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
