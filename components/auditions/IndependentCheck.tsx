"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, SearchCheck, ShieldAlert } from "lucide-react";
import type { ComparedAudition } from "@/lib/auditions/compare";
import type { IndependentVerification } from "@/lib/auditions/verification-types";

interface VerifyResponse {
  ok: boolean;
  error?: string;
  verification?: IndependentVerification;
}

function sourceLink(source: string): string | null {
  const address = source.match(/0x[a-fA-F0-9]{40}/)?.[0];
  return address ? `https://bscscan.com/address/${address}` : null;
}

export default function IndependentCheck({ result }: { result: ComparedAudition }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<IndependentVerification | null>(null);

  async function verify() {
    if (!result.output) return;
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/auditions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: result.candidate.tokenId,
          task: result.task,
          output: result.output,
        }),
      });
      const body = await response.json() as VerifyResponse;
      if (!response.ok || !body.ok || !body.verification) throw new Error(body.error || "Independent verification failed");
      setVerification(body.verification);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Independent verification failed");
    } finally {
      setChecking(false);
    }
  }

  return <section className="independent-check" aria-label="Independent BNB evidence checks">
    <div className="independent-check-heading">
      <div><SearchCheck size={15} /><span><strong>Independent BNB checks</strong><small>Reproduce what can actually be checked against live chain/protocol state.</small></span></div>
      {!verification ? <button type="button" className="verify-action" onClick={verify} disabled={checking || !result.output}>
        {checking ? <><Loader2 size={13} className="spin" /> Checking…</> : <>Verify against BNB state</>}
      </button> : null}
    </div>

    {verification ? <>
      <div className={`verification-summary verification-${verification.status.toLowerCase().replaceAll(" ", "-")}`}>
        {verification.status === "VERIFIED CONTEXT" ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
        <span><strong>{verification.status}</strong><small>{verification.blockNumber ? `BNB block ${verification.blockNumber}` : "block unavailable"}{verification.blockTimestamp ? ` · ${new Date(verification.blockTimestamp).toLocaleTimeString()}` : ""}</small></span>
      </div>
      <div className="verification-checks">
        {verification.checks.map((check) => {
          const href = sourceLink(check.source);
          return <div className={`verification-check check-${check.status}`} key={check.id}>
            <div><strong>{check.label}</strong><span>{check.status}</span></div>
            <p>{check.summary}</p>
            <small>{href ? <a href={href} target="_blank" rel="noreferrer">{check.source} <ExternalLink size={10} /></a> : check.source}</small>
          </div>;
        })}
      </div>
      <p className="verification-boundary">{verification.boundary}</p>
      <button type="button" className="verify-refresh" onClick={verify} disabled={checking}>{checking ? "Refreshing…" : "Refresh independent checks"}</button>
    </> : null}

    {error ? <div className="hire-error" role="alert">{error}</div> : null}
  </section>;
}
