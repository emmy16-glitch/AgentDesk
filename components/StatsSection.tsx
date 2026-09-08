import { Users, Layers, Trophy, Users2 } from "lucide-react";

export default function StatsSection() {
  const stats = [
    { icon: Users, value: "200K+", label: "Agents on BNB Chain", sub: "(ERC-8004)" },
    { icon: Layers, value: "4", label: "Core categories", sub: "(Monitor, Trade, Protect, Yield)" },
    { icon: Trophy, value: "$40K+", label: "In Prizes & Rewards", sub: "" },
    { icon: Users2, value: "Open to All", label: "Solo Builders & Teams", sub: "" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-card to-background mx-6 lg:mx-auto lg:max-w-[calc(100%-48px)] mb-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] -z-10" />
      <div className="p-8 lg:p-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="group">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <stat.icon className="h-4 w-4 text-gold" strokeWidth={2} />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-white mb-1 tracking-tight">{stat.value}</div>
              <div className="text-sm font-semibold text-text-secondary">{stat.label}</div>
              {stat.sub && <div className="text-[11px] text-text-muted">{stat.sub}</div>}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white">Join the BNB Agent Studio Ecosystem</h3>
            <p className="text-xs text-text-muted">Build, deploy, and monetize verified AI agents.</p>
          </div>
          <a href="#" className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-extrabold text-black hover:bg-gold-dark transition-colors shadow-[0_4px_20px_rgba(240,185,11,0.25)] whitespace-nowrap">
            Build the Future →
          </a>
        </div>
      </div>
    </section>
  );
}
