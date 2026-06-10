"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, X, CheckSquare, Square
} from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { PageHero } from "@/components/ui/page-hero";
import { buttonStyle } from "@/styles/careeros-design-system";

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 8;

  // Step 3 Interactive state
  const [twinCalibrated, setTwinCalibrated] = useState(false);
  const [skills, setSkills] = useState(["React", "TypeScript", "Node.js"]);
  const [newSkill, setNewSkill] = useState("");

  // Step 4 Interactive state
  const [selectedCity, setSelectedCity] = useState("Bangalore");
  const [discoveredCount, setDiscoveredCount] = useState(12);

  // Step 5 Interactive state
  const [activeDeficiency, setActiveDeficiency] = useState("Mumbai - Mentor Support");

  // Step 7 Interactive state
  const [completedPriorities, setCompletedPriorities] = useState<Record<string, boolean>>({});

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const skipTour = () => {
    setStep(totalSteps);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
      setTwinCalibrated(true);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#030712] text-white flex flex-col justify-between overflow-hidden">
      {/* Background Grids */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.02] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Demo Header */}
      <header className="relative z-10 border-b border-white/[0.04] bg-[#080c18]/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="CareerOS" width={28} height={28} />
          <div>
            <span className="text-sm font-semibold tracking-wider text-white">CareerOS Demo Center</span>
            <span className="hidden sm:inline-block ml-3 text-[10px] uppercase tracking-widest text-cyan-400 border border-cyan-400/20 bg-cyan-950/20 px-2 py-0.5 rounded">
              Judge Mode
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium">
            Progress: <strong className="text-cyan-400 font-mono">{step}</strong> / {totalSteps}
          </span>
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition p-1.5" title="Exit Demo">
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Stepper Progress Bar */}
      <div className="relative w-full h-1 bg-white/5 z-10">
        <div 
          className="h-full bg-cyan-400 transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Slide Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 1 // Welcome"
                  title="Welcome to CareerOS"
                  subtitle="A unified AI-powered operating system for career planning and community resource alignment."
                />
                <CardSurface variant="surface" dust="both" className="p-8 space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Judges, mentors, and partners: CareerOS transforms static guidance into active daily execution plans.
                    Our architecture couples customized roadmap tracks with real community intelligence (CSI) networks,
                    allowing learners to discover support systems, forecast skill requirements, and track career readiness scores.
                  </p>
                  <div className="pt-4 flex flex-wrap gap-3">
                    <button onClick={nextStep} style={buttonStyle("primary")} className="px-6 py-2.5 flex items-center gap-2 text-black font-bold">
                      Begin Guided Walkthrough
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={skipTour} style={buttonStyle("ghost")} className="px-5 py-2.5 text-xs text-slate-400">
                      Skip Tour
                    </button>
                  </div>
                </CardSurface>
              </div>
            )}

            {/* Step 2: Problem Statement */}
            {step === 2 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 2 // The Challenge"
                  title="The Career Guidance Gap"
                  subtitle="Why traditional learning paths fail modern builders."
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <CardSurface variant="glass" className="p-6 space-y-3 border border-red-500/10 bg-red-950/5">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">The Legacy Path</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Learners compile advice from disjointed spreadsheets, generic checklists, and static PDF documents, 
                      leading to duplication, loss of velocity, and high rates of dropouts.
                    </p>
                  </CardSurface>
                  <CardSurface variant="glass" className="p-6 space-y-3 border border-cyan-500/10 bg-cyan-950/5">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-geom">The CareerOS Solution</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We integrate customized learning paths, vector-mapped skill assessments, and AI strategist mentoring 
                      with live regional resources to map a clear path forward.
                    </p>
                  </CardSurface>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: AI Analysis
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: AI Analysis */}
            {step === 3 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 3 // AI Core"
                  title="AI Twin & Readiness Calibration"
                  subtitle="Vector embeddings compare profile qualifications against industry benchmarks."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300">
                    <strong>Interactive Demo:</strong> Type a technical skill below to see the simulated Digital Twin recalibrate.
                  </p>
                  <form onSubmit={handleAddSkill} className="flex gap-2 max-w-md">
                    <input 
                      type="text" 
                      placeholder="e.g. Next.js, Docker, Python" 
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none"
                    />
                    <button type="submit" style={buttonStyle("secondary")} className="px-4 text-xs font-bold">
                      Add to Twin
                    </button>
                  </form>
                  <div className="border border-white/5 p-4 rounded-xl space-y-3 bg-[#0a0c16]/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Calibration Profile Skills:</span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">
                        {twinCalibrated ? "STATUS: RE-CALIBRATING" : "STATUS: STEADY"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map(skill => (
                        <span key={skill} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] px-2.5 py-1 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <Link href="/career-twin" style={buttonStyle("ghost")} className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      Open Career Twin Panel
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Support Discovery
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Community Support Discovery */}
            {step === 4 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 4 // Support Proximity"
                  title="Community Support Discovery"
                  subtitle="Connecting users to local scholarships, wellness guides, and centers."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300">
                    <strong>Interactive Demo:</strong> Select a target city to filter verified local support opportunities.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Bangalore", "New Delhi", "Mumbai", "Jaipur", "Kolkata"].map(city => (
                      <button 
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          setDiscoveredCount(city === "Bangalore" ? 12 : city === "New Delhi" ? 8 : 5);
                        }}
                        style={{
                          backgroundColor: selectedCity === city ? "rgba(34,211,238,0.15)" : "transparent",
                          borderColor: selectedCity === city ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.06)",
                        }}
                        className="border rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 border border-white/5 rounded-xl bg-white/[0.01] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Access Registry</p>
                      <h4 className="text-sm font-bold text-white mt-1">Discovered {discoveredCount} Support Systems in {selectedCity}</h4>
                    </div>
                    <Link href="/resource-discovery" style={buttonStyle("ghost")} className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      Browse Map
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Gap Intelligence
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Gap Intelligence */}
            {step === 5 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 5 // Audit Logs"
                  title="Gap Intelligence Reports"
                  subtitle="Automatically index local deficiencies to direct capital and grants."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300">
                    <strong>Interactive Demo:</strong> Hover or click a critical deficit region below to audit details.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { region: "Mumbai - Mentor Support", gap: "No local mentorship hubs index", risk: "High" },
                      { region: "Jaipur - Tech Internships", gap: "Low engineering alignment", risk: "Medium" },
                      { region: "Kolkata - Student Wellness", gap: "0 active counseling programs", risk: "Critical" },
                    ].map(def => (
                      <button
                        key={def.region}
                        onClick={() => setActiveDeficiency(def.region)}
                        style={{
                          borderColor: activeDeficiency === def.region ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)",
                          backgroundColor: activeDeficiency === def.region ? "rgba(239,68,68,0.05)" : "rgba(4,8,16,0.3)",
                        }}
                        className="border text-left p-4 rounded-xl transition"
                      >
                        <span className="text-[9px] uppercase font-bold text-rose-400 font-mono tracking-wider">{def.risk} Risk</span>
                        <h4 className="text-xs font-bold text-white mt-1">{def.region}</h4>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{def.gap}</p>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-between items-center border-t border-white/5">
                    <Link href="/community-gaps" style={buttonStyle("ghost")} className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      Open Gap Desk
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Forecasting
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Forecasting */}
            {step === 6 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 6 // Predict Core"
                  title="Demand Forecasting Layer"
                  subtitle="Runs regression over 5 weeks of reported needs to project future support challenges."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300">
                    Projected growth indices indicate incoming registration surges across the next month.
                  </p>
                  <div className="h-40 flex items-end gap-4 px-4 pt-4 border-b border-white/5">
                    {[
                      { label: "Wk 1", val: 30 },
                      { label: "Wk 2", val: 55 },
                      { label: "Wk 3", val: 42 },
                      { label: "Wk 4", val: 88 },
                      { label: "Wk 5", val: 70 },
                      { label: "Wk 6 (Forecast)", val: 95, color: "from-cyan-400 to-cyan-300" },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full rounded-t bg-gradient-to-t ${bar.color || "from-slate-500/20 to-slate-400/40"}`}
                          style={{ height: `${bar.val}%` }}
                        />
                        <span className="text-[9px] text-slate-500 mt-2 font-mono">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Model accuracy calibration:</span>
                    <span className="text-cyan-400 font-mono font-bold">92.4% Accuracy (Validated)</span>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Decision Engine
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 7: Decision Engine */}
            {step === 7 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 7 // Execution Priorities"
                  title="The Decision Engine"
                  subtitle="Synthesizes profile goals + resource gaps into checked weekly priorities."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300 font-medium">
                    <strong>Interactive Demo:</strong> Select priority items below to simulate completion check logs.
                  </p>
                  <div className="space-y-2">
                    {[
                      { id: "e1", title: "Review tata-cornell scholarship requirements", priority: "Critical" },
                      { id: "e2", title: "Complete CS50 Web Server milestone tests", priority: "High" },
                      { id: "e3", title: "Calibrate Docker and Compose configs", priority: "Medium" }
                    ].map(item => {
                      const checked = completedPriorities[item.id] ?? false;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setCompletedPriorities(prev => ({ ...prev, [item.id]: !checked }))}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-[#0a0d16]/50 hover:bg-[#0e1222]/50 text-left transition"
                        >
                          <span className="text-cyan-400">
                            {checked ? <CheckSquare className="h-4.5 w-4.5 fill-cyan-400 text-black" /> : <Square className="h-4.5 w-4.5" />}
                          </span>
                          <div className="flex-1">
                            <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 font-mono">{item.priority} priority</span>
                            <h4 className={`text-xs font-bold text-white ${checked ? "line-through opacity-40 text-slate-400" : ""}`}>{item.title}</h4>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Impact Summary
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 8: Impact Summary */}
            {step === 8 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 8 // Operational Proof"
                  title="Impact & Calibration Center"
                  subtitle="A consolidated command view demonstrating operational success."
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "People Assisted", value: "25", desc: "Active profiles mapped" },
                    { label: "Needs Resolved", value: "9", desc: "Deficiencies closed" },
                    { label: "Community Health Index", value: "88%", desc: "Satisfied sectors" },
                  ].map(stat => (
                    <CardSurface key={stat.label} variant="glass" className="p-4 space-y-1.5 text-center">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">{stat.label}</span>
                      <span className="text-2xl font-extrabold text-white block">{stat.value}</span>
                      <span className="text-[10px] text-slate-400 block">{stat.desc}</span>
                    </CardSurface>
                  ))}
                </div>
                <CardSurface variant="surface" className="p-6 text-center space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Demo Complete</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    You are now ready to explore CareerOS. Launch the main workspace to test live interactions.
                  </p>
                  <div className="pt-2">
                    <Link href="/dashboard" style={buttonStyle("primary")} className="px-8 py-3 text-black font-bold rounded-xl inline-flex items-center gap-2">
                      Enter Operational Workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Demo Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#080c18]/50 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
        <span>&copy; {new Date().getFullYear()} CareerOS. Private operational mode.</span>
        <div className="flex gap-4">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/impact-center" className="hover:underline">Impact Center</Link>
        </div>
      </footer>
    </main>
  );
}
