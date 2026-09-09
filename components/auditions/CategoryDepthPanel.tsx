"use client";

import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FlaskConical,
  Loader2,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
} from "lucide-react";
import type { ComparedAudition } from "@/lib/auditions/compare";
import type { IndependentVerification } from "@/lib/auditions/verification-types";
import type { BrainAnalysis } from "@/lib/brain/types";

interface BrainResponse {
  ok: boolean;
  error?: string;
  verification?: IndependentVerification;
  analysis?: BrainAnalysis;
  brain?: {
    camberConfigured: boolean;
    camberAttempted: boolean;
    proofBoundary: string;
  };
}

function sourceLink(source: string): string | null {
  const address = source.match(/0x[a-fA-F0-9]{40}/)?.[0];
  return address ? `https://bscscan.com/address/${address}` : null;
}

function categoryIntro(category: ComparedAudition["task"]["category"]): string {
  if (category === "Health Factor Monitoring") return "Read-only wallet + Venus risk evidence. No approvals, borrowing or repayments.";
  if (category === "Yield Optimisation") return "Scenario capital only. Pool and token context can be checked without depositing funds.";
  if (category === "Grid Trading") return "Scenario capital only. Market/range logic is checked without placing an order.";
  return "Portfolio/scenario math only. No rebalance transaction is executed.";
}

function decisionClass(decision: BrainAnalysis["decision"]): string {
  return `brain-${decision.toLowerCase().replaceAll(" ", "-")}`;
}

export default function CategoryDepthPanel({ result }: { result: ComparedAudition }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<BrainResponse | null>(null);

  async function analyse() {
    if (!result.output) return;
    setChecking(true);
    setError(null);
    try {
      const request = await fetch("/api/brain/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: result.candidate.tokenId,
          task: result.task,
          output: result.output,
        }),
      });
      const body = await request.json() as BrainResponse;
      if (!request.ok || !body.ok || !body.verification || !body.analysis) {
        throw new Error(body.error || "Category-depth analysis failed");
      }
      setResponse(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category-depth analysis failed");
    } finally {
      setChecking(false);
    }
  }

  const verification = response?.verification;
  const analysis = response?.analysis;

  return <section className="category-depth" aria-label={`${result.task.category} depth analysis`}>
    <div className="category-depth-topline">
      <div className="category-depth-title">
        <FlaskConical size={15} />
        <span><strong>{result.task.category} depth</strong><small>{categoryIntro(result.task.category)}</small></span>
      </div>
      {!verification ? <button type="button" className="category-depth-run" onClick={analyse} disabled={checking || !result.output}>
        {checking ? <><Loader2 size={13} className="spin" /> Analysing…</> : <><BrainCircuit size={14} /> Run depth checks + Brain</>}
      </button> : null}
    </div>

    {!verification ? <div className="category-depth-preflight">
      <SearchCheck size={15} />
      <span>AgentDesk will independently reproduce supported BNB facts, test machine-readable claims, then ask the Brain to explain only that evidence.</span>
    </div> : null}

    {verification ? <>
      <div className={`category-depth-verdict depth-${verification.depth.verdict.toLowerCase().replaceAll(" ", "-")}`}>
        {verification.depth.conflictCount ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}
        <div>
          <strong>{verification.depth.verdict}</strong>
          <small>{verification.depth.scenarioLabel}</small>
        </div>
      </div>

      <div className="category-depth-stats" aria-label="Depth evidence counts">
        <div><strong>{verification.depth.verifiedCount}</strong><span>verified</span></div>
        <div><strong>{verification.depth.conflictCount}</strong><span>conflicts</span></div>
        <div><strong>{verification.depth.unresolvedCount}</strong><span>unresolved</span></div>
        <div><strong>{verification.depth.machineReadableClaims ? "YES" : "NO"}</strong><span>machine-readable</span></div>
      </div>

      <div className="category-depth-checks">
        {verification.checks.map((check) => {
          const href = sourceLink(check.source);
          return <article className={`category-depth-check check-${check.status}`} key={check.id}>
            <div className="category-depth-check-head">
              <strong>{check.label}</strong>
              <span>{check.status}</span>
            </div>
            <p>{check.summary}</p>
            <small>{href ? <a href={href} target="_blank" rel="noreferrer">{check.source} <ExternalLink size={10} /></a> : check.source}</small>
          </article>;
        })}
      </div>

      <div className="category-depth-boundary"><ShieldAlert size={14} /><span>{verification.boundary}</span></div>
    </> : null}

    {analysis ? <section className={`brain-analysis ${decisionClass(analysis.decision)}`} aria-label="AgentDesk Brain analysis">
      <div className="brain-analysis-heading">
        <div><BrainCircuit size={17} /><span><strong>{analysis.providerLabel}</strong><small>{analysis.decision}</small></span></div>
        <span className="brain-proof-label">EXPLAINS PROOF · DOES NOT CREATE IT</span>
      </div>
      <h5>{analysis.headline}</h5>
      <p className="brain-summary">{analysis.summary}</p>

      <div className="brain-columns">
        <BrainList title="Verified facts" items={analysis.verifiedFacts} empty="No independently reproduced facts yet." />
        <BrainList title="Unresolved claims" items={analysis.unresolvedClaims} empty="No unresolved claim was surfaced in this run." />
        {analysis.conflicts.length ? <BrainList title="Conflicts" items={analysis.conflicts} empty="" danger /> : null}
        <BrainList title="Watchouts" items={analysis.watchouts} empty="No additional category watchout was generated." />
      </div>

      {analysis.nextQuestion ? <div className="brain-next-question"><strong>Best next question for this agent</strong><p>{analysis.nextQuestion}</p></div> : null}
      {analysis.fallbackReason ? <div className="brain-fallback"><CircleAlert size={13} /><span>Camber Brain was unavailable for this run, so the deterministic evidence engine was used: {analysis.fallbackReason}</span></div> : null}
      <p className="brain-boundary">{analysis.boundary}</p>
      {response?.brain?.proofBoundary ? <p className="brain-boundary system">{response.brain.proofBoundary}</p> : null}
    </section> : null}

    {verification ? <button type="button" className="category-depth-refresh" onClick={analyse} disabled={checking}>
      <RefreshCw size={12} className={checking ? "spin" : ""} /> {checking ? "Refreshing…" : "Refresh live depth checks"}
    </button> : null}

    {error ? <div className="hire-error" role="alert">{error}</div> : null}
  </section>;
}

function BrainList({ title, items, empty, danger = false }: { title: string; items: string[]; empty: string; danger?: boolean }) {
  return <div className={danger ? "brain-list danger" : "brain-list"}>
    <strong>{title}</strong>
    {items.length ? <ul>{items.map((entry, index) => <li key={`${title}-${index}`}>{entry}</li>)}</ul> : <p>{empty}</p>}
  </div>;
}
