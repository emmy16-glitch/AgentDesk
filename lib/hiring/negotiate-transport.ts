import { randomUUID } from "node:crypto";
import type { AgentService } from "@/lib/erc8004-registry";
import type { AgentWalletPolicyRequest } from "@/lib/agent-wallets/types";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

const MAX_JSON_BYTES = 256 * 1024;

interface NegotiationInput {
  task_description: string;
  terms: {
    deliverables: string;
    quality_standards: string;
    success_criteria?: string[];
  };
  /**
   * Provider-neutral requested wallet boundary. Providers may use Turnkey,
   * TWAK, Altana or another backend to implement it. Sending this object does
   * not prove that a provider-side policy is configured or enforced.
   */
  agent_wallet_policy?: AgentWalletPolicyRequest;
}

export interface NegotiationTransportResult {
  raw: unknown;
  serviceEndpoint: string;
  negotiationEndpoint: string;
  transport: "HTTP" | "A2A";
}

export interface FundedNotificationResult {
  notified: boolean;
  endpoint: string | null;
  detail: string;
  raw?: unknown;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizedServiceName(service: AgentService): string {
  return service.name.toLowerCase().replaceAll("-", "").replaceAll("_", "").replaceAll(" ", "");
}

export function isDirectCommerceService(service: AgentService): boolean {
  const name = normalizedServiceName(service);
  return name.includes("erc8183") || name.includes("agenticcommerce") || name === "apex";
}

export function isA2AService(service: AgentService): boolean {
  return normalizedServiceName(service) === "a2a";
}

async function readJsonLimited(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("ERC-8183 service response exceeded AgentDesk evidence size limit");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
    throw new Error("ERC-8183 service response exceeded AgentDesk evidence size limit");
  }
  return JSON.parse(text) as unknown;
}

async function safePostJson(url: URL, body: unknown): Promise<{ response: Response; raw?: unknown }> {
  const validation = await validatePublicHttpsUrl(url.toString());
  if (!validation.ok) throw new Error(`ERC-8183 endpoint is unsafe to call: ${validation.reason}`);
  const response = await fetch(validation.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/a2a+json",
      "User-Agent": "AgentDesk-ERC8183-Buyer/2.0",
    },
    body: JSON.stringify(body),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return { response };
  return { response, raw: await readJsonLimited(response) };
}

function directCandidates(endpoint: URL): URL[] {
  const candidates: URL[] = [];
  const path = endpoint.pathname.replace(/\/+$/, "");
  if (/\/negotiate$/i.test(path)) candidates.push(endpoint);
  else {
    const direct = new URL(endpoint.toString());
    direct.pathname = `${path}/negotiate`;
    candidates.push(direct);

    if (!/\/erc8183$/i.test(path)) {
      const mounted = new URL(endpoint.toString());
      mounted.pathname = `${path}/erc8183/negotiate`.replace(/\/+/g, "/");
      candidates.push(mounted);
    }
  }
  return [...new Map(candidates.map((url) => [url.toString(), url])).values()];
}

async function negotiateDirect(service: AgentService, input: NegotiationInput): Promise<NegotiationTransportResult> {
  const serviceValidation = await validatePublicHttpsUrl(service.endpoint);
  if (!serviceValidation.ok) throw new Error(`Advertised ERC-8183 service is unsafe to call: ${serviceValidation.reason}`);

  let lastStatus: number | null = null;
  for (const candidate of directCandidates(serviceValidation.url)) {
    const result = await safePostJson(candidate, input);
    if (result.response.ok && result.raw !== undefined) {
      return {
        raw: result.raw,
        serviceEndpoint: serviceValidation.url.toString(),
        negotiationEndpoint: candidate.toString(),
        transport: "HTTP",
      };
    }
    lastStatus = result.response.status;
    await result.response.body?.cancel().catch(() => undefined);
    if (lastStatus !== 404 && lastStatus !== 405) break;
  }
  throw new Error(`Advertised ERC-8183 negotiation failed${lastStatus ? ` with HTTP ${lastStatus}` : ""}`);
}

interface AgentCard {
  url?: string;
  preferredTransport?: string;
  supportedInterfaces?: Array<{ url?: string; protocolBinding?: string }>;
  skills?: Array<{ id?: string; name?: string }>;
}

function cardCandidates(endpoint: URL): URL[] {
  const candidates = [endpoint];
  if (!endpoint.pathname.toLowerCase().includes("agent-card")) {
    candidates.push(new URL("/.well-known/agent-card.json", endpoint.origin));
  }
  return [...new Map(candidates.map((url) => [url.toString(), url])).values()];
}

function cardAdvertisesSkill(card: AgentCard, requiredSkill: "negotiate" | "notify_funded"): boolean {
  if (!Array.isArray(card.skills)) return false;
  return card.skills.some((skill) => {
    const id = `${skill?.id ?? ""} ${skill?.name ?? ""}`.toLowerCase();
    if (requiredSkill === "notify_funded") return id.includes("notify_funded") || (id.includes("notify") && id.includes("fund"));
    return id.includes("negotiate-erc8183-job") || (id.includes("erc8183") && id.includes("negot"));
  });
}

async function resolveA2ACard(
  service: AgentService,
  requiredSkill: "negotiate" | "notify_funded",
): Promise<{ card: AgentCard; cardUrl: string }> {
  const serviceValidation = await validatePublicHttpsUrl(service.endpoint);
  if (!serviceValidation.ok) throw new Error(`Advertised A2A service is unsafe to call: ${serviceValidation.reason}`);

  let lastReason = "no agent card responded";
  for (const candidate of cardCandidates(serviceValidation.url)) {
    const validation = await validatePublicHttpsUrl(candidate.toString());
    if (!validation.ok) continue;
    try {
      const response = await fetch(validation.url, {
        method: "GET",
        headers: { Accept: "application/json, application/a2a+json", "User-Agent": "AgentDesk-ERC8183-Buyer/2.0" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        lastReason = `HTTP ${response.status}`;
        await response.body?.cancel().catch(() => undefined);
        continue;
      }
      const raw = record(await readJsonLimited(response));
      if (!raw) continue;
      const card = raw as AgentCard;
      if (!cardAdvertisesSkill(card, requiredSkill)) {
        lastReason = `agent card does not advertise ${requiredSkill}`;
        continue;
      }
      return { card, cardUrl: validation.url.toString() };
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "agent-card resolution failed";
    }
  }

  if (requiredSkill === "negotiate" && lastReason === "agent card does not advertise negotiate") {
    throw new Error("This agent can be tested, but its A2A card does not advertise the signed ERC-8183 hiring capability AgentDesk needs. No funds moved.");
  }
  throw new Error(`A2A service did not prove required ${requiredSkill} capability: ${lastReason}`);
}

function a2aTarget(card: AgentCard): string | null {
  if (typeof card.url === "string" && card.url.trim()) return card.url.trim();
  if (Array.isArray(card.supportedInterfaces)) {
    const rpc = card.supportedInterfaces.find((item) =>
      typeof item?.url === "string" && String(item.protocolBinding ?? "JSONRPC").toUpperCase() === "JSONRPC",
    );
    if (rpc?.url) return rpc.url.trim();
  }
  return null;
}

function extractA2AData(raw: unknown): unknown {
  const root = record(raw);
  const result = record(root?.result);
  const parts = result && Array.isArray(result.parts) ? result.parts : null;
  if (!parts) return null;
  for (const part of parts) {
    const object = record(part);
    if (!object) continue;
    if ((object.kind === "data" || object.type === "data") && record(object.data)) return object.data;
  }
  return null;
}

async function sendA2ASkill(target: URL, data: Record<string, unknown>): Promise<unknown> {
  const rpc = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "message/send",
    params: {
      message: {
        kind: "message",
        role: "user",
        messageId: randomUUID(),
        parts: [{ kind: "data", data }],
      },
    },
  };
  const result = await safePostJson(target, rpc);
  if (!result.response.ok || result.raw === undefined) {
    const status = result.response.status;
    await result.response.body?.cancel().catch(() => undefined);
    throw new Error(`A2A ERC-8183 request returned HTTP ${status}`);
  }
  return result.raw;
}

async function negotiateA2A(service: AgentService, input: NegotiationInput): Promise<NegotiationTransportResult> {
  const serviceValidation = await validatePublicHttpsUrl(service.endpoint);
  if (!serviceValidation.ok) throw new Error(`Advertised A2A service is unsafe to call: ${serviceValidation.reason}`);
  const { card } = await resolveA2ACard(service, "negotiate");
  const target = a2aTarget(card);
  if (!target) throw new Error("A2A card advertises ERC-8183 negotiation but no JSON-RPC target");

  const targetValidation = await validatePublicHttpsUrl(target);
  if (!targetValidation.ok) throw new Error(`A2A negotiation target is unsafe to call: ${targetValidation.reason}`);
  const raw = await sendA2ASkill(targetValidation.url, { skill: "negotiate-erc8183-job", ...input });
  const data = extractA2AData(raw);
  if (!data) throw new Error("A2A negotiation response did not contain a structured data result");

  return {
    raw: data,
    serviceEndpoint: serviceValidation.url.toString(),
    negotiationEndpoint: targetValidation.url.toString(),
    transport: "A2A",
  };
}

export async function negotiateAdvertisedService(
  services: AgentService[],
  input: NegotiationInput,
): Promise<NegotiationTransportResult> {
  const direct = services.find(isDirectCommerceService);
  if (direct) return negotiateDirect(direct, input);

  const a2a = services.find(isA2AService);
  if (a2a) return negotiateA2A(a2a, input);

  throw new Error("This ERC-8004 identity advertises neither a direct ERC-8183 commerce service nor an A2A negotiation skill endpoint");
}

export async function notifyFundedAdvertisedA2A(
  services: AgentService[],
  input: { jobId: string; chainId: 56 | 97 },
): Promise<FundedNotificationResult> {
  const service = services.find(isA2AService);
  if (!service) {
    return {
      notified: false,
      endpoint: null,
      detail: "No A2A service is advertised. Direct ERC-8183 providers may detect the funded job through their own chain watcher.",
    };
  }

  const numericJobId = Number(input.jobId);
  if (!Number.isSafeInteger(numericJobId) || numericJobId < 0) {
    throw new Error("A2A notify_funded requires a safely representable ERC-8183 job ID");
  }

  const { card } = await resolveA2ACard(service, "notify_funded");
  const target = a2aTarget(card);
  if (!target) throw new Error("A2A card advertises notify_funded but no JSON-RPC target");
  const validation = await validatePublicHttpsUrl(target);
  if (!validation.ok) throw new Error(`A2A notify_funded target is unsafe to call: ${validation.reason}`);

  const raw = await sendA2ASkill(validation.url, {
    skill: "notify_funded",
    job_id: numericJobId,
    chain_id: input.chainId,
  });
  const root = record(raw);
  if (root?.error) throw new Error("A2A provider rejected notify_funded");

  return {
    notified: true,
    endpoint: validation.url.toString(),
    detail: "Provider A2A endpoint accepted the funded-job notification.",
    raw,
  };
}
