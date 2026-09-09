import type { PaidToolDefinition, PaidToolId } from "@/lib/capabilities/types";

export const PAID_TOOL_CATALOG: readonly PaidToolDefinition[] = [
  {
    id: "cournot",
    label: "Cournot",
    category: "probability-intelligence",
    paymentRail: "b402-or-x402",
    description: "Source-backed probability intelligence for crypto and prediction-market questions.",
    readOnlyResult: true,
    pricing: "provider-quoted",
    proofBoundary: "AgentDesk may permit a hired agent to call Cournot, but a permission is not a payment and a provider response is not independently verified merely because it was paid for.",
  },
  {
    id: "telegraph",
    label: "Telegraph",
    category: "evidence-intelligence",
    paymentRail: "x402",
    description: "External evidence acquisition used by Auctorail-style authorization flows when policy requires additional intelligence.",
    readOnlyResult: true,
    pricing: "provider-quoted",
    proofBoundary: "Telegraph evidence is an input to authorization, not permission by itself. Auctorail or another trusted policy layer must still decide ALLOW, HOLD or BLOCK.",
  },
] as const;

export function isPaidToolId(value: unknown): value is PaidToolId {
  return value === "cournot" || value === "telegraph";
}

export function paidToolDefinition(id: PaidToolId): PaidToolDefinition {
  const tool = PAID_TOOL_CATALOG.find((entry) => entry.id === id);
  if (!tool) throw new Error(`Unknown paid tool: ${id}`);
  return tool;
}
