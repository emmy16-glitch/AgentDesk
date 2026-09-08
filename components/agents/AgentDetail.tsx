"use client";

import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import type { Agent } from "@/data/agents";
import HireButton from "@/components/agents/HireButton";
import AIAssistant from "@/components/AIAssistant";

export default function AgentDetail({ agent }: { agent: Agent }) {
  return <main className="detail-shell"><Link className="detail-back" href="/"><ArrowLeft size={16} /> Marketplace</Link><div className="detail-grid"><section className="detail-primary"><div className="detail-identity"><div className="detail-icon" style={{ backgroundColor: agent.color }}><ShieldCheck size={42} /></div><div><p>{agent.category}</p><h1>{agent.name} {agent.verified && <CheckCircle2 size={19} fill="#1596e8" />}</h1><span>Verified on {agent.network}</span></div></div><p className="detail-description">{agent.description}</p><div className="detail-trust"><div><span>Trust Score</span><strong>{agent.trustScore}%</strong><small>Verified identity and healthy on-chain reputation</small></div><div className="trust-meter"><i style={{ width: `${agent.trustScore}%` }} /></div></div><section className="detail-section"><h2>What {agent.name} does</h2><ul className="detail-capabilities">{agent.capabilities.map((capability) => <li key={capability}><Check size={16} />{capability}</li>)}</ul></section><section className="detail-section metrics-section"><h2>Performance metrics</h2><dl><div><dt>{agent.activeUsers}</dt><dd>Interactions</dd></div><div><dt>{agent.uptime}</dt><dd>Uptime</dd></div><div><dt>{agent.performance}</dt><dd>Active</dd></div></dl></section></section><aside className="detail-sidebar"><section className="detail-purchase"><span>Activation price</span><strong>{agent.price} BNB</strong><small>BNB Smart Chain Testnet</small><HireButton agent={agent} className="detail-hire" /></section><section className="developer-card"><h2><UserRound size={18} /> Developer</h2><p><b>{agent.developer}</b></p><a href="https://testnet.bscscan.com" target="_blank" rel="noreferrer">View BNB Testnet <ExternalLink size={13} /></a></section><AIAssistant compact /></aside></div></main>;
}
