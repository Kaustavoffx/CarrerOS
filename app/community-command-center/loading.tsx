import { PageHero } from "@/components/ui/page-hero";
import { CardSurface } from "@/components/ui/card-surface";

export default function Loading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="animate-pulse">
        <PageHero
          badge="Syncing Telemetry..."
          title="Establishing Data Uplink"
          subtitle="Initializing community intelligence streams"
        />
      </div>
      <CardSurface variant="glass" className="min-h-[500px] flex flex-col items-center justify-center p-12">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute h-24 w-24 border-2 border-cyan-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute h-16 w-16 border-2 border-cyan-400/40 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
          <div className="h-8 w-8 bg-cyan-400/20 rounded-full animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-widest animate-pulse">
          Receiving Coordinates...
        </h3>
      </CardSurface>
    </div>
  );
}
