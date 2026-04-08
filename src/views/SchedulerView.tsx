import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addXp, Task } from '../db/db';
import { cn, getRank } from '../lib/utils';
import { CalendarDays, CheckCircle, Circle, Plus, Clock, Repeat, AlertTriangle } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export function SchedulerView() {
  const userStats = useLiveQuery(() => db.userStats.get(1));
  const tasks = useLiveQuery(() => db.tasks.orderBy('date').toArray());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [xpReward, setXpReward] = useState(50);

  const level = Math.floor((userStats?.xp || 0) / 1000) + 1;
  const rankColor = getRank(level).color;
  const themeColor = userStats?.selectedColor || rankColor;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await db.tasks.add({
      title,
      date,
      time,
      priority,
      completed: false,
      xpReward,
      recurrence: 'none'
    });

    setTitle('');
    setXpReward(50);
  };

  const toggleTask = async (task: Task) => {
    const newCompleted = !task.completed;
    await db.tasks.update(task.id!, { completed: newCompleted });

    if (newCompleted) {
      if (task.xpReward) {
        await addXp(task.xpReward);
      }

      if (task.recurrence && task.recurrence !== 'none') {
        const nextDate = new Date(task.date);
        if (task.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        if (task.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        if (task.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        
        await db.tasks.add({
          ...task,
          id: undefined,
          date: format(nextDate, 'yyyy-MM-dd'),
          completed: false
        });
      }
    }
  };

  const updateRecurrence = async (id: number, recurrence: 'none' | 'daily' | 'weekly' | 'monthly') => {
    await db.tasks.update(id, { recurrence });
  };

  const deleteTask = async (id: number) => {
    await db.tasks.delete(id);
  };

  const clearCompleted = async () => {
    const completedIds = completedTasks.map(t => t.id!);
    await db.tasks.bulkDelete(completedIds);
  };

  if (!tasks) return <div className="opacity-80">Loading Directives...</div>;

  const upcomingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const today = startOfDay(new Date());

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">DIRECTIVES</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Task Scheduler & Agenda</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center">
            <CalendarDays className="w-5 h-5 mr-2" style={{ color: themeColor }} />
            PENDING DIRECTIVES
          </h3>
          
          <div className="grid gap-3">
            {upcomingTasks.map(task => {
              const taskDate = startOfDay(new Date(task.date));
              const isOverdue = isBefore(taskDate, today);
              
              return (
                <div key={task.id} className={cn(
                  "bg-[#141414] border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors",
                  isOverdue ? "border-red-900/50 hover:border-red-500/50" : "border-[#262626] hover:border-[#333]"
                )}>
                  <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => toggleTask(task)} className={cn(
                      "transition-colors flex-shrink-0",
                      isOverdue ? "text-red-500 hover:text-red-400" : "text-[#A3A3A3]"
                    )} style={!isOverdue ? { color: themeColor } : {}}>
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={cn("font-mono text-sm", isOverdue ? "text-red-400" : "text-white")}>{task.title}</h4>
                        {isOverdue && <span className="text-[10px] font-mono bg-red-950/30 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> OVERDUE</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-mono text-[#A3A3A3]">
                        <span className="flex items-center"><CalendarDays className="w-3 h-3 mr-1" /> {task.date}</span>
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {task.time}</span>
                        <span className={cn(
                          "px-1.5 rounded border",
                          task.priority === 'high' ? "text-red-400 border-red-900/50 bg-red-950/20" :
                          task.priority === 'medium' ? "text-yellow-400 border-yellow-900/50 bg-yellow-950/20" :
                          "text-blue-400 border-blue-900/50 bg-blue-950/20"
                        )}>
                          {task.priority.toUpperCase()}
                        </span>
                        {task.xpReward && (
                          <span className="border px-1.5 rounded" style={{ color: themeColor, borderColor: `${themeColor}30`, backgroundColor: `${themeColor}10` }}>
                            +{task.xpReward} XP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-[#262626] sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                    {task.recurrence && task.recurrence !== 'none' && (
                      <button 
                        onClick={async () => {
                          await db.tasks.update(task.id!, { recurrence: 'none', completed: true });
                          if (task.xpReward) await addXp(task.xpReward);
                        }} 
                        className="text-[#A3A3A3] hover:text-green-500 text-xs font-mono px-2 py-1 bg-[#0A0A0A] border border-[#262626] rounded transition-colors"
                        title="Complete and stop recurring"
                      >
                        FINISH
                      </button>
                    )}
                    <div className="flex items-center bg-[#0A0A0A] border border-[#262626] rounded px-2 py-1">
                      <Repeat className="w-3 h-3 text-[#A3A3A3] mr-2" />
                      <select
                        value={task.recurrence || 'none'}
                        onChange={(e) => updateRecurrence(task.id!, e.target.value as any)}
                        className="bg-transparent text-xs font-mono text-[#A3A3A3] focus:outline-none focus:text-white cursor-pointer"
                      >
                        <option value="none">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <button onClick={() => deleteTask(task.id!)} className="text-[#A3A3A3] hover:text-red-500 text-xs font-mono px-2 py-1 bg-[#0A0A0A] border border-[#262626] rounded transition-colors">
                      DROP
                    </button>
                  </div>
                </div>
              );
            })}
            {upcomingTasks.length === 0 && (
              <div className="text-center py-8 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
                No pending directives.
              </div>
            )}
          </div>

          {completedTasks.length > 0 && (
            <>
              <div className="flex justify-between items-center pt-4">
                <h3 className="text-xl font-mono text-white">COMPLETED</h3>
                <button 
                  onClick={clearCompleted}
                  className="text-xs font-mono text-[#A3A3A3] hover:text-red-500 transition-colors"
                >
                  CLEAR ALL
                </button>
              </div>
              <div className="grid gap-3 opacity-60 mt-4">
                {completedTasks.map(task => (
                  <div key={task.id} className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleTask(task)} className="text-green-500">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <div>
                        <h4 className="font-mono text-[#A3A3A3] text-sm line-through">{task.title}</h4>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id!)} className="text-[#A3A3A3] hover:text-red-500 text-xs font-mono px-2 py-1 bg-[#141414] border border-[#262626] rounded">
                      DROP
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <form onSubmit={handleAddTask} className="bg-[#141414] border border-[#262626] rounded-xl p-6 sticky top-8">
            <h4 className="text-sm font-mono text-white mb-4">NEW DIRECTIVE</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">TASK TITLE</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  placeholder="e.g., Submit Report"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">DATE</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">TIME</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                    style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PRIORITY</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">XP REWARD</label>
                <input 
                  type="number" 
                  value={xpReward}
                  onChange={(e) => setXpReward(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 transition-colors"
                  style={{ '--tw-ring-color': themeColor, outlineColor: themeColor } as any}
                  min="0"
                />
              </div>
              <button type="submit" className="w-full bg-[#262626] hover:bg-[#333] text-white px-4 py-3 rounded-md font-mono text-sm transition-colors flex items-center justify-center mt-4">
                <Plus className="w-4 h-4 mr-2" /> ADD DIRECTIVE
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
