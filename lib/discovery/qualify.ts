import { probeService } from "@/lib/agent-liveness";
import { resolveOnChainAgentIdentity, type AgentService, type OnChainAgentIdentity } from "@/lib/erc8004-registry";
import type { DiscoveredAgent } from "@/lib/8004scan";
import { mapWithConcurrency } from "@/lib/discovery/concurrency";

export interface QualifiedCandidate {
  agent: DiscoveredAgent;
  identity: OnChainAgentIdentity;
  endpointReachable: boolean;
}

function normalizedServiceName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isA2AService(name: string): boolean {
  const normalized = normalizedServiceName(name);
  return normalized === "a2a" || normalized.startsWith("a2a");
}

function isAgentCardService(name: string): boolean {
  const normalized = normalizedServiceName(name);
  return normalized === "agentcard" || normalized.endsWith("agentcard");
}

function hasUnresolvedTemplate(endpoint: string): boolean {
  return /\{[^{}]+\}/.test(endpoint);
}

async function hasReachableAdvertisedA2A(services: AgentService[]): Promise<boolean> {
  const a2a = services.find((entry) => isA2AService(entry.name));
  if (!a2a) return false;

  // Some ERC-8004 registrations publish a JSON-RPC A2A endpoint and a separate,
  // concrete Agent Card. The audition engine prefers that card, so discovery
  // should not reject the candidate merely because GET on the RPC path is odd.
  const explicitCard = services.find((entry) => isAgentCardService(entry.name) && !hasUnresolvedTemplate(entry.endpoint));
  const candidates = explicitCard ? [explicitCard, a2a] : [a2a];

  for (const service of candidates) {
    const probe = await probeService(service);
    if (probe.state === "reachable") return true;
  }
  return false;
}

async function qualifyOne(agent: DiscoveredAgent): Promise<QualifiedCandidate | null> {
  try {
    const identity = await resolveOnChainAgentIdentity(agent.tokenId);
    const endpointReachable = await hasReachableAdvertisedA2A(identity.services);
    if (!endpointReachable) return null;
    return { agent, identity, endpointReachable: true };
  } catch {
    return null;
  }
}

export async function qualifyCandidates(candidates: DiscoveredAgent[], concurrency = 5): Promise<QualifiedCandidate[]> {
  const qualified = await mapWithConcurrency(candidates, concurrency, qualifyOne);
  return qualified.filter((candidate): candidate is QualifiedCandidate => candidate !== null);
}
