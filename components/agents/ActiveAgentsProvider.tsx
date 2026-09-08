"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Agent } from "@/data/agents";
import { useAccount } from "wagmi";

export type ActiveAgent = { agentId: string; name: string; txHash: string; activatedAt: string };
type ActiveAgentsContextValue = { activeAgents: ActiveAgent[]; addActivation: (agent: Agent, txHash: string) => void };
const ActiveAgentsContext = createContext<ActiveAgentsContextValue | null>(null);

export function ActiveAgentsProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([]);
  const storageKey = address ? `agenttrust:activations:${address.toLowerCase()}` : undefined;
  useEffect(() => { setActiveAgents(storageKey ? JSON.parse(window.localStorage.getItem(storageKey) || "[]") : []); }, [storageKey]);
  const value = useMemo(() => ({ activeAgents, addActivation: (agent: Agent, txHash: string) => { if (!storageKey) return; const activation = { agentId: agent.id, name: agent.name, txHash, activatedAt: new Date().toISOString() }; setActiveAgents((current) => { const next = [activation, ...current.filter((item) => item.txHash !== txHash)]; window.localStorage.setItem(storageKey, JSON.stringify(next)); return next; }); } }), [activeAgents, storageKey]);
  return <ActiveAgentsContext.Provider value={value}>{children}</ActiveAgentsContext.Provider>;
}

export function useActiveAgents() { const context = useContext(ActiveAgentsContext); if (!context) throw new Error("useActiveAgents must be used inside ActiveAgentsProvider"); return context; }
