"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Grid2X2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import IndependentCheck from "@/components/auditions/IndependentCheck";
import ERC8183HireFlow from "@/components/hiring/ERC8183HireFlow";
import type { DiscoveredAgent, MarketplaceCategory } from "@/lib/8004scan";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import { compareAuditions, type ComparedAudition } from "@/lib/auditions/compare";

const CATEGORIES: Array<{
  id: MarketplaceCategory;
  title: string;
  short: string;
  icon: typeof Activity;
}> = [
  {
    id: "Health Factor Monitoring",
    title: "Health monitor",
    short: "Check lending risk and liquidation exposure.",
    icon: ShieldCheck,
  },
  {
    id: "Yield Optimisation",
    title: "Yield optimiser",
    short: "Compare yield opportunities for an asset.",
    icon: TrendingUp,
  },
  {
    id: "Grid Trading",
    title: "Grid planner",
    short: "Plan a grid range with live market context.",
    icon: Grid2X2,
  },
  {
    id: "Rebalancing",
    title: "Rebalancer",
    short: "Review allocation and rebalance options.",
    icon: RefreshCw,
  },
];

type Stage = "task" | "candidates" | "running" | "results";

type RaceStatus = AuditionResult["status"] | "running" | "request-error";

interface RaceEntry {
  tokenId: number;
  status: RaceStatus;
  latencyMs?: number | null;
  error?: string;
}

interface SingleResponse {
  ok: boolean;
  error?: string;
  result?: AuditionResult;
}

interface Props {
  agents: DiscoveredAgent[];
  discoveryLoading: boolean;
  discoveryError: string | null;
}

export default function CleanTaskFirstAudition({ agents, discoveryLoading, discoveryError }: Props) {
  const [stage, setStage] = useState<Stage>("task");
  const [category, setCategory] = useState<MarketplaceCategory>("Yield Optimisation");
  const [selected, setSelected] = useState<number[]>([]);
  const [race, setRace] = useState<RaceEntry[]>([]);
  const [results, setResults] = useState<ComparedAudition[]>([]);
  const [failures, setFailures] = useState<Array<{ tokenId: number; error: string }>>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showHire, setShowHire] = useState(false);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

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
    () => agents.filter((agent) => agent.categories.includes(category)).slice(0, 6),
    [agents, category],
  );

  const names = useMemo(
    () => new Map(agents.map((agent) => [agent.tokenId, agent.name])),
    [agents],
  );

  useEffect(() => {
    setSelected(candidates.slice(0, 3).map((agent) => agent.tokenId));
  }, [candidates]);

  function resetRun(nextStage: Stage = "task") {
    setStage(nextStage);
    setRace([]);
    setResults([]);
    setFailures([]);
    setRunError(null);
    setRevealed(false);
    setShowVerification(false);
    setShowHire(false);
    setExpandedResult(null);
  }

  function chooseCategory(next: MarketplaceCategory) {
    setCategory(next);
    resetRun("task");
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

  function continueToCandidates(event: React.FormEvent) {
    event.preventDefault();
    if (!buildTask()) {
      setRunError("Complete the required task fields first.");
      return;
    }
    if (discoveryError) {
      setRunError(`Live agent discovery is unavailable: ${discoveryError}`);
      return;
    }
    setRunError(null);
    setStage("candidates");
  }

  function toggleCandidate(tokenId: number) {
    setSelected((current) => {
      if (current.includes(tokenId)) return current.filter((id) => id !== tokenId);
      if (current.length >= 4) return current;
      return [...current, tokenId];
    });
  }

  async function runAuditions() {
    const task = buildTask();
    if (!task) {
      setRunError("Your task is incomplete. Go back and finish the required fields.");
      setStage("task");
      return;
    }
    if (!selected.length) {
      setRunError("Select at least one candidate.");
      return;
    }

    setStage("running");
    setRunError(null);
    setResults([]);
    setFailures([]);
    setRace(selected.map((tokenId) => ({ tokenId, status: "running" })));

    const outcomes = await Promise.all(selected.map(async (tokenId) => {
      try {
        const request = await fetch("/api/auditions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId, task }),
        });
        const body = await request.json() as SingleResponse;
        if (!request.ok || !body.ok || !body.result) {
          throw new Error(body.error || "Live audition request failed");
        }

        setRace((current) => current.map((entry) => entry.tokenId === tokenId
          ? { ...entry, status: body.result!.status, latencyMs: body.result!.latencyMs, error: body.result!.error }
          : entry));
        return { result: body.result, error: null as string | null };
      } catch (cause) {
        const error = cause instanceof Error ? cause.message : "Live audition request failed";
        setRace((current) => current.map((entry) => entry.tokenId === tokenId
          ? { ...entry, status: "request-error", error }
          : entry));
        return { result: null as AuditionResult | null, error };
      }
    }));

    const completed = outcomes.flatMap((entry) => entry.result ? [entry.result] : []);
    const failed = outcomes.flatMap((entry, index) => entry.error ? [{ tokenId: selected[index], error: entry.error }] : []);
    setResults(compareAuditions(completed));
    setFailures(failed);
    if (!completed.length) setRunError("None of the selected services returned a comparable result. Try another candidate set.");
    setStage("results");
    window.setTimeout(() => document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const activeStep = stage === "task" ? 1 : stage === "candidates" ? 2 : stage === "running" ? 3 : 3;
  const best = results[0];

  return <section className="clean-flow" id="audition" aria-labelledby="clean-flow-title">
    <FlowStepper active={activeStep} />

    {stage === "task" ? <form className="clean-step" onSubmit={continueToCandidates}>
      <header className="clean-step-head">
        <span className="clean-step-number">1</span>
        <div>
          <p>YOUR TASK</p>
          <h2 id="clean-flow-title">What should the agent do?</h2>
          <span>Choose one job. AgentDesk will find matching BNB agents for you.</span>
        </div>
      </header>

      <div className="clean-category-grid" role="group" aria-label="Choose task category">
        {CATEGORIES.map(({ id, title, short, icon: Icon }) => <button
          type="button"
          key={id}
          onClick={() => chooseCategory(id)}
          className={category === id ? "clean-category active" : "clean-category"}
          aria-pressed={category === id}
        >
          <Icon size={20} />
          <strong>{title}</strong>
          <small>{short}</small>
        </button>)}
      </div>

      <div className="clean-fields">
        {category === "Health Factor Monitoring" ? <>
          <Field label="Wallet address" required value={healthWallet} onChange={setHealthWallet} placeholder="0x…" />
          <Field label="Protocol" value={healthProtocol} onChange={setHealthProtocol} placeholder="Venus" />
          <Field label="What should it monitor?" value={healthGoal} onChange={setHealthGoal} placeholder="Liquidation risk…" wide />
        </> : null}

        {category === "Yield Optimisation" ? <>
          <Field label="Asset" required value={yieldAsset} onChange={setYieldAsset} placeholder="USDC" />
          <Field label="Scenario amount" required value={yieldAmount} onChange={setYieldAmount} placeholder="500" />
          <Field label="Risk preference" value={yieldRisk} onChange={setYieldRisk} placeholder="moderate" />
        </> : null}

        {category === "Grid Trading" ? <>
          <Field label="Pair" required value={gridPair} onChange={setGridPair} placeholder="WBNB/USDT" />
          <Field label="Scenario capital" required value={gridCapital} onChange={setGridCapital} placeholder="500 USDT" />
          <Field label="Price range" value={gridRange} onChange={setGridRange} placeholder="Optional" />
          <Field label="Risk preference" value={gridRisk} onChange={setGridRisk} placeholder="moderate" />
        </> : null}

        {category === "Rebalancing" ? <>
          <Field label="Portfolio or position" required value={portfolio} onChange={setPortfolio} placeholder="Describe holdings or LP position" wide />
          <Field label="Goal" required value={objective} onChange={setObjective} placeholder="What should improve?" wide />
        </> : null}

        <Field label="Extra instructions" value={instructions} onChange={setInstructions} placeholder="Optional constraints" wide />
      </div>

      <div className="clean-note"><ShieldCheck size={16} /> This stage is read-only. Scenario amounts are not wallet balances and no trade is executed.</div>
      {runError ? <div className="clean-error" role="alert">{runError}</div> : null}
      <button className="clean-primary" type="submit" disabled={discoveryLoading}>
        {discoveryLoading ? <><Loader2 className="spin" size={17} /> Finding live agents…</> : <>Find matching agents <ArrowRight size={17} /></>}
      </button>
    </form> : null}

    {stage === "candidates" ? <section className="clean-step" id="agents">
      <header className="clean-step-head">
        <span className="clean-step-number">2</span>
        <div>
          <p>MATCHED CANDIDATES</p>
          <h2>Choose who should audition</h2>
          <span>We selected up to three live registry matches. Change them if you want.</span>
        </div>
      </header>

      {!candidates.length ? <div className="clean-empty">No source-qualified agent currently matches this category.</div> : null}
      <div className="clean-candidate-list">
        {candidates.map((agent) => {
          const checked = selected.includes(agent.tokenId);
          return <button
            key={agent.tokenId}
            type="button"
            onClick={() => toggleCandidate(agent.tokenId)}
            className={checked ? "clean-candidate selected" : "clean-candidate"}
            aria-pressed={checked}
          >
            <span className="clean-check">{checked ? <Check size={14} /> : null}</span>
            <span className="clean-candidate-copy">
              <strong>{agent.name}</strong>
              <small>ERC-8004 #{agent.tokenId}{agent.protocols.length ? ` · ${agent.protocols.slice(0, 2).join(", ")}` : ""}</small>
            </span>
            <span className="clean-source">Registry listed</span>
          </button>;
        })}
      </div>

      <div className="clean-selection-bar">
        <span>{selected.length} selected</span>
        <small>Maximum 4 candidates</small>
      </div>
      {runError ? <div className="clean-error" role="alert">{runError}</div> : null}
      <div className="clean-actions">
        <button className="clean-secondary" type="button" onClick={() => setStage("task")}><ArrowLeft size={16} /> Edit task</button>
        <button className="clean-primary" type="button" onClick={runAuditions} disabled={!selected.length}>Run auditions <ArrowRight size={17} /></button>
      </div>
    </section> : null}

    {stage === "running" ? <section className="clean-step clean-running" aria-live="polite">
      <div className="clean-loader"><Loader2 className="spin" size={26} /></div>
      <h2>Agents are auditioning now</h2>
      <p>Each selected agent receives the same bounded task. You can compare what actually comes back.</p>
      <div className="clean-race-list">
        {race.map((entry, index) => <div key={entry.tokenId} className={`clean-race-row ${entry.status}`}>
          <span>Candidate {String.fromCharCode(65 + index)}</span>
          <b>{statusLabel(entry.status)}</b>
          <small>{entry.latencyMs !== undefined && entry.latencyMs !== null ? `${entry.latencyMs} ms` : "working…"}</small>
        </div>)}
      </div>
    </section> : null}

    {stage === "results" ? <section className="clean-step clean-results" id="comparison">
      <header className="clean-step-head">
        <span className="clean-step-number">3</span>
        <div>
          <p>COMPARISON</p>
          <h2>Who proved the best fit?</h2>
          <span>Only observable audition evidence is compared. No global trust percentage is invented.</span>
        </div>
      </header>

      {runError ? <div className="clean-error" role="alert">{runError}</div> : null}

      {best ? <BestResult
        result={best}
        displayName={displayName(best, selected, names, revealed)}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        showVerification={showVerification}
        onToggleVerification={() => setShowVerification((value) => !value)}
        showHire={showHire}
        onToggleHire={() => setShowHire((value) => !value)}
      /> : null}

      {results.length > 1 || failures.length ? <div className="clean-other-results">
        <div className="clean-section-label">OTHER CANDIDATES</div>
        {results.slice(1).map((result) => {
          const open = expandedResult === result.candidate.tokenId;
          return <div className="clean-result-row" key={result.candidate.tokenId}>
            <button type="button" onClick={() => setExpandedResult(open ? null : result.candidate.tokenId)}>
              <span><strong>{displayName(result, selected, names, revealed)}</strong><small>{result.comparison.label}</small></span>
              <span><b>{statusLabel(result.status)}</b><small>{result.latencyMs !== null ? `${result.latencyMs} ms` : "—"}</small></span>
              <span>{open ? "Hide" : "View"}</span>
            </button>
            {open ? <div className="clean-result-details">
              {result.output ? <p>{result.output}</p> : <p>{result.error || "No usable task output was returned."}</p>}
              <details><summary>Evidence details</summary><ul>{result.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul></details>
            </div> : null}
          </div>;
        })}
        {failures.map((failure) => <div className="clean-result-row muted" key={`failure-${failure.tokenId}`}>
          <div className="clean-failure-row"><span><strong>{candidateAlias(failure.tokenId, selected)}</strong><small>Request failed</small></span><span>{shortError(failure.error)}</span></div>
        </div>)}
      </div> : null}

      <div className="clean-actions result-actions">
        <button className="clean-secondary" type="button" onClick={() => resetRun("task")}><RefreshCw size={16} /> New task</button>
        {!revealed && best ? <button className="clean-primary" type="button" onClick={() => setRevealed(true)}>Reveal identities <ArrowRight size={17} /></button> : null}
      </div>
    </section> : null}
  </section>;
}

function FlowStepper({ active }: { active: number }) {
  const steps = ["Task", "Candidates", "Compare", "Hire"];
  return <ol className="clean-stepper" aria-label="AgentDesk hiring flow">
    {steps.map((label, index) => {
      const number = index + 1;
      const complete = number < active;
      const current = number === active;
      return <li key={label} className={complete ? "complete" : current ? "current" : ""}>
        <span>{complete ? <Check size={13} /> : number}</span>
        <b>{label}</b>
      </li>;
    })}
  </ol>;
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
  return <label className={wide ? "clean-field wide" : "clean-field"}>
    <span>{label}{required ? <b> *</b> : null}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
  </label>;
}

function BestResult({
  result,
  displayName,
  revealed,
  onReveal,
  showVerification,
  onToggleVerification,
  showHire,
  onToggleHire,
}: {
  result: ComparedAudition;
  displayName: string;
  revealed: boolean;
  onReveal: () => void;
  showVerification: boolean;
  onToggleVerification: () => void;
  showHire: boolean;
  onToggleHire: () => void;
}) {
  return <article className="clean-best-card">
    <div className="clean-best-top">
      <div>
        <span className="clean-best-badge"><Sparkles size={13} /> {result.comparison.label}</span>
        <h3>{displayName}</h3>
        {!revealed ? <small>Identity stays hidden until you decide the evidence is worth inspecting.</small> : <small>ERC-8004 #{result.candidate.tokenId}</small>}
      </div>
      <div className="clean-metrics">
        <Metric label="Status" value={statusLabel(result.status)} />
        <Metric label="Latency" value={result.latencyMs !== null ? `${result.latencyMs} ms` : "—"} />
        <Metric label="Quote" value={result.quote ? `${result.quote.amount} ${result.quote.asset}` : "Not returned"} />
      </div>
    </div>

    <div className="clean-output">
      <span>Audition result</span>
      <p>{result.output || result.error || "No usable task output was returned."}</p>
    </div>

    <details className="clean-details">
      <summary>Why this ranked first</summary>
      <ul>{result.comparison.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    </details>

    <details className="clean-details">
      <summary>Raw evidence ({result.evidence.length})</summary>
      <ul>{result.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul>
      {revealed ? <a href={result.candidate.sourceUrl} target="_blank" rel="noreferrer">Open ERC-8004 source <ExternalLink size={13} /></a> : null}
    </details>

    <div className="clean-best-actions">
      <button type="button" className={showVerification ? "clean-secondary active" : "clean-secondary"} onClick={onToggleVerification}>Verify result</button>
      {!revealed ? <button type="button" className="clean-primary" onClick={onReveal}>Reveal identity</button> : <button type="button" className={showHire ? "clean-primary active" : "clean-primary"} onClick={onToggleHire}>Hire this agent</button>}
    </div>

    {showVerification ? <div className="clean-advanced-panel"><IndependentCheck result={result} /></div> : null}
    {revealed && showHire ? <div className="clean-advanced-panel"><ERC8183HireFlow result={result} agentName={displayName} /></div> : null}
  </article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}

function candidateAlias(tokenId: number, selected: number[]) {
  const index = selected.indexOf(tokenId);
  return `Candidate ${String.fromCharCode(65 + Math.max(index, 0))}`;
}

function displayName(result: ComparedAudition, selected: number[], names: Map<number, string>, revealed: boolean) {
  return revealed ? names.get(result.candidate.tokenId) || `ERC-8004 #${result.candidate.tokenId}` : candidateAlias(result.candidate.tokenId, selected);
}

function statusLabel(status: RaceStatus) {
  if (status === "completed") return "Completed";
  if (status === "running") return "Running";
  if (status === "unsupported") return "Unavailable";
  if (status === "timeout") return "Timed out";
  return "Failed";
}

function shortError(error: string) {
  return error.length > 150 ? `${error.slice(0, 147)}…` : error;
}
