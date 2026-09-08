import { Check, ExternalLink, ShieldCheck } from "lucide-react";
import type { DiscoveredAgent } from "@/lib/8004scan";

export default function RegistryAgentCard({ agent }: { agent: DiscoveredAgent }) {
  const owner = agent.ownerAddress
    ? `${agent.ownerAddress.slice(0, 6)}…${agent.ownerAddress.slice(-4)}`
    : "Not indexed";
  const registered = agent.registeredAt
    ? new Date(agent.registeredAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
    : "Unknown";

  return <article className="agent-card">
    <header>
      <div className="agent-icon" style={{ backgroundColor: "#2b2f3a" }}><ShieldCheck size={24} /></div>
      <div>
        <h2>{agent.name}</h2>
        <p>{agent.category ?? "Unclassified"}</p>
      </div>
    </header>

    <p className="agent-description">{agent.description}</p>

    <div className="score-box">
      <b>{agent.sourceScore ?? "—"}</b>
      <span>8004scan source score</span>
    </div>

    <dl className="agent-metrics">
      <Metric value={String(agent.feedbackCount ?? 0)} label="Feedback" />
      <Metric value={String(agent.starCount ?? 0)} label="Stars" />
      <Metric value={`#${agent.tokenId}`} label="ERC-8004 ID" />
    </dl>

    <ul>
      <li><Check size={14} />Registry: BNB Smart Chain (56)</li>
      <li><Check size={14} />Owner: {owner}</li>
      <li><Check size={14} />Registered: {registered}</li>
      {agent.protocols.slice(0, 3).map((protocol) => <li key={protocol}><Check size={14} />Protocol: {protocol}</li>)}
      {agent.categoryEvidence.slice(0, 2).map((evidence) => <li key={evidence}><Check size={14} />Category evidence: “{evidence}”</li>)}
    </ul>

    <div className="agent-bottom">
      <strong>Registry listed</strong>
      <small>Reachability not yet asserted</small>
      <a href={agent.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Verify ${agent.name} on 8004scan`}>
        Verify registry proof <ExternalLink size={13} />
      </a>
    </div>
  </article>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><dt>{value}</dt><dd>{label}</dd></div>;
}
