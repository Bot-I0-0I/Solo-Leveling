import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '../lib/utils';
import { CalendarDays, CheckCircle, Circle, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function SchedulerView() {
  const tasks = useLiveQuery(() => db.tasks.orderBy('date').toArray());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('12:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await db.tasks.add({
      title,
      date,
      time,
      priority,
      completed: false
    });

    setTitle('');
  };

  const toggleTask = async (id: number, completed: boolean) => {
    await db.tasks.update(id, { completed: !completed });
  };

  const deleteTask = async (id: number) => {
    await db.tasks.delete(id);
  };

  if (!tasks) return <div className="animate-pulse">Loading Directives...</div>;

  const upcomingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-8">
      <header className="border-b border-[#262626] pb-6">
        <h2 className="text-3xl font-mono font-bold tracking-tight text-white">DIRECTIVES</h2>
        <p className="text-[#A3A3A3] text-sm mt-1">Task Scheduler & Agenda</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-mono text-white flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-[#00F0FF]" />
            PENDING DIRECTIVES
          </h3>
          
          <div className="grid gap-3">
            {upcomingTasks.map(task => (
              <div key={task.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex items-center justify-between hover:border-[#333] transition-colors">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleTask(task.id!, task.completed)} className="text-[#A3A3A3] hover:text-[#00F0FF] transition-colors">
                    <Circle className="w-5 h-5" />
                  </button>
                  <div>
                    <h4 className="font-mono text-white text-sm">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs font-mono text-[#A3A3A3]">
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
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id!)} className="text-[#A3A3A3] hover:text-red-500 text-xs font-mono px-2 py-1">
                  DROP
                </button>
              </div>
            ))}
            {upcomingTasks.length === 0 && (
              <div className="text-center py-8 border border-dashed border-[#262626] rounded-xl text-[#A3A3A3] font-mono text-sm">
                No pending directives.
              </div>
            )}
          </div>

          {completedTasks.length > 0 && (
            <>
              <h3 className="text-xl font-mono text-white pt-4">COMPLETED</h3>
              <div className="grid gap-3 opacity-60">
                {completedTasks.map(task => (
                  <div key={task.id} className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleTask(task.id!, task.completed)} className="text-green-500">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <div>
                        <h4 className="font-mono text-[#A3A3A3] text-sm line-through">{task.title}</h4>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id!)} className="text-[#A3A3A3] hover:text-red-500 text-xs font-mono px-2 py-1">
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
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
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
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#A3A3A3] mb-1">TIME</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">PRIORITY</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-md px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00F0FF]"
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
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
