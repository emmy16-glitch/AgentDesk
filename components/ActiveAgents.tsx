import { Activity, ChevronRight } from "lucide-react";

export default function ActiveAgents() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md overflow-hidden mb-6">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-gold" />
          </div>
          <h2 className="text-sm font-bold text-white">My Active Agents</h2>
        </div>
        <span className="text-[10px] font-bold text-text-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">1</span>
      </div>
      <div className="px-5 pb-5">
        <a href="#" className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface/40 p-3 hover:border-white/[0.12] hover:bg-surface/60 transition-all">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-[#a855f7]/20">G</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Guardian AI</h3>
              <span className="text-[9px] font-extrabold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-[11px] text-text-muted">Activated: Sep 8, 2025, 10:24 AM</p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-gold transition-colors" />
        </a>
        <a href="#" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-gold transition-colors">
          View on BscScan <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
