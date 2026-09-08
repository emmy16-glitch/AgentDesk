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
