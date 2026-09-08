"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import AgentCard from "@/components/AgentCard";
import WalletPanel from "@/components/WalletPanel";
import AIAssistant from "@/components/AIAssistant";
import ActiveAgents from "@/components/ActiveAgents";
import StatsSection from "@/components/StatsSection";
import { agents, categories } from "@/data/agents";
import { useState } from "react";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const filteredAgents = activeCategory === "All Categories"
    ? agents
    : agents.filter(a => {
        const catMap: Record<string, string[]> = {
          "Monitoring Agents": ["Security & Monitoring"],
          "Grid Trading Agents": ["Grid Trading"],
          "Health Factor Agents": ["Portfolio Analysis"],
          "Yield Agents": ["Yield Optimization"],
        };
        return (catMap[activeCategory] || []).includes(a.category);
      });

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <Hero />

      <div className="mx-auto max-w-[1440px] px-6">
        <SearchBar activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Main agent grid */}
          <main>
            <div className="grid sm:grid-cols-2 gap-5">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <WalletPanel />
            <AIAssistant />
            <ActiveAgents />
          </aside>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6">
        <StatsSection />
      </div>
    </div>
  );
}
