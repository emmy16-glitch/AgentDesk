import { probeService } from "@/lib/agent-liveness";
import { resolveOnChainAgentIdentity, type OnChainAgentIdentity } from "@/lib/erc8004-registry";
import type { DiscoveredAgent } from "@/lib/8004scan";
import { mapWithConcurrency } from "@/lib/discovery/concurrency";

export interface QualifiedCandidate {
  agent: DiscoveredAgent;
  identity: OnChainAgentIdentity;
  endpointReachable: boolean;
}

function isA2AService(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === "a2a" || normalized.startsWith("a2a");
}

async function qualifyOne(agent: DiscoveredAgent): Promise<QualifiedCandidate | null> {
  try {
    const identity = await resolveOnChainAgentIdentity(agent.tokenId);
    const service = identity.services.find((entry) => isA2AService(entry.name));
    if (!service) return null;
    const probe = await probeService(service);
    if (probe.state !== "reachable") return null;
    return { agent, identity, endpointReachable: true };
  } catch {
    return null;
  }
}

export async function qualifyCandidates(candidates: DiscoveredAgent[], concurrency = 4): Promise<QualifiedCandidate[]> {
  const qualified = await mapWithConcurrency(candidates, concurrency, qualifyOne);
  return qualified.filter((candidate): candidate is QualifiedCandidate => candidate !== null);
}
