"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import RegistryAgentCard from "@/components/RegistryAgentCard";
import WalletPanel from "@/components/WalletPanel";
import AIAssistant from "@/components/AIAssistant";
import ActiveAgents from "@/components/ActiveAgents";
import StatsSection from "@/components/StatsSection";
import type { DiscoveredAgent } from "@/lib/8004scan";

interface DiscoveryResponse {
  ok: boolean;
  agents?: DiscoveredAgent[];
  error?: string;
  provenance?: { checkedAt?: string };
}

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
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

  const filteredAgents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return agents.filter((agent) =>
      (activeCategory === "All Categories" || activeCategory === agent.category) &&
      (!needle || `${agent.name} ${agent.category ?? ""} ${agent.description}`.toLowerCase().includes(needle)),
    );
  }, [activeCategory, agents, query]);

  return <div className="min-h-screen overflow-x-hidden bg-background text-white">
    <Navbar />
    <div className="market-shell">
      <div className="market-main">
        <Hero />
        <SearchBar activeCategory={activeCategory} setActiveCategory={setActiveCategory} query={query} setQuery={setQuery} />

        <div role="status" aria-live="polite" style={{ margin: "0 0 16px", color: "#8a8f9e", fontSize: 13 }}>
          {loading && "Discovering registered ERC-8004 agents on BNB Smart Chain…"}
          {!loading && !error && `Sourced from ERC-8004 / 8004scan${checkedAt ? ` · checked ${new Date(checkedAt).toLocaleTimeString()}` : ""}. Registry presence does not yet imply endpoint reachability.`}
        </div>

        {error ? <section className="agent-card" role="alert">
          <h2>Live discovery unavailable</h2>
          <p className="agent-description">{error}</p>
          <p className="agent-description">AgentDesk will not silently replace failed registry discovery with fabricated agent statistics.</p>
        </section> : null}

        {!loading && !error && filteredAgents.length === 0 ? <section className="agent-card">
          <h2>No source-qualified candidates yet</h2>
          <p className="agent-description">No currently indexed BSC agent passed the evidence filter for this category/search. We show an empty result rather than inventing one.</p>
        </section> : null}

        <main className="agent-grid" id="agents" aria-label="ERC-8004 agent discovery results">
          {filteredAgents.map((agent) => <RegistryAgentCard key={`${agent.chainId}:${agent.tokenId}`} agent={agent} />)}
        </main>
      </div>
      <aside className="market-sidebar" aria-label="Wallet and AI dashboard">
        <WalletPanel /><AIAssistant /><ActiveAgents />
      </aside>
    </div>
    <StatsSection />
  </div>;
}
