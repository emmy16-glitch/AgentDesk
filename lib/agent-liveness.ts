import type { AgentService, OnChainAgentIdentity } from "@/lib/erc8004-registry";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

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

export async function probeService(service: AgentService): Promise<ServiceProbe> {
  const checkedAt = new Date().toISOString();
  const validation = await validatePublicHttpsUrl(service.endpoint);
  if (!validation.ok) {
    const unsupported =
      validation.reason.startsWith("Only public HTTPS") ||
      /unresolved url template|template parameters are unsupported/i.test(validation.reason);
    return {
      name: service.name,
      endpoint: service.endpoint,
      state: unsupported ? "unsupported" : "blocked",
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
        Accept: "application/json, application/a2a+json, text/html;q=0.7, */*;q=0.4",
        "User-Agent": "AgentDesk-Availability-Probe/1.0",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(4_500),
    });
    const latencyMs = Math.round(performance.now() - started);
    await response.body?.cancel().catch(() => undefined);

    // The purpose of this probe is host reachability, not correctness. A2A RPC
    // paths are commonly POST-only and can answer GET with 404/405/5xx while the
    // host itself is live. Any HTTP response proves the host answered. The real
    // audition is responsible for deciding whether the Agent Card / JSON-RPC
    // task flow actually works.
    const reachable = response.status >= 100 && response.status <= 599;

    return {
      name: service.name,
      endpoint: service.endpoint,
      state: reachable ? "reachable" : "unreachable",
      httpStatus: response.status,
      latencyMs,
      checkedAt,
      reason: reachable
        ? response.ok
          ? "The advertised HTTP service responded. This proves reachability only, not task quality or correctness."
          : `The advertised host responded with HTTP ${response.status}. Host reachability is confirmed; task compatibility still requires a live audition.`
        : `The advertised path returned an invalid HTTP status (${response.status}).`,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const reason = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "Probe timed out after 4.5 seconds"
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
