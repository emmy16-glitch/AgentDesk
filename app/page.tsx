"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import AgentCard from "@/components/AgentCard";
import WalletPanel from "@/components/WalletPanel";
import AIAssistant from "@/components/AIAssistant";
import ActiveAgents from "@/components/ActiveAgents";
import StatsSection from "@/components/StatsSection";
import { agents } from "@/data/agents";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const filteredAgents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return agents.filter((agent) =>
      (activeCategory === "All Categories" || activeCategory === agent.category) &&
      (!needle || `${agent.name} ${agent.category} ${agent.description}`.toLowerCase().includes(needle)),
    );
  }, [activeCategory, query]);

  return <div className="min-h-screen overflow-x-hidden bg-background text-white">
    <Navbar />
    <div className="market-shell">
      <div className="market-main">
        <Hero />
        <SearchBar activeCategory={activeCategory} setActiveCategory={setActiveCategory} query={query} setQuery={setQuery} />
        <main className="agent-grid" id="agents" aria-label="Verified AI agents">
          {filteredAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
        </main>
      </div>
      <aside className="market-sidebar" aria-label="Wallet and AI dashboard">
        <WalletPanel /><AIAssistant /><ActiveAgents />
      </aside>
    </div>
    <StatsSection />
  </div>;
}
