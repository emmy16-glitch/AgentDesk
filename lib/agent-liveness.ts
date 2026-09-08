import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { AgentService, OnChainAgentIdentity } from "@/lib/erc8004-registry";

export type ProbeState = "reachable" | "unreachable" | "blocked" | "unsupported";

export interface ServiceProbe {
  name: string;
  endpoint: string;
  state: ProbeState;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: string;
  reason: string;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

async function validatePublicHttpsEndpoint(endpoint: string): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  if (endpoint.length > 2048) return { ok: false, reason: "Endpoint URL is too long" };

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, reason: "Endpoint is not a valid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only public HTTPS endpoints are probed" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Credential-bearing URLs are not probed" };
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { ok: false, reason: "Local/private hostnames are blocked" };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      return { ok: false, reason: "Endpoint resolves to a private/reserved address" };
    }
  } catch {
    return { ok: false, reason: "Endpoint hostname could not be resolved" };
  }

  return { ok: true, url };
}

export async function probeService(service: AgentService): Promise<ServiceProbe> {
  const checkedAt = new Date().toISOString();
  const validation = await validatePublicHttpsEndpoint(service.endpoint);
  if (!validation.ok) {
    return {
      name: service.name,
      endpoint: service.endpoint,
      state: validation.reason.startsWith("Only public HTTPS") ? "unsupported" : "blocked",
      httpStatus: null,
      latencyMs: null,
      checkedAt,
      reason: validation.reason,
    };
  }

  const started = performance.now();
  try {
    const response = await fetch(validation.url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/html;q=0.8, */*;q=0.5",
        "User-Agent": "AgentDesk-Availability-Probe/1.0",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const latencyMs = Math.round(performance.now() - started);
    await response.body?.cancel().catch(() => undefined);

    const reachable =
      (response.status >= 200 && response.status < 400) ||
      [401, 403, 405, 429].includes(response.status);

    return {
      name: service.name,
      endpoint: service.endpoint,
      state: reachable ? "reachable" : "unreachable",
      httpStatus: response.status,
      latencyMs,
      checkedAt,
      reason: reachable
        ? "The advertised HTTP service responded. This proves reachability only, not task quality or correctness."
        : `The advertised path responded with HTTP ${response.status}.`,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const reason = error instanceof Error && error.name === "TimeoutError"
      ? "Probe timed out after 4 seconds"
      : "Endpoint could not be reached";
    return {
      name: service.name,
      endpoint: service.endpoint,
      state: "unreachable",
      httpStatus: null,
      latencyMs,
      checkedAt,
      reason,
    };
  }
}

export async function probeAgentServices(identity: OnChainAgentIdentity): Promise<ServiceProbe[]> {
  return Promise.all(identity.services.slice(0, 6).map(probeService));
}
