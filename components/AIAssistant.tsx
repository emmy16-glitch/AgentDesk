import { Sparkles, ChevronDown, Send, CheckCircle2 } from "lucide-react";

export default function AIAssistant() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md overflow-hidden mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <h2 className="text-sm font-bold text-white">AI Assistant</h2>
        </div>
        <p className="text-xs text-text-muted mb-4">Ask anything about an agent</p>

        {/* Agent selector */}
        <button className="w-full flex items-center justify-between rounded-xl border border-white/[0.08] bg-surface/60 px-3 py-2.5 mb-4 hover:border-white/[0.15] transition-colors text-left">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#a855f7] to-[#8b5cf6] flex items-center justify-center text-[10px] font-bold text-white">G</div>
            <div>
              <div className="text-xs font-semibold text-white">Guardian AI</div>
              <div className="text-[10px] text-text-muted">Security & Monitoring</div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </button>

        {/* Question area */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-white mb-3">Should I trust this agent?</h4>
          <div className="rounded-xl bg-surface/40 border border-white/[0.06] p-3 space-y-2.5">
            {[
              "Verified identity (ERC-8004)",
              "Clean transaction history",
              "No critical vulnerabilities",
              "Active community usage",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[11px] text-text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" strokeWidth={2.5} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div className="rounded-xl bg-gold/[0.06] border border-gold/10 p-3 mb-4">
          <div className="text-xs font-bold text-gold mb-1">Recommendation: Safe to Hire</div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            This agent has a strong track record and transparent permissions. Verified by on-chain data and active users.
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Ask a question..."
            className="w-full rounded-xl border border-white/[0.08] bg-card/80 px-4 py-3 pr-10 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/10 transition-all"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-gold flex items-center justify-center hover:bg-gold-dark transition-colors shadow-[0_2px_10px_rgba(240,185,11,0.3)]">
            <Send className="h-3.5 w-3.5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
