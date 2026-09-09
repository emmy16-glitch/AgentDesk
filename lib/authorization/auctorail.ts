import type { HireCapabilityPolicy } from "@/lib/capabilities/types";
import type { AuthorizationEvaluation, AuthorizationProposal } from "@/lib/authorization/types";

const MAX_RESPONSE_BYTES = 128 * 1024;
const TIMEOUT_MS = 7_000;

function configuredBaseUrl(): URL | null {
  if (process.env.AUCTORAIL_PREFLIGHT_ENABLED?.trim().toLowerCase() !== "true") return null;
  const raw = process.env.AUCTORAIL_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local)) return null;
    return url;
  } catch {
    return null;
  }
}

export function auctorailPreflightConfigured(): boolean {
  return Boolean(configuredBaseUrl());
}

function decisionFrom(value: unknown): "ALLOW" | "HOLD" | "BLOCK" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "HOLD";
  const raw = value as Record<string, unknown>;
  if (raw.decision === "ALLOW" || raw.decision === "HOLD" || raw.decision === "BLOCK") return raw.decision;
  if (raw.status === "BLOCKED") return "BLOCK";
  return "HOLD";
}

async function readJsonLimited(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error("Auctorail response exceeded the safety limit");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("Auctorail response exceeded the safety limit");
  return JSON.parse(text) as unknown;
}

export async function requestAuctorailPreflight(input: {
  agentId: string;
  policy: HireCapabilityPolicy;
  proposal: AuthorizationProposal;
}): Promise<AuthorizationEvaluation | null> {
  const base = configuredBaseUrl();
  if (!base) return null;

  const amount = input.proposal.amount;
  const recipient = input.proposal.recipient;
  const limit = input.policy.maxToolSpend?.amount;
  if (!amount || !recipient || !limit) return null;

  const endpoint = new URL("/api/authorize", base);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const token = process.env.AUCTORAIL_API_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "policy",
        agentId: input.agentId,
        limit,
        amount,
        destination: recipient,
        durationSeconds: 3600,
        reason: input.proposal.description || "AgentDesk paid-tool authorization preflight",
        reference: input.proposal.reference || `agentdesk-${Date.now()}`,
      }),
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const raw = await readJsonLimited(response);
    const decision = decisionFrom(raw);
    return {
      decision,
      reason: decision === "ALLOW"
        ? "Auctorail policy preflight accepted the bounded proposal."
        : decision === "BLOCK"
          ? "Auctorail policy preflight blocked the proposal."
          : "Auctorail policy preflight requires more evidence or authority before execution.",
      checks: [{ id: "auctorail", status: decision === "ALLOW" ? "pass" : decision === "BLOCK" ? "fail" : "unknown", summary: `Auctorail returned ${decision}.` }],
      executable: false,
      source: "auctorail-preflight",
      boundary: "This call uses Auctorail policy mode only. AgentDesk does not request live Telegraph/x402 evidence or receive executable authority from this preflight adapter.",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
