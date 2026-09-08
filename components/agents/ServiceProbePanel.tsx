"use client";

import { useState } from "react";
import { Activity, CheckCircle2, LoaderCircle, ShieldAlert, XCircle } from "lucide-react";
import type { ServiceProbe } from "@/lib/agent-liveness";

interface ProbeResponse {
  ok: boolean;
  checkedAt?: string;
  servicesAdvertised?: number;
  servicesProbed?: number;
  reachable?: number;
  operationalStatus?: string;
  probes?: ServiceProbe[];
  scope?: string;
  error?: string;
}

export default function ServiceProbePanel({ tokenId, serviceCount }: { tokenId: number; serviceCount: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResponse | null>(null);

  async function checkAvailability() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${tokenId}/probe`, { cache: "no-store" });
      const body = (await response.json()) as ProbeResponse;
      setResult(body);
    } catch {
      setResult({ ok: false, error: "Availability check failed" });
    } finally {
      setLoading(false);
    }
  }

  return <section className="detail-section">
    <h2><Activity size={18} /> Availability check</h2>
    <p className="detail-description">{serviceCount} service endpoint{serviceCount === 1 ? "" : "s"} advertised. Registry presence alone is not treated as liveness.</p>
    <button type="button" className="gold-button" onClick={checkAvailability} disabled={loading || serviceCount === 0}>
      {loading ? <><LoaderCircle className="spin" size={17} /> Checking endpoints…</> : "Check endpoint reachability"}
    </button>

    {result && !result.ok ? <p className="ai-error" role="alert">{result.error || "Availability check failed"}</p> : null}

    {result?.ok ? <div style={{ marginTop: 16 }}>
      <p className="detail-description"><strong>{result.operationalStatus}</strong> · {result.reachable ?? 0}/{result.servicesProbed ?? 0} probed endpoints responded.</p>
      <ul className="detail-capabilities">
        {(result.probes ?? []).map((probe) => <li key={`${probe.name}:${probe.endpoint}`}>
          {probe.state === "reachable" ? <CheckCircle2 size={16} /> : probe.state === "unreachable" ? <XCircle size={16} /> : <ShieldAlert size={16} />}
          <span><strong>{probe.name}</strong> — {probe.state}{probe.httpStatus ? ` · HTTP ${probe.httpStatus}` : ""}{probe.latencyMs !== null ? ` · ${probe.latencyMs}ms` : ""}</span>
        </li>)}
      </ul>
      <p className="detail-description"><small>{result.scope}</small></p>
    </div> : null}
  </section>;
}
