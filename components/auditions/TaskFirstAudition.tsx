"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, ExternalLink, Eye, EyeOff, FlaskConical, Loader2, ShieldAlert, Trophy } from "lucide-react";
import ERC8183HireFlow from "@/components/hiring/ERC8183HireFlow";
import type { DiscoveredAgent, MarketplaceCategory } from "@/lib/8004scan";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import { compareAuditions, type ComparedAudition } from "@/lib/auditions/compare";

const CATEGORIES: MarketplaceCategory[] = [
  "Health Factor Monitoring",
  "Yield Optimisation",
  "Grid Trading",
  "Rebalancing",
];

const RANKING_METHOD = [
  "audition completion status",
  "usable task-specific output",
  "machine-readable quote availability",
  "preserved evidence count",
  "measured latency",
];

interface BatchResponse {
  ok: boolean;
  error?: string;
  checkedAt?: string;
  results?: ComparedAudition[];
  failures?: Array<{ tokenId: number; error: string }>;
  rankingMethod?: string[];
}

interface SingleResponse {
  ok: boolean;
  error?: string;
  result?: AuditionResult;
}

type RaceStatus = AuditionResult["status"] | "running" | "request-error";
interface RaceEntry {
  tokenId: number;
  startedAt: number;
  finishedAt?: number;
  status: RaceStatus;
  latencyMs?: number | null;
  error?: string;
}

interface Props {
  agents: DiscoveredAgent[];
  discoveryLoading: boolean;
  discoveryError: string | null;
}

export default function TaskFirstAudition({ agents, discoveryLoading, discoveryError }: Props) {
  const [category, setCategory] = useState<MarketplaceCategory>("Yield Optimisation");
  const [selected, setSelected] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [race, setRace] = useState<RaceEntry[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [response, setResponse] = useState<BatchResponse | null>(null);

  const [healthWallet, setHealthWallet] = useState("");
  const [healthProtocol, setHealthProtocol] = useState("Venus");
  const [healthGoal, setHealthGoal] = useState("Check liquidation risk and explain what should be monitored.");
  const [yieldAsset, setYieldAsset] = useState("USDC");
  const [yieldAmount, setYieldAmount] = useState("500");
  const [yieldRisk, setYieldRisk] = useState("moderate");
  const [gridPair, setGridPair] = useState("WBNB/USDT");
  const [gridCapital, setGridCapital] = useState("500 USDT");
  const [gridRange, setGridRange] = useState("");
  const [gridRisk, setGridRisk] = useState("moderate");
  const [portfolio, setPortfolio] = useState("BNB/USDT PancakeSwap V3 position");
  const [objective, setObjective] = useState("Reduce out-of-range risk while limiting unnecessary turnover.");
  const [instructions, setInstructions] = useState("");

  const candidates = useMemo(
    () => agents.filter((agent) => agent.categories.includes(category)).slice(0, 8),
    [agents, category],
  );

  useEffect(() => {
    setSelected(candidates.slice(0, 3).map((agent) => agent.tokenId));
    setResponse(null);
    setRace([]);
    setRunError(null);
  }, [category, candidates]);

  const names = useMemo(
    () => new Map(agents.map((agent) => [agent.tokenId, agent.name])),
    [agents],
  );

  function toggleCandidate(tokenId: number) {
    setSelected((current) => {
      if (current.includes(tokenId)) return current.filter((id) => id !== tokenId);
      if (current.length >= 4) return current;
      return [...current, tokenId];
    });
  }

  function buildTask(): AuditionTask | null {
    const extra = instructions.trim() ? { instructions: instructions.trim() } : {};

    if (category === "Health Factor Monitoring") {
      if (!healthWallet.trim()) return null;
      return {
        category,
        wallet: healthWallet.trim(),
        protocol: healthProtocol.trim() || undefined,
        goal: healthGoal.trim() || undefined,
        ...extra,
      };
    }
    if (category === "Yield Optimisation") {
      if (!yieldAsset.trim() || !yieldAmount.trim()) return null;
      return {
        category,
        asset: yieldAsset.trim(),
        amount: yieldAmount.trim(),
        riskPreference: yieldRisk.trim() || undefined,
        ...extra,
      };
    }
    if (category === "Grid Trading") {
      if (!gridPair.trim() || !gridCapital.trim()) return null;
      return {
        category,
        pair: gridPair.trim(),
        capital: gridCapital.trim(),
        priceRange: gridRange.trim() || undefined,
        riskPreference: gridRisk.trim() || undefined,
        ...extra,
      };
    }
    if (!portfolio.trim() || !objective.trim()) return null;
    return {
      category,
      portfolio: portfolio.trim(),
      objective: objective.trim(),
      ...extra,
    };
  }

  async function runAuditions(event: React.FormEvent) {
    event.preventDefault();
    const task = buildTask();
    if (!task) {
      setRunError("Complete the required task fields before auditioning agents.");
      return;
    }
    if (selected.length === 0) {
      setRunError("Choose at least one source-qualified ERC-8004 candidate.");
      return;
    }

    setRunning(true);
    setRunError(null);
    setResponse(null);
    const startedAt = Date.now();
    setRace(selected.map((tokenId) => ({ tokenId, startedAt, status: "running" })));

    try {
      const outcomes = await Promise.all(selected.map(async (tokenId) => {
        try {
          const request = await fetch("/api/auditions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId, task }),
          });
          const body = await request.json() as SingleResponse;
          if (!request.ok || !body.ok || !body.result) throw new Error(body.error || "Live audition request failed");
          const result = body.result;
          setRace((current) => current.map((entry) => entry.tokenId === tokenId ? {
            ...entry,
            finishedAt: Date.now(),
            status: result.status,
            latencyMs: result.latencyMs,
            error: result.error ?? undefined,
          } : entry));
          return { tokenId, result, error: null as string | null };
        } catch (cause) {
          const error = cause instanceof Error ? cause.message : "Live audition request failed";
          setRace((current) => current.map((entry) => entry.tokenId === tokenId ? {
            ...entry,
            finishedAt: Date.now(),
            status: "request-error",
            error,
          } : entry));
          return { tokenId, result: null as AuditionResult | null, error };
        }
      }));

      const actualResults = outcomes.flatMap((item) => item.result ? [item.result] : []);
      const failures = outcomes.flatMap((item) => item.error ? [{ tokenId: item.tokenId, error: item.error }] : []);
      setResponse({
        ok: true,
        checkedAt: new Date().toISOString(),
        results: compareAuditions(actualResults),
        failures,
        rankingMethod: RANKING_METHOD,
      });
      if (!actualResults.length) setRunError("No candidate produced a comparable live audition result.");
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Live auditions failed");
    } finally {
      setRunning(false);
    }
  }

  return <section className="audition-workbench" id="audition" aria-labelledby="audition-heading">
    <div className="audition-kicker"><FlaskConical size={16} /> LIVE AGENT AUDITIONS</div>
    <div className="audition-heading-row">
      <div>
        <h2 id="audition-heading">What do you want an agent to do?</h2>
        <p>Describe one task. AgentDesk asks multiple real BNB agents to prove what they can do before you choose one.</p>
      </div>
      <div className="evidence-boundary"><ShieldAlert size={17} /><span>Read-only pre-hire checks. No trades or approvals are executed here.</span></div>
    </div>

    <div className="task-category-tabs" aria-label="Task family">
      {CATEGORIES.map((item) => <button
        key={item}
        type="button"
        className={category === item ? "active" : ""}
        aria-pressed={category === item}
        onClick={() => setCategory(item)}
      >{item}</button>)}
    </div>

    <form className="audition-form" onSubmit={runAuditions}>
      <div className="task-fields">
        {category === "Health Factor Monitoring" ? <>
          <Field label="Wallet / account" required value={healthWallet} onChange={setHealthWallet} placeholder="0x…" />
          <Field label="Protocol" value={healthProtocol} onChange={setHealthProtocol} placeholder="Venus" />
          <Field label="Monitoring goal" value={healthGoal} onChange={setHealthGoal} placeholder="Check liquidation risk…" wide />
        </> : null}

        {category === "Yield Optimisation" ? <>
          <Field label="Asset" required value={yieldAsset} onChange={setYieldAsset} placeholder="USDC" />
          <Field label="Amount" required value={yieldAmount} onChange={setYieldAmount} placeholder="500" />
          <Field label="Risk preference" value={yieldRisk} onChange={setYieldRisk} placeholder="moderate" />
        </> : null}

        {category === "Grid Trading" ? <>
          <Field label="Token pair" required value={gridPair} onChange={setGridPair} placeholder="WBNB/USDT" />
          <Field label="Capital" required value={gridCapital} onChange={setGridCapital} placeholder="500 USDT" />
          <Field label="Price range (optional)" value={gridRange} onChange={setGridRange} placeholder="e.g. 520-620" />
          <Field label="Risk preference" value={gridRisk} onChange={setGridRisk} placeholder="moderate" />
        </> : null}

        {category === "Rebalancing" ? <>
          <Field label="Portfolio / position" required value={portfolio} onChange={setPortfolio} placeholder="Describe wallet, LP or holdings" wide />
          <Field label="Objective" required value={objective} onChange={setObjective} placeholder="What should the rebalance achieve?" wide />
        </> : null}

        <Field label="Extra instructions (optional)" value={instructions} onChange={setInstructions} placeholder="Any constraints the candidates should respect" wide />
      </div>

      <div className="candidate-picker">
        <div className="candidate-picker-heading">
          <div><strong>Choose candidates to audition</strong><span>Up to 4 · sourced dynamically from ERC-8004 discovery</span></div>
          <span className="candidate-count">{selected.length}/4 selected</span>
        </div>

        {discoveryLoading ? <div className="audition-empty"><Loader2 className="spin" size={18} /> Discovering source-qualified candidates…</div> : null}
        {discoveryError ? <div className="audition-empty error">Live discovery unavailable: {discoveryError}</div> : null}
        {!discoveryLoading && !discoveryError && candidates.length === 0 ? <div className="audition-empty">No source-qualified candidates currently match this task family. AgentDesk will not invent one.</div> : null}

        <div className="candidate-options">
          {candidates.map((agent) => {
            const checked = selected.includes(agent.tokenId);
            return <button
              type="button"
              key={agent.tokenId}
              className={checked ? "candidate-option selected" : "candidate-option"}
              aria-pressed={checked}
              onClick={() => toggleCandidate(agent.tokenId)}
            >
              <span className="candidate-check">{checked ? <Check size={14} strokeWidth={3} /> : null}</span>
              <span><strong>{agent.name}</strong><small>ERC-8004 #{agent.tokenId} · {agent.protocols.length ? agent.protocols.join(", ") : "service metadata resolved during audition"}</small></span>
            </button>;
          })}
        </div>
      </div>

      {runError ? <div className="audition-run-error" role="alert">{runError}</div> : null}
      <button className="gold-button audition-submit" disabled={running || selected.length === 0 || Boolean(discoveryError)} type="submit">
        {running ? <><Loader2 className="spin" size={17} /> Live audition race running…</> : <><FlaskConical size={17} /> Run live auditions ({selected.length})</>}
      </button>
    </form>

    {race.length ? <RaceBoard race={race} /> : null}
    {response ? <AuditionComparison response={response} names={names} /> : null}
  </section>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  wide?: boolean;
}) {
  return <label className={wide ? "task-field wide" : "task-field"}>
    <span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
  </label>;
}

function RaceBoard({ race }: { race: RaceEntry[] }) {
  const [now, setNow] = useState(Date.now());
  const active = race.some((entry) => entry.status === "running");
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [active]);

  return <section className="audition-race" aria-label="Live audition race">
    <div className="race-heading"><span>LIVE AUDITION RACE</span><strong>{race.filter((entry) => entry.status !== "running").length}/{race.length} finished</strong></div>
    <div className="race-lanes">
      {race.map((entry, index) => {
        const elapsed = (entry.finishedAt ?? now) - entry.startedAt;
        const alias = `Candidate ${String.fromCharCode(65 + index)}`;
        return <div className={`race-lane race-${entry.status}`} key={entry.tokenId}>
          <div><span>{alias}</span><small>identity stays blind during the race</small></div>
          <div className="race-state">
            {entry.status === "running" ? <Loader2 size={12} className="spin" /> : null}
            <b>{entry.status}</b>
            <time>{entry.latencyMs !== undefined && entry.latencyMs !== null ? `${entry.latencyMs} ms service` : `${(elapsed / 1000).toFixed(1)}s elapsed`}</time>
          </div>
          {entry.error ? <p>{entry.error}</p> : null}
        </div>;
      })}
    </div>
  </section>;
}

function AuditionComparison({ response, names }: { response: BatchResponse; names: Map<number, string> }) {
  const [blind, setBlind] = useState(true);
  const results = response.results ?? [];
  const failures = response.failures ?? [];
  return <section className="audition-comparison" id="comparison" aria-labelledby="comparison-heading">
    <div className="comparison-heading">
      <div>
        <span className="comparison-eyebrow">LIVE EVIDENCE COMPARISON</span>
        <h3 id="comparison-heading">Who proved the best fit?</h3>
      </div>
      <div className="comparison-controls">
        <button type="button" className="blind-toggle" onClick={() => setBlind((value) => !value)}>
          {blind ? <><Eye size={14} /> Reveal identities</> : <><EyeOff size={14} /> Blind identities</>}
        </button>
        {response.checkedAt ? <span className="comparison-freshness"><Clock3 size={14} /> checked {new Date(response.checkedAt).toLocaleTimeString()}</span> : null}
      </div>
    </div>

    {blind && results.length ? <p className="blind-note">Blind audition mode is on: judge the evidence first. Identity and the paid-hire button stay hidden until you reveal the candidates.</p> : null}

    {results.length ? <div className="comparison-grid">
      {results.map((result, index) => <ResultCard
        key={result.candidate.tokenId}
        result={result}
        name={names.get(result.candidate.tokenId)}
        blind={blind}
        alias={`Candidate ${String.fromCharCode(65 + index)}`}
      />)}
    </div> : <div className="audition-empty">No candidate produced comparable evidence in this run.</div>}

    {failures.length ? <div className="identity-failures">
      <strong>Identity/runtime failures</strong>
      {failures.map((failure) => <p key={failure.tokenId}>{blind ? "A candidate" : `ERC-8004 #${failure.tokenId}`}: {failure.error}</p>)}
    </div> : null}

    {response.rankingMethod?.length ? <div className="ranking-method">
      <strong>How AgentDesk ranked this run</strong>
      <p>{response.rankingMethod.join(" → ")}. No global trust percentage is used.</p>
    </div> : null}
  </section>;
}

function ResultCard({ result, name, blind, alias }: { result: ComparedAudition; name?: string; blind: boolean; alias: string }) {
  const winner = result.comparison.label === "BEST FIT";
  const actualName = name || `ERC-8004 Agent #${result.candidate.tokenId}`;
  return <article className={winner ? "audition-result winner" : "audition-result"}>
    <header>
      <div>
        <span className={`fit-label fit-${result.comparison.label.toLowerCase().replaceAll(" ", "-")}`}>{winner ? <Trophy size={13} /> : null}{result.comparison.label}</span>
        <h4>{blind ? alias : actualName}</h4>
        {blind
          ? <span className="blind-identity">identity hidden until reveal</span>
          : <a href={result.candidate.sourceUrl} target="_blank" rel="noreferrer">ERC-8004 #{result.candidate.tokenId} <ExternalLink size={12} /></a>}
      </div>
      <span className={`audition-status status-${result.status}`}>{result.status}</span>
    </header>

    <dl className="audition-facts">
      <div><dt>Protocol</dt><dd>{result.protocol ?? "—"}</dd></div>
      <div><dt>Latency</dt><dd>{result.latencyMs === null ? "—" : `${result.latencyMs} ms`}</dd></div>
      <div><dt>Quote</dt><dd>{result.quote ? `${result.quote.amount} ${result.quote.asset}` : "Not returned"}</dd></div>
      <div><dt>Evidence</dt><dd>{result.evidence.length} item{result.evidence.length === 1 ? "" : "s"}</dd></div>
    </dl>

    {result.output ? <div className="audition-output"><strong>Audition result</strong><p>{result.output}</p></div> : <div className="audition-output missing"><strong>No usable result</strong><p>{result.error || "The agent did not return task-specific output."}</p></div>}

    <div className="fit-reasons">
      <strong>Why it ranked here</strong>
      <ul>{result.comparison.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    </div>

    {result.taskFit.missingEvidence.length ? <details className="evidence-details"><summary>Missing evidence ({result.taskFit.missingEvidence.length})</summary><ul>{result.taskFit.missingEvidence.map((reason) => <li key={reason}>{reason}</li>)}</ul></details> : null}
    <details className="evidence-details"><summary>Evidence trail ({result.evidence.length})</summary><ul>{result.evidence.map((item, index) => <li key={`${item.source}-${index}`}><b>{item.kind}</b> — {item.summary}</li>)}</ul></details>

    {!blind && result.status === "completed" ? <ERC8183HireFlow result={result} agentName={actualName} /> : null}
    {blind && result.status === "completed" ? <div className="blind-hire-lock">Reveal identities before opening a paid hire.</div> : null}
  </article>;
}
