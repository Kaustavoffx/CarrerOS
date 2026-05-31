import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    title: "Onboarding",
    body: "Answer a short setup flow about your target role, current skill level, and weekly bandwidth."
  },
  {
    title: "Workspace",
    body: "CareerOS turns that input into a private dashboard with notes, roadmaps, mentor prompts, and progress state."
  },
  {
    title: "Momentum",
    body: "You keep one place for planning, tracking, and adjustment instead of bouncing between tools."
  }
];

const differentiators = [
  "Private, persistent state backed by Supabase.",
  "A calmer interface with fewer moving parts and less noise.",
  "Built for engineers and career switchers who want execution, not spectacle.",
  "Fast routes, simple navigation, and a workspace that stays out of the way."
];

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black_35%,transparent_92%)]" />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Private career workspace
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-[clamp(3rem,8vw,5.25rem)] font-medium leading-[0.96] tracking-[-0.05em] text-white">
                CareerOS keeps your career plan in one calm place.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                CareerOS is a private workspace for engineers and career switchers. It turns onboarding input into a roadmap, a progress system, and a place to keep notes, mentor guidance, and next steps together.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300 px-6 py-3 text-sm font-medium text-black transition hover:bg-cyan-200"
              >
                Start onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07]"
              >
                Open dashboard
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                <Database className="h-4 w-4 text-cyan-300" />
                Supabase-backed state
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                Fewer distractions
              </span>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0a0a0c] p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">What happens after onboarding</p>
              <ol className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-medium text-cyan-200">1</span>
                  You enter a private dashboard with your profile, readiness score, and saved roadmap state.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-medium text-cyan-200">2</span>
                  You can review roadmaps, mentor prompts, and notes without re-entering context.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-medium text-cyan-200">3</span>
                  The workspace persists across refreshes, so planning continues where you left off.
                </li>
              </ol>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step) => (
                <article key={step.title} className="rounded-[1.3rem] border border-white/10 bg-[#09090b] p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{step.title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Who it is for</p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white">People who want a private operating system for career progress.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                The product is for engineers, role switchers, and anyone trying to stay organized without a noisy startup-style interface.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Why it is different</p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white">Less spectacle. More recall. More follow-through.</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                {differentiators.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
