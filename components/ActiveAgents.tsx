"use client";

import { ExternalLink, Layers } from "lucide-react";
import { bscScanTxUrl } from "@/lib/bsc";
import { useActiveAgents } from "@/components/agents/ActiveAgentsProvider";

export default function ActiveAgents() {
  const { activeAgents } = useActiveAgents();
  const latest = activeAgents[0];
  return <section className="side-card active-card"><h2><span><Layers size={23} /></span>Prototype Activations <b>{activeAgents.length}</b></h2><p className="side-subtitle">Legacy BSC Testnet activation receipts — not completed agent jobs.</p>{latest ? <div className="active-agent"><div>TX</div><p><strong>{latest.name}</strong><small>Prototype activation: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latest.activatedAt))}</small><a href={bscScanTxUrl(latest.txHash)} target="_blank" rel="noreferrer">View testnet receipt <ExternalLink size={12} /></a></p><i>Prototype</i></div> : <div className="active-empty"><p>No prototype activations stored for this wallet.</p></div>}</section>;
}
