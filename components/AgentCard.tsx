import Link from "next/link";
import { Check, CheckCircle2, ExternalLink } from "lucide-react";
import type { Agent } from "@/data/agents";
import HireButton from "@/components/agents/HireButton";

export default function AgentCard({ agent }: { agent: Agent }) {
  return <article className="agent-card">
    <header><div className="agent-icon" style={{ backgroundColor: agent.color }}><AgentIcon name={agent.icon} /></div><div><h2><span>{agent.name}</span>{agent.verified && <CheckCircle2 size={14} fill="#1596e8" className="verified" />}</h2><p>{agent.category}</p></div></header>
    <p className="agent-description">{agent.description}</p>
    <div className="score-box"><b>{agent.trustScore}%</b><span>Trust Score</span></div>
    <dl className="agent-metrics"><Metric value={agent.activeUsers} label="Interactions" /><Metric value={agent.uptime} label="Uptime" /><Metric value={agent.performance} label="Active" /></dl>
    <ul>{agent.capabilities.map((capability) => <li key={capability}><Check size={14} />{capability}</li>)}</ul>
    <div className="agent-bottom"><strong>{agent.price} BNB</strong><small>per activation</small><HireButton agent={agent} /><Link href={`/agents/${agent.id}`} aria-label={`View ${agent.name} details`}>View Details <ExternalLink size={13} /></Link></div>
  </article>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div><dt>{value}</dt><dd>{label}</dd></div>; }

function AgentIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <path d="M12 21s7-3.7 7-9.2V5.7L12 3 5 5.7v6.1C5 17.3 12 21 12 21zM8.5 12l2.2 2.2 4.8-5" />,
    "trending-up": <><path d="M3 17 9 11l4 3 8-9" /><path d="M15 5h6v6" /></>,
    "bar-chart-3": <><path d="M4 20h16M6 17l4-4 3 2 5-7" /><path d="M17 8h1v1" /></>,
    "pie-chart": <><path d="M12 3v9h9A9 9 0 0 0 12 3z" /><path d="M9.8 5.3A9 9 0 1 0 18.7 14H9.8z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
