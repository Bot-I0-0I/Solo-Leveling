import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { Target, TrendingUp, Activity, Plus, Trash2, BrainCircuit, BarChart3, Trophy } from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

export function MissionAnalyticsView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30).toISOString(), []);
  const missionLogs = useLiveQuery(() => 
    db.missionLogs.where('date').aboveOrEqual(thirtyDaysAgo).toArray()
  );

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'study' | 'work' | 'personal' | 'fitness'>('study');
  const [result, setResult] = useState<'success' | 'failure' | 'partial'>('success');
  const [completionRate, setCompletionRate] = useState('100');
  const [noiseLevel, setNoiseLevel] = useState('10');
  const [notes, setNotes] = useState('');

  // Chart Data
  const chartData = useMemo(() => {
    if (!missionLogs) return [];
    
    const daysMap = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'MMM dd');
      daysMap.set(dateStr, {
        date: dateStr,
        completionSum: 0,
        noiseSum: 0,
        successCount: 0,
        totalCount: 0
      });
    }

    missionLogs.forEach(log => {
      const dateStr = format(new Date(log.date), 'MMM dd');
      if (daysMap.has(dateStr)) {
        const day = daysMap.get(dateStr);
        day.completionSum += log.completionRate;
        day.noiseSum += log.noiseLevel;
        if (log.result === 'success') day.successCount += 1;
        day.totalCount += 1;
      }
    });

    return Array.from(daysMap.values()).map(day => ({
      date: day.date,
      completion: day.totalCount > 0 ? Math.round(day.completionSum / day.totalCount) : 0,
      noise: day.totalCount > 0 ? Math.round(day.noiseSum / day.totalCount) : 0,
      successRate: day.totalCount > 0 ? Math.round((day.successCount / day.totalCount) * 100) : 0,
    }));
  }, [missionLogs]);

  if (!userStats) return <div className="opacity-80">Loading Analytics...</div>;

  const level = Math.floor((userStats.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleLogMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !completionRate || !noiseLevel) return;

    const cr = Math.min(100, Math.max(0, parseInt(completionRate)));
    const nl = Math.min(100, Math.max(0, parseInt(noiseLevel)));

    await db.missionLogs.add({
      date: new Date().toISOString(),
      title,
      category,
      result,
      completionRate: cr,
      noiseLevel: nl,
      notes
    });

    // Skill Linking: Success contributes to INT and SEN
    if (result === 'success') {
      await db.userStats.update(1, {
        INT: userStats.INT + (category === 'study' ? 2 : 1),
        SEN: userStats.SEN + (nl < 30 ? 2 : 1)
      });
      const xpGain = cr * 10 + 500;
      await addXp(xpGain); // Generous XP to make leveling easy
      toast.success(`Mission Success! +${xpGain} XP gained.`, {
        icon: <Trophy className="w-4 h-4 text-yellow-400" />,
        duration: 3000,
      });
    } else if (result === 'partial') {
      const xpGain = Math.floor(cr / 2) * 10 + 250;
      await addXp(xpGain);
      toast.success(`Mission Partial! +${xpGain} XP gained.`, {
        icon: <Trophy className="w-4 h-4 text-yellow-400" />,
        duration: 3000,
      });
    }

    setTitle('');
    setCompletionRate('100');
    setNoiseLevel('10');
    setNotes('');
  };

  const handleDelete = async (id: number) => {
    await db.missionLogs.delete(id);
  };

  // Calculate Analytics
  let avgCompletion = 0;
  let avgNoise = 0;
  let successRate = 0;
  let totalMissions = 0;

  const categoryCounts: Record<string, number> = { study: 0, work: 0, fitness: 0, personal: 0 };
  const resultCounts: Record<string, number> = { success: 0, partial: 0, failure: 0 };

  if (missionLogs && missionLogs.length > 0) {
    totalMissions = missionLogs.length;
    const recentLogs = missionLogs.slice(0, 10);
    const successes = recentLogs.filter(l => l.result === 'success').length;
    successRate = (successes / recentLogs.length) * 100;

    const totalCompletion = missionLogs.reduce((acc, l) => acc + l.completionRate, 0);
    const totalNoise = missionLogs.reduce((acc, l) => acc + l.noiseLevel, 0);
    
    avgCompletion = totalCompletion / missionLogs.length;
    avgNoise = totalNoise / missionLogs.length;

    missionLogs.forEach(log => {
      if (categoryCounts[log.category] !== undefined) {
        categoryCounts[log.category]++;
      }
      if (resultCounts[log.result] !== undefined) {
        resultCounts[log.result]++;
      }
    });
  }

  const categoryData = [
    { name: 'Study', value: categoryCounts.study, color: '#3b82f6' },
    { name: 'Work', value: categoryCounts.work, color: '#8b5cf6' },
    { name: 'Fitness', value: categoryCounts.fitness, color: '#10b981' },
    { name: 'Personal', value: categoryCounts.personal, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  const resultData = [
    { name: 'Success', value: resultCounts.success, color: '#22c55e' },
    { name: 'Partial', value: resultCounts.partial, color: '#eab308' },
    { name: 'Failure', value: resultCounts.failure, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 pb-10">
      <header className="hidden md:block border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center uppercase" style={{ color: themeColor }}>
          MISSION ANALYTICS
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1 font-mono uppercase tracking-widest">Track study/goal completion, success rates, and environmental noise levels.</p>
      </header>

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-3 md:p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#262626]"></div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] md:text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">TOTAL MISSIONS</span>
            <Target className="w-3 h-3 md:w-4 md:h-4" style={{ color: themeColor }} />
          </div>
          <div className="text-2xl md:text-3xl font-mono text-white">{totalMissions}</div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-3 md:p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#262626]"></div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] md:text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">AVG COMPLETION</span>
            <Target className="w-3 h-3 md:w-4 md:h-4" style={{ color: themeColor }} />
          </div>
          <div className="text-2xl md:text-3xl font-mono text-white">{Math.round(avgCompletion)}<span className="text-xs text-[#A3A3A3]">%</span></div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-3 md:p-4 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#262626]"></div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] md:text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">SUCCESS RATE</span>
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
          </div>
          <div className="text-2xl md:text-3xl font-mono text-white">{Math.round(successRate)}<span className="text-xs text-[#A3A3A3]">%</span></div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-3 md:p-4 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#262626]"></div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] md:text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">AVG NOISE</span>
            <Activity className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
          </div>
          <div className="text-2xl md:text-3xl font-mono text-white">{Math.round(avgNoise)}<span className="text-xs text-[#A3A3A3]">%</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Log Form */}
        <div className="lg:col-span-1 bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: themeColor }}></div>
          <h3 className="text-lg font-mono text-white mb-4 tracking-widest uppercase font-bold">LOG MISSION</h3>
          <form onSubmit={handleLogMission} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">MISSION TITLE</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.G. STUDY REACT HOOKS"
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-3 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#404040] uppercase placeholder:text-[#555]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#141414] border border-[#262626] rounded-sm px-3 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#404040] uppercase"
              >
                <option value="study">STUDY / LEARNING</option>
                <option value="work">WORK / PROJECT</option>
                <option value="fitness">FITNESS / HEALTH</option>
                <option value="personal">PERSONAL / LIFE</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">COMPLETION %</label>
                <input
                  type="number"
                  value={completionRate}
                  onChange={(e) => setCompletionRate(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-3 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#404040]"
                  required
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">NOISE LEVEL %</label>
                <input
                  type="number"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-sm px-3 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#404040]"
                  required
                  min="0"
                  max="100"
                  title="0% = Deep Focus, 100% = High Distraction"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#A3A3A3] mb-1 tracking-widest uppercase">RESULT</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResult('success')}
                  className={cn("flex-1 py-3 rounded-sm font-mono text-[10px] font-bold tracking-widest border transition-colors", result === 'success' ? "bg-green-900/30 border-green-500 text-green-400" : "bg-[#141414] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >SUCCESS</button>
                <button
                  type="button"
                  onClick={() => setResult('partial')}
                  className={cn("flex-1 py-3 rounded-sm font-mono text-[10px] font-bold tracking-widest border transition-colors", result === 'partial' ? "bg-yellow-900/30 border-yellow-500 text-yellow-400" : "bg-[#141414] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >PARTIAL</button>
                <button
                  type="button"
                  onClick={() => setResult('failure')}
                  className={cn("flex-1 py-3 rounded-sm font-mono text-[10px] font-bold tracking-widest border transition-colors", result === 'failure' ? "bg-red-900/30 border-red-500 text-red-400" : "bg-[#141414] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >FAILURE</button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full border py-3 rounded-sm font-mono text-xs font-bold tracking-widest transition-colors flex items-center justify-center mt-4"
              style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}
            >
              <Plus className="w-4 h-4 mr-2" />
              LOG MISSION
            </button>
          </form>
        </div>

        {/* Chart & Logs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
            <h3 className="text-lg font-mono text-white mb-4 flex items-center font-bold tracking-widest uppercase">
              <BarChart3 className="w-5 h-5 mr-2" style={{ color: themeColor }} />
              30-DAY TRENDS
            </h3>
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="completion" stroke={themeColor} fillOpacity={1} fill="url(#colorCompletion)" strokeWidth={2} name="Avg Completion %" />
                    <Area type="monotone" dataKey="successRate" stroke="#22c55e" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} name="Success Rate %" />
                    <Area type="monotone" dataKey="noise" stroke="#ef4444" fillOpacity={1} fill="url(#colorNoise)" strokeWidth={2} name="Avg Noise %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#A3A3A3] font-mono text-sm">No data to display. Log missions to see trends.</div>
              )}
            </div>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#262626]"></div>
              <h3 className="text-[10px] font-mono text-[#A3A3A3] mb-4 tracking-widest uppercase">CATEGORY DISTRIBUTION</h3>
              <div className="h-[200px] w-full">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#A3A3A3] font-mono text-sm">No data</div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {categoryData.map(d => (
                  <div key={d.name} className="flex items-center text-xs font-mono text-[#A3A3A3]">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }}></div>
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#262626]"></div>
              <h3 className="text-[10px] font-mono text-[#A3A3A3] mb-4 tracking-widest uppercase">RESULT DISTRIBUTION</h3>
              <div className="h-[200px] w-full">
                {resultData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={resultData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {resultData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#A3A3A3] font-mono text-sm">No data</div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {resultData.map(d => (
                  <div key={d.name} className="flex items-center text-xs font-mono text-[#A3A3A3]">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }}></div>
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="bg-[#0A0A0A] border border-[#262626] rounded-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: themeColor }}></div>
            <h3 className="text-lg font-mono text-white mb-4 font-bold tracking-widest uppercase">RECENT MISSIONS</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {missionLogs?.length === 0 ? (
                <div className="text-center text-[#A3A3A3] font-mono text-sm py-4">No recent missions.</div>
              ) : (
                missionLogs?.map((log) => (
                  <div key={log.id} className="bg-[#141414] border border-[#262626] rounded-sm p-3 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-widest",
                          log.result === 'success' ? "bg-green-900/30 text-green-400" :
                          log.result === 'failure' ? "bg-red-900/30 text-red-400" :
                          "bg-yellow-900/30 text-yellow-400"
                        )}>
                          {log.result.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-white truncate max-w-[150px] sm:max-w-[300px] uppercase tracking-wider">{log.title}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase mt-2">
                        {log.completionRate}% DONE • {log.noiseLevel}% NOISE • {log.category.toUpperCase()} • {format(new Date(log.date), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    <button
                      onClick={() => log.id && handleDelete(log.id)}
                      className="text-[#A3A3A3] hover:text-red-400 transition-colors p-2"
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
    </div>
  );
}

