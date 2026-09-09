"use client";

import { useEffect, useState } from "react";
import GuidedMarketplace from "@/components/agentdesk/GuidedMarketplace";
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

  return <GuidedMarketplace agents={agents} discoveryLoading={loading} discoveryError={error} />;
}
