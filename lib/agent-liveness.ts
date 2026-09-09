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

    // A2A interaction paths are often POST-only. Any non-5xx HTTP response proves
    // the public service host answered; the audition layer still decides whether
    // its Agent Card and JSON-RPC flow are actually compatible.
    const reachable = response.status >= 200 && response.status < 500;

    return {
      name: service.name,
      endpoint: service.endpoint,
      state: reachable ? "reachable" : "unreachable",
      httpStatus: response.status,
      latencyMs,
      checkedAt,
      reason: reachable
        ? response.status >= 400
          ? `The advertised host responded with HTTP ${response.status}. Host reachability is confirmed; task compatibility still requires a live audition.`
          : "The advertised HTTP service responded. This proves reachability only, not task quality or correctness."
        : `The advertised path responded with HTTP ${response.status}.`,
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
