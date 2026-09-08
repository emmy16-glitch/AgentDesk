import React from "react";
import { ShieldCheck, Users, TrendingUp, Clock, Check, ArrowUpRight } from "lucide-react";
import type { Agent } from "@/data/agents";

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-sm overflow-hidden hover:border-white/[0.12] hover:bg-card/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      {/* Card header */}
      <div className="relative p-5 pb-4">
        {/* Top row: icon + name + badge */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}10)`,
              border: `1px solid ${agent.color}25`,
            }}
          >
            <AgentIcon color={agent.color} name={agent.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white truncate">{agent.name}</h3>
              {agent.verified && (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold/15 border border-gold/20" title="Verified">
                  <ShieldCheck className="h-2.5 w-2.5 text-gold" strokeWidth={3} />
                </span>
              )}
            </div>
            <span className="inline-block mt-1 rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-text-secondary">
              {agent.category}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {agent.description}
        </p>

        {/* Trust score */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold text-white">{agent.trustScore}%</span>
          <span className="text-[10px] text-text-muted">Trust Score</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/80 via-gold to-gold-dark relative"
            style={{ width: `${agent.trustScore}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricItem icon={Users} value={agent.users} label="Active Users" />
          <MetricItem icon={TrendingUp} value={agent.performance} label="Performance" />
          <MetricItem icon={Clock} value={agent.uptime} label="Uptime" />
        </div>

        {/* Capabilities */}
        <ul className="space-y-1.5 mb-5">
          {agent.capabilities.map((cap) => (
            <li key={cap} className="flex items-center gap-2 text-xs text-text-secondary">
              <Check className="h-3 w-3 text-success shrink-0" strokeWidth={3} />
              <span>{cap}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Card footer */}
      <div className="border-t border-white/[0.06] p-5 pt-4 bg-gradient-to-b from-transparent to-card/60">
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Price</span>
            <div className="text-sm font-bold text-white">{agent.price}</div>
            <span className="text-[10px] text-text-muted">per activation</span>
          </div>
          <span className="text-[10px] text-text-muted">Verified Agent</span>
        </div>

        <a
          href="#"
          className="block w-full rounded-xl bg-gold text-center px-4 py-3 text-sm font-extrabold text-black hover:bg-gold-dark transition-colors shadow-[0_4px_20px_rgba(240,185,11,0.25)] mb-3"
        >
          Hire Agent
        </a>
        <a href="#" className="flex items-center justify-center gap-1.5 text-xs font-medium text-text-secondary hover:text-gold transition-colors">
          View Details <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

function MetricItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-text-muted" strokeWidth={2} />
        <span className="text-[10px] text-text-muted">{label}</span>
      </div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function AgentIcon({ color, name }: { color: string; name: string }) {
  const icons: Record<string, React.JSX.Element> = {
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
    "trending-up": (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
    ),
    "bar-chart-3": (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
    ),
    "pie-chart": (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
    ),
  };
  return <div className="h-6 w-6">{icons[name] || icons.shield}</div>;
}
