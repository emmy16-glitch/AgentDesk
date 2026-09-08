import { ArrowRight, BarChart3, Play, SearchCheck, ShieldCheck } from "lucide-react";

export default function Hero() {
  return <section className="hero-section" aria-labelledby="marketplace-title">
    <div className="hero-copy">
      <div className="studio-chip"><CubeMark className="h-5 w-5" /> BNB AGENT STUDIO</div>
      <h1 id="marketplace-title">Don&apos;t trust the profile.<br /><span>Audition the agent.</span></h1>
      <p>Discover ERC-8004 agents on BNB Chain with source-backed identity and reputation data. Next, AgentDesk will let candidates prove task fit before you hire them.</p>
      <div className="hero-actions"><a href="#agents" className="gold-button">Explore Registered Agents <ArrowRight size={17} strokeWidth={2.5} /></a><a href="#how-it-works" className="dark-button"><span className="play-disc"><Play size={9} fill="currentColor" strokeWidth={3} /></span>How it works</a></div>
      <div className="hero-features">
        <Feature icon={ShieldCheck} title="On-chain Identity" detail="ERC-8004 registry proof" />
        <Feature icon={BarChart3} title="Source-backed Signals" detail="No invented trust metrics" />
        <Feature icon={SearchCheck} title="Live Auditions" detail="Task-specific proof before hire" />
      </div>
    </div>
    <HeroVisual />
  </section>;
}

function Feature({ icon: Icon, title, detail }: { icon: typeof ShieldCheck; title: string; detail: string }) {
  return <div className="hero-feature"><span><Icon size={18} /></span><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function HeroVisual() {
  return <div className="hero-visual" aria-label="BNB Chain agent capabilities">
    <div className="visual-aurora" /><div className="speech-card">Discover.<br />Prove fit.<br />Then hire.<i /></div>
    <div className="small-cube cube-one"><CubeMark /></div><div className="small-cube cube-two"><CubeMark /></div><BNBCube />
    <FeatureTag kind="monitor" label="Monitor" /><FeatureTag kind="trade" label="Trade" /><FeatureTag kind="optimize" label="Optimize" /><FeatureTag kind="protect" label="Protect" />
  </div>;
}

function FeatureTag({ kind, label }: { kind: "monitor" | "trade" | "optimize" | "protect"; label: string }) {
  const icons = {
    monitor: <path d="M4 16l4-5 3 3 5-8 1 6M4 20h16V4" />,
    trade: <><path d="M7 19V10M12 19V5M17 19v-8" /><path d="M5 8h4M10 3h4M15 9h4" /></>,
    optimize: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>,
    protect: <path d="M12 3l7 3v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6l7-3z" />,
  };
  return <div className={`feature-tag ${kind}`}><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">{icons[kind]}</svg></span>{label}</div>;
}

function BNBCube() {
  return <svg className="bnb-cube" viewBox="0 0 260 245" role="img" aria-label="Glowing BNB cube"><defs><linearGradient id="top" x1="60" y1="46" x2="198" y2="122" gradientUnits="userSpaceOnUse"><stop stopColor="#201903" /><stop offset=".58" stopColor="#4f3702" /><stop offset="1" stopColor="#e1a500" /></linearGradient><linearGradient id="left" x1="56" y1="78" x2="150" y2="203" gradientUnits="userSpaceOnUse"><stop stopColor="#4c3600" /><stop offset="1" stopColor="#0d0b06" /></linearGradient><linearGradient id="right" x1="153" y1="102" x2="220" y2="174" gradientUnits="userSpaceOnUse"><stop stopColor="#6a4a01" /><stop offset="1" stopColor="#171000" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="134" cy="215" rx="88" ry="18" fill="#e6a900" opacity=".09" filter="url(#glow)" /><path d="M57 80 137 42l82 39-81 44z" fill="url(#top)" stroke="#d49a08" strokeOpacity=".9" /><path d="m57 80 80 45v91l-80-44z" fill="url(#left)" stroke="#ba8504" strokeOpacity=".75" /><path d="m137 125 82-44v91l-82 44z" fill="url(#right)" stroke="#d99f09" strokeOpacity=".75" /><path d="M57 80 137 42l82 39M137 125v91M57 172l80 44 82-44" fill="none" stroke="#f3bd32" strokeWidth="2" opacity=".7" filter="url(#glow)" /><g transform="translate(88 103)" fill="#ffc734" filter="url(#glow)"><path d="m49 1 22 13v26L49 53 27 40V14z" fill="none" stroke="#ffc734" strokeWidth="7"/><path d="m49 9 14 8-14 8-14-8zM34 29l11 7v12l-11-7zm30 0-11 7-11 7v12l11-7zM49 28l11 7-11 7-11-7z" /></g></svg>;
}

export function CubeMark({ className = "" }: { className?: string }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 2 8 4.6v9L12 20l-8-4.4v-9z"/><path d="m4 6.6 8 4.5 8-4.5M12 11v9"/><path d="m8.4 4.1 7.2 4.1M8.4 12.9l7.2 4.1"/></svg>; }
