import { randomUUID } from "node:crypto";
import type { AgentService } from "@/lib/erc8004-registry";
import { validatePublicHttpsUrl } from "@/lib/network-safety";
import { buildAuditionPrompt } from "@/lib/auditions/task-prompt";
import type { AuditionEvidence, AuditionQuote, AuditionStatus, AuditionTask } from "@/lib/auditions/types";

const MAX_CARD_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 512 * 1024;

interface AgentCard {
  protocolVersion?: string;
  name?: string;
  description?: string;
  url?: string;
  preferredTransport?: string;
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

function timeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function hasRequiredSecurity(card: AgentCard): boolean {
  return Array.isArray(card.security) && card.security.length > 0;
}

function textFromParts(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const value = part as Record<string, unknown>;
    return value.kind === "text" && typeof value.text === "string" && value.text.trim()
      ? [value.text.trim()]
      : [];
  });
}

function extractOutput(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as Record<string, unknown>;
  const result = envelope.result;
  if (!result || typeof result !== "object") return null;
  const value = result as Record<string, unknown>;

  const direct = textFromParts(value.parts);
  if (direct.length) return direct.join("\n\n");

  const status = value.status;
  if (status && typeof status === "object") {
    const statusMessage = (status as Record<string, unknown>).message;
    if (statusMessage && typeof statusMessage === "object") {
      const statusText = textFromParts((statusMessage as Record<string, unknown>).parts);
      if (statusText.length) return statusText.join("\n\n");
    }
  }

  if (Array.isArray(value.artifacts)) {
    const artifactText = value.artifacts.flatMap((artifact) => {
      if (!artifact || typeof artifact !== "object") return [];
      return textFromParts((artifact as Record<string, unknown>).parts);
    });
    if (artifactText.length) return artifactText.join("\n\n");
  }

  return null;
}

function taskState(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object") return null;
  const status = (result as Record<string, unknown>).status;
  if (!status || typeof status !== "object") return null;
  const state = (status as Record<string, unknown>).state;
  return typeof state === "string" ? state : null;
}

function extractQuote(payload: unknown): AuditionQuote | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== "object") return null;
  const metadata = (result as Record<string, unknown>).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const quote = (metadata as Record<string, unknown>).quote;
  if (!quote || typeof quote !== "object") return null;

  const raw = quote as Record<string, unknown>;
  const amount = typeof raw.amount === "string" ? raw.amount.trim() : "";
  const asset = typeof raw.asset === "string" ? raw.asset.trim() : "";
  if (!amount || !asset) return null;

  const expiresAt = typeof raw.expiresAt === "string" && raw.expiresAt.trim() ? raw.expiresAt.trim() : undefined;
  return {
    amount,
    asset,
    ...(expiresAt ? { expiresAt } : {}),
    source: "A2A response metadata",
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

export async function auditionA2AService(service: AgentService, task: AuditionTask): Promise<A2AExecution> {
  const checkedAt = new Date().toISOString();
  const evidence: AuditionEvidence[] = [];

  const cardValidation = await validatePublicHttpsUrl(service.endpoint);
  if (!cardValidation.ok) {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: `Advertised A2A card URL cannot be used safely: ${cardValidation.reason}`,
    };
  }

  let card: AgentCard;
  try {
    const cardResponse = await fetch(cardValidation.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "AgentDesk-Audition/1.0",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!cardResponse.ok) {
      return {
        status: "error",
        latencyMs: null,
        checkedAt,
        output: null,
        quote: null,
        evidence,
        error: `A2A Agent Card returned HTTP ${cardResponse.status}`,
      };
    }
    card = await readJsonLimited(cardResponse, MAX_CARD_BYTES) as AgentCard;
  } catch (error) {
    return {
      status: timeoutError(error) ? "timeout" : "error",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: timeoutError(error) ? "A2A Agent Card lookup timed out" : "A2A Agent Card could not be resolved",
    };
  }

  evidence.push({
    kind: "agent-card",
    source: cardValidation.url.toString(),
    observedAt: new Date().toISOString(),
    summary: `Resolved A2A Agent Card${card.protocolVersion ? ` using protocol ${card.protocolVersion}` : ""}.`,
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

  const transport = typeof card.preferredTransport === "string" ? card.preferredTransport.trim().toUpperCase() : "JSONRPC";
  if (transport && transport !== "JSONRPC") {
    return {
      status: "unsupported",
      latencyMs: null,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: `A2A transport ${transport} is not supported by the current audition adapter.`,
    };
  }

  const target = typeof card.url === "string" ? card.url.trim() : "";
  const targetValidation = await validatePublicHttpsUrl(target);
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
    const response = await fetch(targetValidation.url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "AgentDesk-Audition/1.0",
      },
      body: JSON.stringify(requestBody),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    latencyMs = Math.round(performance.now() - started);
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return {
        status: "error",
        latencyMs,
        checkedAt,
        output: null,
        quote: null,
        evidence,
        error: `A2A audition returned HTTP ${response.status}`,
      };
    }
    payload = await readJsonLimited(response, MAX_RESPONSE_BYTES);
  } catch (error) {
    latencyMs = Math.round(performance.now() - started);
    return {
      status: timeoutError(error) ? "timeout" : "error",
      latencyMs,
      checkedAt,
      output: null,
      quote: null,
      evidence,
      error: timeoutError(error) ? "A2A audition timed out after 12 seconds" : "A2A audition request failed",
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

  const state = taskState(payload);
  if (state === "input-required" || state === "submitted" || state === "working") {
    return {
      status: "unsupported",
      latencyMs,
      checkedAt,
      output: extractOutput(payload),
      quote: extractQuote(payload),
      evidence,
      error: `The agent returned task state '${state}', which requires a multi-turn or asynchronous audition flow not yet supported.`,
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
      error: "A2A service responded but did not return a usable text result.",
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
