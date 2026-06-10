"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, X, CheckSquare, Square, Compass, Shield
} from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { PageHero } from "@/components/ui/page-hero";
import { buttonStyle } from "@/styles/careeros-design-system";

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 2 (Intelligence) Interactive state
  const [twinCalibrated, setTwinCalibrated] = useState(false);
  const [skills, setSkills] = useState(["React", "TypeScript", "Next.js"]);
  const [newSkill, setNewSkill] = useState("");

  // Step 3 (Community) Interactive state
  const [selectedCity, setSelectedCity] = useState("Bangalore");
  const [discoveredCount, setDiscoveredCount] = useState(12);
  const [activeDeficiency, setActiveDeficiency] = useState("Mumbai - Mentor Support");

  // Step 4 (Recommendations) Interactive state
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
      setTimeout(() => setTwinCalibrated(false), 1200);
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
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition p-1.5" title="Exit Demo" aria-label="Exit Demo Mode">
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
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            className="w-full"
          >
            {/* Step 1: Problem Statement */}
            {step === 1 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 1 // The Challenge"
                  title="The Career Guidance Gap"
                  subtitle="Why traditional learning paths fail modern builders and how CareerOS bridges the divide."
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <CardSurface variant="glass" className="p-6 space-y-3 border border-red-500/10 bg-red-950/5">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">The Fragmented Legacy Path</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Learners compile career advice from disjointed spreadsheets, static PDF checklists, and isolated support portals. This siloed guidance results in duplication of effort, loss of velocity, and high attrition rates.
                    </p>
                  </CardSurface>
                  <CardSurface variant="glass" className="p-6 space-y-3 border border-cyan-500/10 bg-cyan-950/5">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-geom">The CareerOS Solution</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      CareerOS integrates customized roadmaps, vector-based skills simulations (AI Digital Twin), and contextual AI mentoring directly with live, localized community support programs and real-time gap monitoring.
                    </p>
                  </CardSurface>
                </div>
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    By structuring developer objectives alongside localized resources, CareerOS changes passive advising into daily tactical executions.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button onClick={nextStep} style={buttonStyle("primary")} className="px-6 py-2.5 flex items-center gap-2 text-black font-bold">
                      Begin Calibration
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={skipTour} style={buttonStyle("ghost")} className="px-5 py-2.5 text-xs text-slate-400">
                      Skip Tour
                    </button>
                  </div>
                </CardSurface>
              </div>
            )}

            {/* Step 2: Intelligence (AI Twin & Calibrator) */}
            {step === 2 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 2 // Intelligence"
                  title="AI Twin & Readiness Calibration"
                  subtitle="Vector embeddings compare profile qualifications against industry benchmarks to locate skill deficiencies."
                />
                <CardSurface variant="surface" className="p-6 space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Interactive Calibrator:</strong> Type a skill (e.g. <em>Docker</em>, <em>Golang</em>, or <em>Python</em>) below to see the simulated Digital Twin recalibrate qualifications vector.
                  </p>
                  <form onSubmit={handleAddSkill} className="flex gap-2 max-w-md">
                    <input 
                      type="text" 
                      placeholder="e.g. Docker, Python, PostgreSQL" 
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/40 text-white"
                    />
                    <button type="submit" style={buttonStyle("secondary")} className="px-4 text-xs font-bold shrink-0">
                      Add to Twin
                    </button>
                  </form>
                  
                  <div className="border border-white/5 p-4 rounded-xl space-y-3 bg-[#0a0c16]/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Calibration Profile Skills:</span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">
                        {twinCalibrated ? "⚡ RE-CALIBRATING EMBEDDING MATRIX" : "STATUS: STEADY INDEX"}
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

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-500">Allows recruiters to query profile fit semantic scores instantly.</span>
                    <Link href="/career-twin" style={buttonStyle("ghost")} className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      Open Career Twin Panel
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Community Intel
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Community Proximity & Gaps */}
            {step === 3 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 3 // Proximity & Gaps"
                  title="Community Intelligence Map"
                  subtitle="Connecting users to local support systems while compiling district-level shortage reports."
                />
                <CardSurface variant="surface" className="p-6 space-y-5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Interactive Proximity:</strong> Select a target city to filter support opportunities and audit reported support deficiencies.
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
                          backgroundColor: selectedCity === city ? "rgba(34,211,238,0.12)" : "transparent",
                          borderColor: selectedCity === city ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.06)",
                        }}
                        className="border rounded-xl px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                      >
                        {city}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border border-white/5 rounded-xl bg-white/[0.01] flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Active Proximity</p>
                        <h4 className="text-xs font-bold text-white mt-1">Discovered {discoveredCount} Support Systems in {selectedCity}</h4>
                      </div>
                      <Link href="/resource-discovery" style={buttonStyle("ghost")} className="text-xs font-semibold py-1 rounded-xl flex items-center gap-1">
                        Browse Proximity Map
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="p-4 border border-white/5 rounded-xl bg-white/[0.01] flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Region Deficiencies</p>
                        <div className="mt-1 space-y-1">
                          {[
                            { region: "Mumbai - Mentor Support", gap: "No local mentorship hubs index", risk: "High" },
                            { region: "Kolkata - Student Wellness", gap: "0 active counseling programs", risk: "Critical" },
                          ].map(def => (
                            <button
                              key={def.region}
                              onClick={() => setActiveDeficiency(def.region)}
                              className="w-full text-left text-[10px] p-1.5 rounded bg-black/25 flex justify-between items-center border border-transparent hover:border-cyan-500/20"
                            >
                              <span className={activeDeficiency === def.region ? "text-cyan-300 font-bold" : "text-slate-300"}>
                                {def.region.split(" - ")[0]} ({def.risk})
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">Select</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Link href="/community-gaps" style={buttonStyle("ghost")} className="text-xs font-semibold py-1 rounded-xl flex items-center gap-1">
                        Open Gap Desk
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Recommendations
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Explainable Recommendations */}
            {step === 4 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 4 // Recommendations"
                  title="Explainable AI Recommendation Engine"
                  subtitle="Synthesizing goals, curriculum progress, and region gaps to index checked priorities."
                />
                <CardSurface variant="surface" className="p-6 space-y-5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Interactive Engine:</strong> Select priority roadmap actions below to evaluate execution updates. Every decision is fully transparent.
                  </p>
                  
                  <div className="space-y-2">
                    {[
                      { id: "e1", title: "Apply for Tata-Cornell Local Support Fellowship", explanation: "Why: Open need for financial support matching your New Delhi location.", confidence: 94, source: "Community Support" },
                      { id: "e2", title: "Complete AWS Deployments milestone tests", explanation: "Why: Required technical capability pending for target Cloud Architect goal.", confidence: 88, source: "Roadmaps" },
                    ].map(item => {
                      const checked = completedPriorities[item.id] ?? false;
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-white/5 bg-[#0a0d16]/50 flex flex-col gap-2.5"
                        >
                          <button
                            onClick={() => setCompletedPriorities(prev => ({ ...prev, [item.id]: !checked }))}
                            className="w-full flex items-start gap-3 text-left transition"
                          >
                            <span className="text-cyan-400 mt-0.5 shrink-0">
                              {checked ? <CheckSquare className="h-4.5 w-4.5 fill-cyan-400 text-black" /> : <Square className="h-4.5 w-4.5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 font-mono">{item.source} Engine</span>
                              <h4 className={`text-xs font-bold text-white ${checked ? "line-through opacity-40 text-slate-400" : ""}`}>{item.title}</h4>
                            </div>
                          </button>
                          
                          <div className="pl-7 pt-1.5 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 leading-normal">
                            <span>💡 {item.explanation}</span>
                            <span className="text-cyan-400 font-mono font-bold shrink-0">Confidence: {item.confidence}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-medium">Explainable details: Why am I seeing this? What data was used? How confident is the system?</span>
                    <Link href="/support-navigator" style={buttonStyle("ghost")} className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                      Open Navigator board
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardSurface>
                <div className="pt-2 flex gap-3">
                  <button onClick={nextStep} style={buttonStyle("primary")} className="px-5 py-2 text-black font-bold">
                    Next: Impact Center
                  </button>
                  <button onClick={prevStep} style={buttonStyle("ghost")} className="px-5 py-2 text-xs">
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Impact & Operations */}
            {step === 5 && (
              <div className="space-y-6">
                <PageHero
                  badge="Step 5 // Operations"
                  title="Command Center & Real Metrics"
                  subtitle="A consolidated real-time telemetry view demonstrating operational success and grant distribution efficacy."
                />
                
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "People Assisted", value: "28", desc: "Active profiles mapped" },
                    { label: "Needs Resolved", value: "11", desc: "Region support gaps closed" },
                    { label: "Community Health Index", value: "92%", desc: "Satisfied regional sectors" },
                  ].map(stat => (
                    <CardSurface key={stat.label} variant="glass" className="p-4 space-y-1.5 text-center">
                      <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">{stat.label}</span>
                      <span className="text-2xl font-extrabold text-white block">{stat.value}</span>
                      <span className="text-[10px] text-slate-400 block">{stat.desc}</span>
                    </CardSurface>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CardSurface variant="surface" className="p-5.5 space-y-3 border border-white/5 bg-slate-900/40">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="h-4 w-4 text-cyan-400" />
                      Community Command Center
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Telemetric command desk detailing live need feeds, predictive modeling curves, and dynamic gap score indexes for city authorities.
                    </p>
                    <Link href="/community-command-center" className="text-[11px] text-cyan-300 hover:underline inline-flex items-center gap-1">
                      Launch CommandCenter <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardSurface>

                  <CardSurface variant="surface" className="p-5.5 space-y-3 border border-white/5 bg-slate-900/40">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-cyan-400" />
                      Live Impact center
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Monitoring aggregate reach parameters, verified scholarship counts, and opportunity match metrics to justify funding allocations.
                    </p>
                    <Link href="/impact-center" className="text-[11px] text-cyan-300 hover:underline inline-flex items-center gap-1">
                      Launch ImpactCenter <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardSurface>
                </div>

                <CardSurface variant="surface" className="p-6 text-center space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-geom">Demo Walkthrough Complete</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    You are now ready to explore CareerOS. Launch the main operational workspace to test live interactions.
                  </p>
                  <div className="pt-2">
                    <Link href="/dashboard" style={buttonStyle("primary")} className="px-8 py-3 text-black font-bold rounded-xl inline-flex items-center gap-2 transition active:scale-95">
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
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#080c18]/50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span>&copy; {new Date().getFullYear()} CareerOS. Private operational mode.</span>
        <div className="flex gap-4">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/impact-center" className="hover:underline">Impact Center</Link>
        </div>
      </footer>
    </main>
  );
}
