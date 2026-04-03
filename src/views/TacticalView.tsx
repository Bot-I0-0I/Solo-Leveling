import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp } from '../db/db';
import { Crosshair, TrendingUp, Calculator, Plus, Trash2, Target, ShieldAlert } from 'lucide-react';
import { cn, getRank } from '../lib/utils';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function TacticalView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const tacticalLogs = useLiveQuery(() => db.tacticalLogs.orderBy('date').reverse().limit(20).toArray());

  const [game, setGame] = useState('Valorant');
  const [focusArea, setFocusArea] = useState('Aim');
  const [result, setResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [kills, setKills] = useState('');
  const [deaths, setDeaths] = useState('');
  const [notes, setNotes] = useState('');

  if (!userStats) return <div className="opacity-80">Loading Tactical...</div>;

  const level = Math.floor((userStats.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleLogMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kills || !deaths) return;

    const k = parseInt(kills);
    const d = parseInt(deaths);

    await db.tacticalLogs.add({
      date: new Date().toISOString(),
      game,
      focusArea,
      result,
      kills: k,
      deaths: d,
      notes
    });

    // Skill Linking: Success contributes to SEN and AGI
    if (result === 'win' && k >= d) {
      await db.userStats.update(1, {
        SEN: userStats.SEN + 1,
        AGI: userStats.AGI + 1
      });
      await addXp(50);
    } else if (result === 'win') {
      await addXp(25);
    }

    setKills('');
    setDeaths('');
    setNotes('');
  };

  const handleDelete = async (id: number) => {
    await db.tacticalLogs.delete(id);
  };

  // Calculate Readiness Score
  let readinessScore = 50;
  let avgKD = 0;
  let winRate = 0;

  if (tacticalLogs && tacticalLogs.length > 0) {
    const recentLogs = tacticalLogs.slice(0, 10);
    const wins = recentLogs.filter(l => l.result === 'win').length;
    winRate = (wins / recentLogs.length) * 100;

    const totalKills = recentLogs.reduce((acc, l) => acc + l.kills, 0);
    const totalDeaths = recentLogs.reduce((acc, l) => acc + l.deaths, 0);
    avgKD = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

    // Base 50, + up to 25 for win rate, + up to 25 for KD
    readinessScore = 50 + (winRate * 0.25) + (Math.min(avgKD, 2) * 12.5);
  }

  // Chart Data
  const chartData = tacticalLogs?.slice().reverse().map(log => ({
    date: format(new Date(log.date), 'MMM dd'),
    kd: log.deaths > 0 ? Number((log.kills / log.deaths).toFixed(2)) : log.kills,
    result: log.result
  })) || [];

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white flex items-center">
          <Crosshair className="w-8 h-8 mr-3" style={{ color: themeColor }} />
          TACTICAL READINESS
        </h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Combat Analytics, Performance Tracking & Skill Linking</p>
      </header>

      {/* Readiness Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">READINESS SCORE</span>
            <ShieldAlert className="w-4 h-4" style={{ color: themeColor }} />
          </div>
          <div className="text-4xl font-mono text-white">{Math.round(readinessScore)}<span className="text-sm text-[#A3A3A3]">/100</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">RECENT WIN RATE</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-4xl font-mono text-white">{Math.round(winRate)}<span className="text-sm text-[#A3A3A3]">%</span></div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-[#A3A3A3]">RECENT AVG K/D</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-4xl font-mono text-white">{avgKD.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Log Form */}
        <div className="lg:col-span-1 bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h3 className="text-lg font-mono text-white mb-4">LOG MATCH</h3>
          <form onSubmit={handleLogMatch} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">GAME</label>
              <input
                type="text"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">FOCUS AREA</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
              >
                <option value="Aim">Aim & Mechanics</option>
                <option value="Game Sense">Game Sense & Positioning</option>
                <option value="Communication">Communication</option>
                <option value="Utility">Utility Usage</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">KILLS</label>
                <input
                  type="number"
                  value={kills}
                  onChange={(e) => setKills(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DEATHS</label>
                <input
                  type="number"
                  value={deaths}
                  onChange={(e) => setDeaths(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#404040]"
                  required
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#A3A3A3] mb-1">RESULT</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResult('win')}
                  className={cn("flex-1 py-2 rounded-md font-mono text-sm border transition-colors", result === 'win' ? "bg-green-900/30 border-green-500 text-green-400" : "bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >WIN</button>
                <button
                  type="button"
                  onClick={() => setResult('loss')}
                  className={cn("flex-1 py-2 rounded-md font-mono text-sm border transition-colors", result === 'loss' ? "bg-red-900/30 border-red-500 text-red-400" : "bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >LOSS</button>
                <button
                  type="button"
                  onClick={() => setResult('draw')}
                  className={cn("flex-1 py-2 rounded-md font-mono text-sm border transition-colors", result === 'draw' ? "bg-yellow-900/30 border-yellow-500 text-yellow-400" : "bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:border-[#404040]")}
                >DRAW</button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full border py-2 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-4"
              style={{ color: themeColor, borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}
            >
              <Plus className="w-4 h-4 mr-2" />
              LOG MATCH
            </button>
          </form>
        </div>

        {/* Chart & Logs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h3 className="text-lg font-mono text-white mb-4">PERFORMANCE TREND (K/D)</h3>
            <div className="h-[200px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A3A3A3" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '8px' }}
                      itemStyle={{ color: themeColor }}
                    />
                    <Line type="monotone" dataKey="kd" stroke={themeColor} strokeWidth={2} dot={{ fill: '#141414', stroke: themeColor, strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#A3A3A3] font-mono text-sm">No data to display. Log matches to see trends.</div>
              )}
            </div>
          </div>

          {/* Recent Logs */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h3 className="text-lg font-mono text-white mb-4">RECENT MATCHES</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {tacticalLogs?.length === 0 ? (
                <div className="text-center text-[#A3A3A3] font-mono text-sm py-4">No recent matches.</div>
              ) : (
                tacticalLogs?.map((log) => (
                  <div key={log.id} className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded",
                          log.result === 'win' ? "bg-green-900/30 text-green-400" :
                          log.result === 'loss' ? "bg-red-900/30 text-red-400" :
                          "bg-yellow-900/30 text-yellow-400"
                        )}>
                          {log.result.toUpperCase()}
                        </span>
                        <span className="text-sm font-mono text-white">{log.game}</span>
                      </div>
                      <div className="text-xs font-mono text-[#A3A3A3]">
                        {log.kills}K / {log.deaths}D • Focus: {log.focusArea} • {format(new Date(log.date), 'MMM dd, HH:mm')}
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

