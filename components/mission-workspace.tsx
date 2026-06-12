"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Target, Activity, Flame, ArrowRight, Zap, Trophy, ShieldAlert, BookOpen } from "lucide-react";
import type { UserProfileRecord } from "@/lib/supabase/types";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle } from "@/styles/careeros-design-system";

export function MissionWorkspace({ profile }: { profile: UserProfileRecord | null }) {
  const goal = profile?.goal || "Software Engineering";
  const [tasks, setTasks] = useState([
    { id: 1, title: "Complete 2 LeetCode easy problems", category: "Daily Task", done: false, type: "daily" },
    { id: 2, title: "Review system architecture patterns", category: "Daily Task", done: false, type: "daily" },
    { id: 3, title: "Submit application for National Scholarship", category: "Priority Task", done: false, type: "priority" },
    { id: 4, title: "Connect with a senior engineer on LinkedIn", category: "Career Milestone", done: false, type: "milestone" },
    { id: 5, title: "Attend free mentorship workshop at local center", category: "Support Recommendation", done: false, type: "support" }
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHero
        badge="Active Campaign"
        title="Weekly Mission System"
        subtitle={`Your personalized, AI-generated action plan for mastering ${goal}.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Weekly Goal & Progress */}
        <div className="lg:col-span-1 space-y-6">
          <CardSurface variant="surface" className="p-6 relative overflow-hidden" noPadding>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 to-indigo-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Objective</p>
                <h3 className="text-sm font-black text-white">{goal} Sprint 1</h3>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              This week&apos;s focus is on bridging core fundamental gaps in your algorithm knowledge and accelerating your community networking.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mission Progress</span>
                <span className="text-xl font-black text-white">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          </CardSurface>

          <CardSurface variant="glass" className="p-5 space-y-4" noPadding>
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Flame className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Streak Status</h4>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white">4</span>
              <span className="text-xs text-slate-400 font-semibold uppercase mb-1">Days Active</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Complete your daily tasks to maintain your streak and unlock advanced mentorship tiers.
            </p>
          </CardSurface>
        </div>

        {/* Right Column: Mission Log */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              Action Ledger
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
              {completedCount} / {tasks.length} TASKS CLEARED
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map(task => (
              <CardSurface 
                key={task.id} 
                variant="glass" 
                hover={!task.done} 
                interactive={!task.done}
                onClick={() => toggleTask(task.id)}
                className={`p-4 transition-all duration-300 flex items-start gap-4 ${task.done ? 'opacity-60 bg-emerald-950/5 border-emerald-500/10' : ''}`}
                noPadding
              >
                <div className={`mt-0.5 shrink-0 ${task.done ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {task.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                      task.type === 'daily' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' :
                      task.type === 'priority' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                      task.type === 'milestone' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                      'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    }`}>
                      {task.category}
                    </span>
                    {task.type === 'priority' && <Zap className="h-3 w-3 text-rose-400" />}
                    {task.type === 'milestone' && <Trophy className="h-3 w-3 text-amber-400" />}
                  </div>
                  
                  <h4 className={`text-sm font-bold ${task.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {task.title}
                  </h4>
                </div>
              </CardSurface>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
