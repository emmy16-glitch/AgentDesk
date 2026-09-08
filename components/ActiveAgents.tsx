"use client";

import Link from "next/link";
import { ExternalLink, Layers } from "lucide-react";
import { bscScanTxUrl } from "@/lib/bsc";
import { useActiveAgents } from "@/components/agents/ActiveAgentsProvider";

export default function ActiveAgents() {
  const { activeAgents } = useActiveAgents();
  const latest = activeAgents[0];
  return <section className="side-card active-card"><h2><span><Layers size={23} /></span>My Active Agents <b>◉ {activeAgents.length}</b></h2>{latest ? <div className="active-agent"><div>HG</div><p><strong>{latest.name}</strong><small>Activated: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latest.activatedAt))}</small><a href={bscScanTxUrl(latest.txHash)} target="_blank" rel="noreferrer">View on BscScan <ExternalLink size={12} /></a></p><i>Active</i></div> : <div className="active-empty"><p>No active agents yet.</p><Link href="/#agents">Explore verified agents</Link></div>}</section>;
}
