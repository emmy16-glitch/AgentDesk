import { randomUUID } from "node:crypto";
import type { AgentService } from "@/lib/erc8004-registry";
import { validatePublicHttpsUrl } from "@/lib/network-safety";
import { buildAuditionPrompt } from "@/lib/auditions/task-prompt";
import type { AuditionEvidence, AuditionQuote, AuditionStatus, AuditionTask } from "@/lib/auditions/types";

const MAX_CARD_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_RENDERED_OUTPUT_CHARS = 48_000;
const AUDITION_DEADLINE_MS = 12_000;
const A2A_POLL_INTERVAL_MS = 650;

interface AgentCard {
  protocolVersion?: string;
  name?: string;
  description?: string;
  url?: string;
  preferredTransport?: string;
  supportedInterfaces?: Array<{ url?: string; protocolBinding?: string; protocolVersion?: string }>;
  security?: unknown;
  securitySchemes?: unknown;
  skills?: unknown;
  [key: string]: unknown;
}

interface A2AExecution {
  status: AuditionStatus;
  latencyMs: number | null;
  checkedAt: string;
  output: string | null;
  quote: AuditionQuote | null;
  evidence: AuditionEvidence[];
  error?: string;
}

interface ResolvedAgentCard {
  card: AgentCard;
  sourceUrl: string;
}

interface ServiceOffer {
  output: string;
  quote: AuditionQuote | null;
  evidenceSummary: string;
}

function timeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function hasRequiredSecurity(card: AgentCard): boolean {
  return Array.isArray(card.security) && card.security.length > 0;
}

function isAgentCard(value: unknown): value is AgentCard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const card = value as Record<string, unknown>;
  const hasName = typeof card.name === "string" && card.name.trim().length > 0;
  const hasLegacyUrl = typeof card.url === "string" && card.url.trim().length > 0;
  const hasInterfaces = Array.isArray(card.supportedInterfaces) && card.supportedInterfaces.some((item) => {
    if (!item || typeof item !== "object") return false;
    return typeof (item as Record<string, unknown>).url === "string";
  });
  const hasProtocolVersion = typeof card.protocolVersion === "string" && card.protocolVersion.trim().length > 0;
  const hasSkills = Array.isArray(card.skills);
  return hasName && (hasLegacyUrl || hasInterfaces) && (hasProtocolVersion || hasSkills || hasInterfaces);
}

function renderStructuredData(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  try {
    const rendered = JSON.stringify(value, null, 2);
    return rendered.length > MAX_RENDERED_OUTPUT_CHARS
      ? `${rendered.slice(0, MAX_RENDERED_OUTPUT_CHARS)}\n…[truncated by AgentDesk]`
      : rendered;
  } catch {
    return null;
  }
}

function contentFromParts(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const value = part as Record<string, unknown>;
    const partKind = typeof value.kind === "string" ? value.kind : value.type;

    if ((partKind === "text" || partKind === undefined) && typeof value.text === "string" && value.text.trim()) {
      return [value.text.trim()];
    }

    if ((partKind === "data" || partKind === undefined) && "data" in value) {
      const rendered = renderStructuredData(value.data);
      return rendered ? [rendered] : [];
    }

    return [];
  });
}

function outputFromMessage(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = contentFromParts((value as Record<string, unknown>).parts);
  return content.length ? content.join("\n\n") : null;
}

function directOutput(value: Record<string, unknown>): string | null {
  for (const key of ["output", "answer", "text", "content"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractOutput(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as Record<string, unknown>;
  const result = envelope.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const value = result as Record<string, unknown>;

  const nonStandardDirect = directOutput(value);
  if (nonStandardDirect) return nonStandardDirect;

  const direct = outputFromMessage(value);
  if (direct) return direct;

  const nestedMessage = outputFromMessage(value.message);
  if (nestedMessage) return nestedMessage;

  const status = value.status;
  if (status && typeof status === "object") {
    const statusMessage = outputFromMessage((status as Record<string, unknown>).message);
    if (statusMessage) return statusMessage;
  }

  if (Array.isArray(value.artifacts)) {
    const artifactContent = value.artifacts.flatMap((artifact) => {
      const rendered = outputFromMessage(artifact);
      if (rendered) return [rendered];
      if (artifact && typeof artifact === "object" && !Array.isArray(artifact)) {
        const parts = contentFromParts((artifact as Record<string, unknown>).parts);
        return parts.length ? [parts.join("\n\n")] : [];
      }
      return [];
    });
    if (artifactContent.length) return artifactContent.join("\n\n");
  }

  if (Array.isArray(value.history)) {
    for (const message of [...value.history].reverse()) {
      if (!message || typeof message !== "object") continue;
      const role = (message as Record<string, unknown>).role;
      if (role === "user") continue;
      const rendered = outputFromMessage(message);
      if (rendered) return rendered;
    }
  }

  return null;
}

function taskState(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const status = (result as Record<string, unknown>).status;
  if (!status || typeof status !== "object" || Array.isArray(status)) return null;
  const state = (status as Record<string, unknown>).state;
  return typeof state === "string" ? state.trim().toLowerCase() : null;
}

function taskId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const id = (result as Record<string, unknown>).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function parseQuote(value: unknown, source: string): AuditionQuote | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const amount = typeof raw.amount === "string" ? raw.amount.trim() : "";
  const asset = typeof raw.asset === "string" ? raw.asset.trim() : "";
  if (!amount || !asset) return null;

  const expiresAt = typeof raw.expiresAt === "string" && raw.expiresAt.trim() ? raw.expiresAt.trim() : undefined;
  return {
    amount,
    asset,
    ...(expiresAt ? { expiresAt } : {}),
    source,
  };
}

function findQuoteInValue(value: unknown, depth = 0): AuditionQuote | null {
  if (depth > 4 || !value || typeof value !== "object") return null;

  if (!Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const direct = parseQuote(object.quote, "A2A response data");
    if (direct) return direct;
  }

  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const found = findQuoteInValue(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function extractQuote(payload: unknown): AuditionQuote | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const value = result as Record<string, unknown>;

  const metadata = value.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const direct = parseQuote((metadata as Record<string, unknown>).quote, "A2A response metadata");
    if (direct) return direct;
  }

  return findQuoteInValue(value);
}

function findApplicationError(value: unknown, depth = 0): string | null {
  if (depth > 5 || !value || typeof value !== "object") return null;
  if (!Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    if (typeof object.error === "string" && object.error.trim()) return object.error.trim();
  }
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const found = findApplicationError(child, depth + 1);
    if (found) return found;
  }
  return null;
}

const SERVICE_CATEGORIES: Record<AuditionTask["category"], string[]> = {
  "Health Factor Monitoring": ["health-factor-monitoring", "health factor", "liquidation"],
  "Yield Optimisation": ["yield-optimization", "yield-optimisation", "yield optimization", "yield optimisation"],
  "Grid Trading": ["grid-trading", "grid trading", "grid_plan"],
  Rebalancing: ["rebalancing", "rebalance", "rebalance_plan"],
};

function parseDisplayQuote(display: unknown): AuditionQuote | null {
  if (typeof display !== "string" || !display.trim()) return null;
  const match = display.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s+(.+)$/);
  if (!match) return null;
  return { amount: match[1], asset: match[2].trim(), source: "A2A live service offer" };
}

function extractServiceOffer(payload: unknown, task: AuditionTask): ServiceOffer | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const root = result as Record<string, unknown>;
  if (!Array.isArray(root.services)) return null;

  const terms = SERVICE_CATEGORIES[task.category];
  const matchingService = root.services.find((service) => {
    if (!service || typeof service !== "object" || Array.isArray(service)) return false;
    const entry = service as Record<string, unknown>;
    const haystack = `${String(entry.id ?? "")} ${String(entry.name ?? "")} ${String(entry.category ?? "")} ${String(entry.deliverables ?? "")}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
  if (!matchingService || typeof matchingService !== "object" || Array.isArray(matchingService)) return null;

  const service = matchingService as Record<string, unknown>;
  const name = typeof service.name === "string" && service.name.trim() ? service.name.trim() : "Matched service";
  const deliverables = typeof service.deliverables === "string" ? service.deliverables.trim() : "The agent returned a live matching service offer.";
  const needs = service.needs && typeof service.needs === "object" && !Array.isArray(service.needs)
    ? renderStructuredData(service.needs)
    : null;
  const quote = parseDisplayQuote(service.price_display)
    ?? (typeof service.price === "string" && typeof root.currency === "string"
      ? { amount: service.price, asset: root.currency, source: "A2A live service offer (base units as returned)" }
      : null);

  const output = [
    `Live pre-hire service offer matched to ${task.category}: ${name}.`,
    deliverables,
    needs ? `Inputs the agent says it needs:\n${needs}` : null,
    "This is a live capability/quote response to the audition request, not proof that the paid job has been executed.",
  ].filter((line): line is string => Boolean(line)).join("\n\n");

  return {
    output,
    quote,
    evidenceSummary: `The A2A response exposed a live ${task.category} service offer${quote ? ` priced at ${quote.amount} ${quote.asset}` : ""}.`,
  };
}

async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Response exceeded AgentDesk evidence size limit");
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error("Response exceeded AgentDesk evidence size limit");
  }
  return JSON.parse(text) as unknown;
}

function agentCardCandidates(advertisedEndpoint: URL): URL[] {
  const candidates: URL[] = [advertisedEndpoint];
  const path = advertisedEndpoint.pathname.toLowerCase();
  const alreadyLooksLikeCard = path.includes("agent-card") || /\/card\/?$/.test(path);

  if (!alreadyLooksLikeCard) {
    candidates.push(new URL("/.well-known/agent-card.json", advertisedEndpoint.origin));
  }

  const unique = new Map(candidates.map((candidate) => [candidate.toString(), candidate]));
  return [...unique.values()];
}

async function resolveAgentCard(serviceEndpoint: string): Promise<ResolvedAgentCard> {
  const endpointValidation = await validatePublicHttpsUrl(serviceEndpoint);
  if (!endpointValidation.ok) {
    throw new Error(`Advertised A2A endpoint cannot be used safely: ${endpointValidation.reason}`);
  }

  let lastReason = "No Agent Card candidate responded";
  for (const candidate of agentCardCandidates(endpointValidation.url)) {
    const validation = await validatePublicHttpsUrl(candidate.toString());
    if (!validation.ok) {
      lastReason = validation.reason;
      continue;
    }

    try {
      const response = await fetch(validation.url, {
        method: "GET",
        headers: {
          Accept: "application/json, application/a2a+json",
          "User-Agent": "AgentDesk-Audition/1.0",
        },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        lastReason = `HTTP ${response.status} from ${validation.url.pathname}`;
        continue;
      }

      const payload = await readJsonLimited(response, MAX_CARD_BYTES);
      if (!isAgentCard(payload)) {
        lastReason = `Response at ${validation.url.pathname} was not an A2A Agent Card`;
        continue;
      }

      return { card: payload, sourceUrl: validation.url.toString() };
    } catch (error) {
      if (timeoutError(error)) lastReason = `Timed out resolving ${validation.url.pathname}`;
      else lastReason = `Could not resolve ${validation.url.pathname}`;
    }
  }

  throw new Error(`A2A Agent Card could not be resolved from the advertised A2A service or protocol-standard well-known path: ${lastReason}`);
}

function resolveA2ATarget(card: AgentCard): { target: string; transport: string } | null {
  if (typeof card.url === "string" && card.url.trim()) {
    return {
      target: card.url.trim(),
      transport: typeof card.preferredTransport === "string" && card.preferredTransport.trim()
        ? card.preferredTransport.trim().toUpperCase()
        : "JSONRPC",
    };
  }

  if (Array.isArray(card.supportedInterfaces)) {
    const jsonRpc = card.supportedInterfaces.find((item) =>
      item && typeof item.url === "string" && String(item.protocolBinding ?? "JSONRPC").toUpperCase() === "JSONRPC",
    );
    if (jsonRpc?.url) return { target: jsonRpc.url.trim(), transport: "JSONRPC" };
  }

  return null;
}

async function postJsonRpc(target: URL, body: unknown, timeoutMs: number): Promise<unknown> {
  const response = await fetch(target, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "AgentDesk-Audition/1.0",
    },
    body: JSON.stringify(body),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(Math.max(1_000, timeoutMs)),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`A2A audition returned HTTP ${response.status}`);
  }
  return readJsonLimited(response, MAX_RESPONSE_BYTES);
}

async function pollTask({
  target,
  initialPayload,
  started,
  evidence,
}: {
  target: URL;
  initialPayload: unknown;
  started: number;
  evidence: AuditionEvidence[];
}): Promise<{ payload: unknown; state: string | null }> {
  const id = taskId(initialPayload);
  if (!id) return { payload: initialPayload, state: taskState(initialPayload) };

  let payload = initialPayload;
  let state = taskState(payload);
  let polls = 0;

  while ((state === "submitted" || state === "working") && performance.now() - started < AUDITION_DEADLINE_MS) {
    await new Promise((resolve) => setTimeout(resolve, A2A_POLL_INTERVAL_MS));
    const remaining = AUDITION_DEADLINE_MS - (performance.now() - started);
    if (remaining < 1_000) break;

    const requestBody = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "tasks/get",
      params: { id, historyLength: 6 },
    };

    payload = await postJsonRpc(target, requestBody, remaining);
    polls += 1;
    state = taskState(payload);

    if (payload && typeof payload === "object" && (payload as Record<string, unknown>).error) break;
    if (state && !["submitted", "working"].includes(state)) break;
  }

  if (polls > 0) {
    evidence.push({
      kind: "service-response",
      source: target.toString(),
      observedAt: new Date().toISOString(),
      summary: `AgentDesk followed the A2A task with tasks/get ${polls} time${polls === 1 ? "" : "s"}; latest state: ${state ?? "not reported"}.`,
      raw: payload,
    });
  }

  return { payload, state };
}

export async function auditionA2AService(service: AgentService, task: AuditionTask): Promise<A2AExecution> {
  const checkedAt = new Date().toISOString();
  const evidence: AuditionEvidence[] = [];

  let resolvedCard: ResolvedAgentCard;
  try {
    resolvedCard = await resolveAgentCard(service.endpoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "A2A Agent Card could not be resolved";
    return {
      status: /timed out/i.test(message) ? "timeout" : "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: message,
    };
  }

  const { card } = resolvedCard;
  evidence.push({
    kind: "agent-card",
    source: resolvedCard.sourceUrl,
    observedAt: new Date().toISOString(),
    summary: `Resolved A2A Agent Card${card.protocolVersion ? ` using protocol ${card.protocolVersion}` : ""} from the explicitly advertised A2A service.`,
    raw: card,
  });

  if (hasRequiredSecurity(card)) {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: "This A2A service requires authentication that AgentDesk has not been granted.",
    };
  }

  const target = resolveA2ATarget(card);
  if (!target) {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: "The A2A Agent Card does not expose a JSON-RPC interaction interface AgentDesk can audition.",
    };
  }
  if (target.transport !== "JSONRPC") {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: `A2A transport ${target.transport} is not supported by the current audition adapter.`,
    };
  }

  const targetValidation = await validatePublicHttpsUrl(target.target);
  if (!targetValidation.ok) {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: `A2A interaction URL cannot be used safely: ${targetValidation.reason}`,
    };
  }

  const requestId = randomUUID();
  const messageId = randomUUID();
  const requestBody = {
    jsonrpc: "2.0",
    id: requestId,
    method: "message/send",
    params: {
      message: {
        role: "user",
        parts: [{ kind: "text", text: buildAuditionPrompt(task) }],
        messageId,
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain", "application/json"],
        historyLength: 0,
      },
      metadata: {
        purpose: "AgentDesk read-only pre-hire audition",
        chainId: 56,
      },
    },
  };

  const started = performance.now();
  let payload: unknown;
  let latencyMs: number;
  try {
    payload = await postJsonRpc(targetValidation.url, requestBody, AUDITION_DEADLINE_MS);
    latencyMs = Math.round(performance.now() - started);
  } catch (error) {
    latencyMs = Math.round(performance.now() - started);
    const message = error instanceof Error ? error.message : "A2A audition request failed";
    return {
      status: timeoutError(error) || /timed out/i.test(message) ? "timeout" : "error",
      latencyMs,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: timeoutError(error) ? "A2A audition timed out after 12 seconds" : message,
    };
  }

  evidence.push({
    kind: "service-response",
    source: targetValidation.url.toString(),
    observedAt: new Date().toISOString(),
    summary: `A2A service responded in ${latencyMs} ms.`,
    raw: payload,
  });

  if (payload && typeof payload === "object" && (payload as Record<string, unknown>).error) {
    return {
      status: "error",
      latencyMs,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: "A2A service returned a JSON-RPC error. See raw evidence for details.",
    };
  }

  let state = taskState(payload);
  if (state === "submitted" || state === "working") {
    try {
      const polled = await pollTask({ target: targetValidation.url, initialPayload: payload, started, evidence });
      payload = polled.payload;
      state = polled.state;
      latencyMs = Math.round(performance.now() - started);
    } catch (error) {
      latencyMs = Math.round(performance.now() - started);
      const message = error instanceof Error ? error.message : "A2A task polling failed";
      return {
        status: timeoutError(error) ? "timeout" : "error",
        latencyMs,
        checkedAt,
        output: null,
        quote: null,
        evidence,
        error: message,
      };
    }
  }

  if (payload && typeof payload === "object" && (payload as Record<string, unknown>).error) {
    return {
      status: "error",
      latencyMs,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: "A2A service returned a JSON-RPC error while AgentDesk checked the task state. See raw evidence for details.",
    };
  }

  const applicationError = findApplicationError(payload);
  if (applicationError) {
    return {
      status: "error",
      latencyMs,
      checkedAt,
      output: extractOutput(payload),
      quote: extractQuote(payload),
      evidence,
      error: `A2A application error: ${applicationError}`,
    };
  }

  if (state === "input-required") {
    return {
      status: "unsupported",
      latencyMs,
      checkedAt,
      output: extractOutput(payload),
      quote: extractQuote(payload),
      evidence,
      error: "The agent needs additional user input before it can finish this audition.",
    };
  }

  if (state === "submitted" || state === "working") {
    return {
      status: "timeout",
      latencyMs,
      checkedAt,
      output: extractOutput(payload),
      quote: extractQuote(payload),
      evidence,
      error: "The agent was still working when the AgentDesk audition window ended.",
    };
  }

  if (state === "failed" || state === "rejected" || state === "canceled" || state === "cancelled") {
    return {
      status: "error",
      latencyMs,
      checkedAt,
      output: extractOutput(payload),
      quote: extractQuote(payload),
      evidence,
      error: `The agent ended the A2A task with state '${state}'.`,
    };
  }

  const serviceOffer = extractServiceOffer(payload, task);
  if (serviceOffer) {
    evidence[evidence.length - 1] = {
      ...evidence[evidence.length - 1],
      summary: `${evidence[evidence.length - 1].summary} ${serviceOffer.evidenceSummary}`,
    };
    return {
      status: "completed",
      latencyMs,
      checkedAt,
      output: serviceOffer.output,
      quote: serviceOffer.quote,
      evidence,
    };
  }

  const output = extractOutput(payload);
  if (!output) {
    return {
      status: "error",
      latencyMs,
      checkedAt,
      output: null,
      quote: extractQuote(payload),
      evidence,
      error: "A2A service responded but did not return a usable text, structured-data, or matching live service-offer result.",
    };
  }

  return {
    status: "completed",
    latencyMs,
    checkedAt,
    output,
    quote: extractQuote(payload),
    evidence,
  };
}
