import { ShieldCheck, BarChart3, Lock, Play, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gold/5 rounded-full blur-[120px] -z-10" />

      <div className="mx-auto max-w-[1440px] px-6 pt-16 pb-8">
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-start">
          {/* Left content */}
          <div className="pt-4">
            {/* Label */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface px-4 py-1.5 mb-6 shadow-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gold/15 border border-gold/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f0b90b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gold tracking-wide uppercase">
                BNB Agent Studio
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight mb-6">
              Discover. Trust. Hire.{" "}
              <br />
              <span className="text-gradient-gold">AI Agents on BNB Chain.</span>
            </h1>

            {/* Description */}
            <p className="text-text-secondary text-base lg:text-lg leading-relaxed max-w-xl mb-8">
              The leading marketplace for AI agents. Browse, compare, and hire verified agents to put your capital, data and ideas to work.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 mb-10">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black hover:bg-gold-dark transition-colors shadow-[0_4px_30px_rgba(240,185,11,0.3)]"
              >
                Explore Agents
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-surface/80 px-6 py-3 text-sm font-semibold text-white hover:bg-surface hover:border-white/[0.2] transition-all backdrop-blur-sm"
              >
                <Play className="h-4 w-4 text-gold fill-gold" />
                How it works
              </a>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: ShieldCheck, label: "Verified Agents", desc: "On-chain identity and reputation" },
                { icon: BarChart3, label: "Transparent Metrics", desc: "Real performance data" },
                { icon: Lock, label: "Secure Payments", desc: "Powered by BNB Chain and x402" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card px-4 py-3 hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 border border-gold/10">
                    <f.icon className="h-4 w-4 text-gold" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white leading-tight">{f.label}</div>
                    <div className="text-[11px] text-text-muted">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center illustration area */}
          <div className="relative flex items-center justify-center min-h-[420px]">
            {/* Glowing orb behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gold/10 rounded-full blur-[80px]" />

            {/* Cube */}
            <div className="relative z-10">
              <div className="relative w-56 h-56">
                {/* Main gold cube */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c4930a] via-[#f0b90b] to-[#8a6208] shadow-[0_0_60px_rgba(240,185,11,0.25)] rotate-[8deg] scale-[0.85] opacity-90">
                  <div className="absolute inset-2 rounded-xl bg-gradient-to-tr from-[#111327] to-[#0a0b14] flex items-center justify-center border border-white/[0.08]">
                    <div className="text-center">
                      <CubeIconLarge />
                    </div>
                  </div>
                </div>
                {/* Floating cards around cube */}
                <FloatingCard label="Monitor" icon="chart" top="-3" left="-16" />
                <FloatingCard label="Trade" icon="zap" top="20" right="-24" />
                <FloatingCard label="Optimize" icon="trending" bottom="-8" left="-10" />
                <FloatingCard label="Protect" icon="shield" bottom="12" right="-14" />
                {/* Extra text card from reference */}
                <div className="absolute z-20 rounded-xl bg-card/90 backdrop-blur-md border border-white/[0.08] shadow-2xl px-4 py-3 w-36 top-[-3.5rem] right-[-4rem] hidden lg:block">
                  <div className="text-[11px] font-bold text-white leading-tight">Real Agents.</div>
                  <div className="text-[11px] font-bold text-white leading-tight">Real Value.</div>
                  <div className="text-[11px] font-bold text-white leading-tight">On-Chain.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CubeIconLarge() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
      <path d="M32 8 L56 18 L56 42 L32 52 L8 42 L8 18 Z" />
      <path d="M32 8 L32 32 L56 18" />
      <path d="M32 32 L8 18" />
      <path d="M32 32 L32 52" />
    </svg>
  );
}

function FloatingCard({ label, icon, top, left, right, bottom }: { label: string; icon: string; top?: string; left?: string; right?: string; bottom?: string }) {
  const Icon = icon === "chart" ? MonitorIcon : icon === "zap" ? ZapIcon : icon === "trending" ? TrendingIcon : ShieldIcon;
  return (
    <div
      className="absolute z-20 rounded-xl bg-card/90 backdrop-blur-md border border-white/[0.08] shadow-2xl px-3.5 py-3 w-28"
      style={{ top, left, right, bottom }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-7 w-7 rounded-md bg-gold/10 flex items-center justify-center border border-gold/10">
          <Icon className="h-3.5 w-3.5 text-gold" />
        </div>
        <span className="text-xs font-bold text-white">{label}</span>
      </div>
      <div className="text-[10px] text-text-secondary">Real-time tracking</div>
    </div>
  );
}

function MonitorIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 17 9 12 13 16 21 8" /><path d="M21 8H3v9h18Z" /></svg>
  );
}
function ZapIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></svg>
  );
}
function TrendingIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
  );
}
function ShieldIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}
