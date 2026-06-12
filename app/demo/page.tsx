import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default async function DemoPage() {
  async function activateJudgeMode() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.set("careeros_judge_demo", "true", { path: "/" });
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="max-w-md w-full relative z-10 text-center space-y-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Image src="/logo.png" alt="CareerOS" width={56} height={56} className="drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          <div>
            <h1 className="text-2xl font-extrabold uppercase tracking-wider font-geom mb-2">CareerOS</h1>
            <span className="text-xs uppercase tracking-widest text-cyan-400 border border-cyan-400/20 bg-cyan-950/20 px-3 py-1 rounded-full flex items-center justify-center gap-2 max-w-max mx-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              Judge Demo Mode
            </span>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4 backdrop-blur-sm shadow-xl">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Welcome, Judge! 
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            This mode bypasses sign-up and authentication. You will be instantly logged in as <strong>Roni</strong>, a small-town student working towards becoming a Software Engineer.
          </p>
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pre-loaded Intelligence:</span>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              <li>Complete 10-week Software Engineering roadmap</li>
              <li>Agentic swarm gaps (Cloud & Architecture)</li>
              <li>Community and Mentorship opportunities</li>
              <li>Executive Impact Dashboards</li>
            </ul>
          </div>

          <form action={activateJudgeMode} className="pt-2">
            <button
              type="submit"
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold h-12 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              Enter Workspace as Roni
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          
          <p className="text-[10px] text-slate-500 mt-4">
            Estimated exploration time: ~2 minutes. No data will be permanently saved.
          </p>
        </div>
      </div>
    </main>
  );
}
