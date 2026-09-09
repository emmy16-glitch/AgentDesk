"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import CleanTaskFirstAudition from "@/components/auditions/CleanTaskFirstAudition";
import type { DiscoveredAgent } from "@/lib/8004scan";

interface DiscoveryResponse {
  ok: boolean;
  agents?: DiscoveredAgent[];
  error?: string;
  provenance?: { checkedAt?: string };
}

export default function HomePage() {
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/agents", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as DiscoveryResponse;
        if (!response.ok || !body.ok) throw new Error(body.error || "Live ERC-8004 discovery failed");
        return body;
      })
      .then((body) => {
        setAgents(body.agents ?? []);
        setCheckedAt(body.provenance?.checkedAt ?? null);
        setError(null);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setAgents([]);
        setError(cause instanceof Error ? cause.message : "Live ERC-8004 discovery failed");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return <div className="min-h-screen overflow-x-hidden bg-background text-white">
    <Navbar />
    <main className="clean-marketplace">
      <section className="clean-hero" aria-labelledby="marketplace-title">
        <span className="clean-eyebrow">BNB AGENT STUDIO · ERC-8004</span>
        <h1 id="marketplace-title">Don&apos;t trust the profile.<br /><span>Audition the agent.</span></h1>
        <p>Tell AgentDesk what you need. It finds real BNB agents, gives them the same task, compares what came back, then lets you verify the winner before you hire.</p>
        <div className="clean-proof-strip" aria-label="AgentDesk proof boundaries">
          <span><b /> Live registry discovery</span>
          <span><b /> Task-specific auditions</span>
          <span><b /> Independent BNB checks</span>
          <span><b /> ERC-8183 hire path</span>
        </div>
      </section>

      <CleanTaskFirstAudition agents={agents} discoveryLoading={loading} discoveryError={error} />

      <section className="clean-how" id="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">How AgentDesk works</h2>
        <div className="clean-how-grid">
          <div><b>1</b><span><strong>Describe one task</strong>Pick health, yield, grid or rebalancing and provide only the information that task needs.</span></div>
          <div><b>2</b><span><strong>Watch agents audition</strong>Selected ERC-8004 candidates get the same bounded task and return live evidence.</span></div>
          <div><b>3</b><span><strong>Verify, then hire</strong>Inspect independent context and only open the ERC-8183 hire path for the agent you choose.</span></div>
        </div>
      </section>

      <details className="clean-registry" id="agents">
        <summary>
          Browse the live ERC-8004 registry
          <span>{loading ? "Loading…" : error ? "Discovery unavailable" : `${agents.length} source-qualified records${checkedAt ? ` · checked ${new Date(checkedAt).toLocaleTimeString()}` : ""}`}</span>
        </summary>
        <div className="clean-registry-list">
          {error ? <div className="clean-error">{error}</div> : null}
          {!error && agents.slice(0, 12).map((agent) => <div className="clean-registry-row" key={`${agent.chainId}:${agent.tokenId}`}>
            <strong>{agent.name}</strong>
            <span>#{agent.tokenId} · {agent.categories[0] || "Unclassified"}</span>
            <a href={agent.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={12} /></a>
          </div>)}
        </div>
      </details>
    </main>
  </div>;
}
