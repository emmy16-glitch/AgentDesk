"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Check, CircleAlert, Loader2, Scale, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import AgentDeskShell from "@/components/agentdesk/AgentDeskShell";
import IndependentCheck from "@/components/auditions/IndependentCheck";
import ERC8183HireFlow from "@/components/hiring/ERC8183HireFlow";
import { useWallet } from "@/components/wallet/WalletProvider";
import { compareAuditions, type ComparedAudition } from "@/lib/auditions/compare";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import type { DiscoveredAgent, MarketplaceCategory } from "@/lib/8004scan";

type Stage = 1 | 2 | 3 | 4 | 5 | 6;
type RaceStatus = AuditionResult["status"] | "running" | "request-error";
type RaceEntry = { tokenId: number; status: RaceStatus; latencyMs?: number | null; error?: string };
type AuditionResponse = { ok: boolean; error?: string; result?: AuditionResult };

const choices: Array<{ id: MarketplaceCategory; label: string; short: string; icon: typeof ShieldCheck }> = [
  { id: "Health Factor Monitoring", label: "Protect", short: "Monitor lending risk", icon: ShieldCheck },
  { id: "Yield Optimisation", label: "Earn", short: "Find yield options", icon: TrendingUp },
  { id: "Grid Trading", label: "Trade", short: "Plan a price range", icon: ArrowLeftRight },
  { id: "Rebalancing", label: "Balance", short: "Review allocations", icon: Scale },
];

export default function GuidedMarketplace({ agents, discoveryLoading, discoveryError }: { agents: DiscoveredAgent[]; discoveryLoading: boolean; discoveryError: string | null }) {
  const [stage, setStage] = useState<Stage>(1);
  const [category, setCategory] = useState<MarketplaceCategory>("Yield Optimisation");
  const [prompt, setPrompt] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("500");
  const [risk, setRisk] = useState("moderate");
  const [walletAddress, setWalletAddress] = useState("");
  const [protocol, setProtocol] = useState("");
  const [pair, setPair] = useState("WBNB/USDT");
  const [capital, setCapital] = useState("500 USDT");
  const [portfolio, setPortfolio] = useState("");
  const [objective, setObjective] = useState("");
  const [race, setRace] = useState<RaceEntry[]>([]);
  const [results, setResults] = useState<ComparedAudition[]>([]);
  const [failures, setFailures] = useState<Array<{ tokenId: number; error: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const { connected, openConnect } = useWallet();

  const candidates = useMemo(() => agents.filter((agent) => agent.categories.includes(category)).slice(0, 4), [agents, category]);
  const names = useMemo(() => new Map(agents.map((agent) => [agent.tokenId, agent.name])), [agents]);
  const best = results[0];

  function buildTask(): AuditionTask | null {
    const instructions = prompt.trim();
    if (category === "Yield Optimisation") return asset.trim() && amount.trim() ? { category, asset: asset.trim(), amount: amount.trim(), riskPreference: risk, ...(instructions ? { instructions } : {}) } : null;
    if (category === "Health Factor Monitoring") return walletAddress.trim() ? { category, wallet: walletAddress.trim(), protocol: protocol.trim() || undefined, goal: instructions || undefined } : null;
    if (category === "Grid Trading") return pair.trim() && capital.trim() ? { category, pair: pair.trim(), capital: capital.trim(), riskPreference: risk, ...(instructions ? { instructions } : {}) } : null;
    return portfolio.trim() && objective.trim() ? { category, portfolio: portfolio.trim(), objective: objective.trim(), ...(instructions ? { instructions } : {}) } : null;
  }

  function beginDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return setError("Describe what you want an agent to do first.");
    setError(null); setStage(2);
  }

  async function beginTesting() {
    const task = buildTask();
    if (!task) return setError("Complete the required details so AgentDesk can test the right agents.");
    if (discoveryLoading) return setError("Live agent discovery is still loading. Please wait a moment.");
    if (discoveryError) return setError("Live agent discovery is unavailable right now. You can try again shortly.");
    if (!candidates.length) return setError("No source-qualified agents match this task right now. Try a different task type.");
    setError(null); setRace(candidates.map((candidate) => ({ tokenId: candidate.tokenId, status: "running" }))); setResults([]); setFailures([]); setStage(3);
    const outcomes = await Promise.all(candidates.map(async (candidate) => {
      try {
        const response = await fetch("/api/auditions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenId: candidate.tokenId, task }) });
        const body = await response.json() as AuditionResponse;
        if (!response.ok || !body.ok || !body.result) throw new Error(body.error || "The agent could not respond.");
        setRace((current) => current.map((entry) => entry.tokenId === candidate.tokenId ? { ...entry, status: body.result!.status, latencyMs: body.result!.latencyMs, error: body.result!.error } : entry));
        return { result: body.result, failure: null as string | null };
      } catch (cause) {
        const failure = cause instanceof Error ? cause.message : "The agent could not respond.";
        setRace((current) => current.map((entry) => entry.tokenId === candidate.tokenId ? { ...entry, status: "request-error", error: failure } : entry));
        return { result: null, failure };
      }
    }));
    const completed = outcomes.flatMap((outcome) => outcome.result ? [outcome.result] : []);
    setResults(compareAuditions(completed));
    setFailures(outcomes.flatMap((outcome, index) => outcome.failure ? [{ tokenId: candidates[index].tokenId, error: outcome.failure }] : []));
    if (!completed.length) setError("The matching agents could not return a comparable answer. You can go back and try another task.");
  }

  function back() { setError(null); setStage((current) => Math.max(1, current - 1) as Stage); }
  function reset() { setStage(1); setResults([]); setRace([]); setFailures([]); setError(null); }
  const activeChoice = choices.find((choice) => choice.id === category)!;

  return <AgentDeskShell step={stage}>
    {stage === 1 ? <form className="ad-ask ad-screen" onSubmit={beginDetails} noValidate>
      <div className="ad-hero-copy"><span className="ad-kicker"><i /> AI agents. Real work. On BNB.</span><h1>What do you want<br /><em>an agent to do?</em></h1><p>Describe your goal and AgentDesk will find, test and recommend the best BNB agent for you.</p></div>
      <section className="ad-surface ad-ask-surface" aria-label="Describe your task"><label className="sr-only" htmlFor="agent-task">What do you want an agent to do?</label><textarea id="agent-task" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="E.g. Help me find the best yield for 500 USDC" rows={3} /><div className="ad-shortcuts" role="group" aria-label="Choose a task mode">{choices.map((choice) => { const Icon = choice.icon; return <button key={choice.id} type="button" className={choice.id === category ? "active" : ""} aria-pressed={choice.id === category} onClick={() => setCategory(choice.id)}><Icon size={18} /><span><strong>{choice.label}</strong><small>{choice.short}</small></span></button>; })}</div><button className="ad-primary ad-ask-cta" type="submit">Find the best agent <ArrowRight size={18} /></button></section>
      {error ? <p className="ad-inline-error" role="alert">{error}</p> : null}<FeatureFooter />
    </form> : null}

    {stage === 2 ? <form className="ad-details ad-screen" onSubmit={(event) => { event.preventDefault(); void beginTesting(); }} noValidate>
      <ScreenHeading title="Tell us a little more." description="We’ll use this to find the most relevant agents for your goal." />
      <div className="ad-task-chip"><strong>{activeChoice.label}</strong><span>{prompt}</span></div>
      <section className="ad-surface ad-details-surface"><div className="ad-fields">
        {category === "Yield Optimisation" ? <><Field label="Asset" value={asset} setValue={setAsset} /><Field label="Amount" value={amount} setValue={setAmount} suffix="USDC" /><RiskField value={risk} setValue={setRisk} /><Field label="Goal (optional)" value={prompt} setValue={setPrompt} /></> : null}
        {category === "Health Factor Monitoring" ? <><Field label="Wallet address" value={walletAddress} setValue={setWalletAddress} placeholder="Paste wallet address" /><Field label="Protocol (optional)" value={protocol} setValue={setProtocol} placeholder="e.g. Venus" /><Field label="What should it monitor?" value={prompt} setValue={setPrompt} wide /></> : null}
        {category === "Grid Trading" ? <><Field label="Pair" value={pair} setValue={setPair} /><Field label="Amount" value={capital} setValue={setCapital} /><RiskField value={risk} setValue={setRisk} /><Field label="Strategy constraints (optional)" value={prompt} setValue={setPrompt} /></> : null}
        {category === "Rebalancing" ? <><Field label="Current allocation" value={portfolio} setValue={setPortfolio} placeholder="Describe holdings or a position" wide /><Field label="Target allocation" value={objective} setValue={setObjective} placeholder="What should improve?" wide /></> : null}
      </div><p className="ad-safety-note"><ShieldCheck size={18} /> No funds are used here. We test agents first.</p></section>
      {error ? <p className="ad-inline-error" role="alert">{error}</p> : null}<ScreenActions back={back} primary="Find agents" onPrimary={() => void beginTesting()} /> <FeatureFooter />
    </form> : null}

    {stage === 3 ? <section className="ad-test ad-screen" aria-live="polite"><ScreenHeading title="We’re testing agents for you." description="AgentDesk is trying your task across a few matching agents to see who performs best." center /><div className="ad-task-chip centered"><strong>{activeChoice.label}</strong><span>{prompt}</span></div><section className="ad-surface ad-test-surface"><header><div><strong>Live testing</strong><p>We’re running your task on matching agents.</p></div><span>{race.length} agents <i /> Testing in parallel</span></header><div className="ad-race-list">{race.map((entry, index) => <RaceRow key={entry.tokenId} index={index} entry={entry} />)}</div>{!race.length ? <p className="ad-empty">Preparing the live test…</p> : null}<p className="ad-safety-note"><ShieldCheck size={18} /> No funds are used here. We only test agents first.</p><div className="ad-actions"><button className="ad-text-button" type="button" onClick={back}><ArrowLeft size={18} /> Back</button><button className="ad-primary" type="button" disabled={race.some((entry) => entry.status === "running")} onClick={() => setStage(4)}>{race.some((entry) => entry.status === "running") ? <><Loader2 className="spin" size={17} /> Testing agents</> : <>See results <ArrowRight size={18} /></>}</button></div></section><FeatureFooter /></section> : null}

    {stage === 4 ? <section className="ad-match ad-screen">{best ? <><ScreenHeading eyebrow="YOUR BEST MATCH" title={names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`} description="The agent that performed best for your task." /><section className="ad-match-layout"><div className="ad-match-reasons"><Reason title="Relevant answer" detail={best.output ? "Returned a task-specific answer" : "No usable task output was returned"} /><Reason title="Used available evidence" detail={best.evidence.length ? `${best.evidence.length} evidence item${best.evidence.length === 1 ? "" : "s"} returned` : "No evidence was returned"} /><Reason title="Clear hire terms" detail={best.quote ? "A quote was returned for review" : "A price was not returned"} />{best.quote ? <p className="ad-price"><small>Price</small><strong>{best.quote.amount} {best.quote.asset}</strong></p> : null}<div className="ad-actions"><button className="ad-primary" type="button" onClick={() => setStage(5)}>Check answer <ArrowRight size={18} /></button></div></div><div className="ad-agent-answer"><span>Agent’s answer</span><p>{best.output || "This agent did not return a usable answer."}</p><details><summary>View proof</summary><ul>{best.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul></details></div></section>{results.length > 1 || failures.length ? <section className="ad-other-agents"><header><strong>Other agents</strong><span>Live results only</span></header>{results.slice(1).map((result) => <AgentRow key={result.candidate.tokenId} result={result} name={names.get(result.candidate.tokenId) || `Agent #${result.candidate.tokenId}`} />)}{failures.map((failure) => <div className="ad-agent-row" key={failure.tokenId}><span>{names.get(failure.tokenId) || "Agent"}</span><small>Couldn’t finish</small></div>)}</section> : null}</> : <EmptyResult error={error} />}{best ? <ScreenActions back={back} primary="Check answer" onPrimary={() => setStage(5)} /> : <button className="ad-text-button" type="button" onClick={back}><ArrowLeft size={18} /> Back</button>}</section> : null}

    {stage === 5 ? <section className="ad-check ad-screen">{best ? <><ScreenHeading eyebrow="VERIFYING THE RESULT" title={<>We checked<br /><em>this agent’s answer</em></>} description={`Here’s what AgentDesk could verify about ${names.get(best.candidate.tokenId) || "this agent"}’s result.`} /><section className="ad-check-layout"><div className="ad-surface ad-check-answer"><span className="ad-micro">SELECTED AGENT</span><h2>{names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`}</h2><p>{best.output || "No usable answer was returned."}</p><details><summary>View full answer and proof</summary><ul>{best.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul></details></div><div className="ad-surface ad-verification"><h2>What we checked</h2><p>AgentDesk only shows the results of live evidence checks.</p><IndependentCheck result={best} /></div></section><ScreenActions back={back} primary="Continue to hire" onPrimary={() => setStage(6)} /></> : <EmptyResult error={error} />}</section> : null}

    {stage === 6 ? <section className="ad-hire ad-screen">{best ? <><ScreenHeading eyebrow="FINAL STEP" title={<>Hire <em>this agent</em></>} description={`You’re ready to hire ${names.get(best.candidate.tokenId) || "this agent"} for your task.`} /><section className="ad-hire-layout"><div className="ad-surface ad-hire-summary"><span className="ad-micro">SELECTED AGENT</span><h2>{names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`}</h2><dl><div><dt>Task</dt><dd>{prompt}</dd></div><div><dt>Price</dt><dd>{best.quote ? `${best.quote.amount} ${best.quote.asset}` : "Not returned"}</dd></div><div><dt>Status</dt><dd>{statusLabel(best.status)}</dd></div></dl></div><div className="ad-surface ad-hire-action"><WalletCards size={35} /><h2>{connected ? "Review terms to continue" : "Connect wallet to continue"}</h2><p>{connected ? "Get fresh provider-signed terms before creating a real ERC-8183 job." : "A wallet connection is only needed to complete the hire. It lets you approve payment when you are ready."}</p>{!connected ? <button className="ad-primary" type="button" onClick={openConnect}>Connect wallet <ArrowRight size={18} /></button> : <ERC8183HireFlow result={best} agentName={names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`} />}</div></section><ScreenActions back={back} /></> : <EmptyResult error={error} />}</section> : null}
  </AgentDeskShell>;
}

function ScreenHeading({ eyebrow, title, description, center = false }: { eyebrow?: string; title: ReactNode; description: string; center?: boolean }) { return <header className={center ? "ad-heading centered" : "ad-heading"}>{eyebrow ? <span className="ad-micro">{eyebrow}</span> : null}<h1>{title}</h1><p>{description}</p></header>; }
function Field({ label, value, setValue, suffix, placeholder, wide = false }: { label: string; value: string; setValue: (value: string) => void; suffix?: string; placeholder?: string; wide?: boolean }) { const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; return <label className={wide ? "ad-field wide" : "ad-field"} htmlFor={id}><span>{label}</span><div><input id={id} value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} />{suffix ? <small>{suffix}</small> : null}</div></label>; }
function RiskField({ value, setValue }: { value: string; setValue: (value: string) => void }) { return <fieldset className="ad-field ad-risk-field"><legend>Risk preference</legend><div role="radiogroup" aria-label="Risk preference">{["low", "moderate", "high"].map((option) => <button key={option} type="button" role="radio" aria-checked={value === option} className={value === option ? "active" : ""} onClick={() => setValue(option)}><span>{option[0].toUpperCase() + option.slice(1)}</span>{value === option ? <Check size={14} /> : null}</button>)}</div></fieldset>; }
function ScreenActions({ back, primary, onPrimary }: { back: () => void; primary?: string; onPrimary?: () => void }) { return <div className="ad-screen-actions"><button type="button" className="ad-secondary" onClick={back}><ArrowLeft size={18} /> Back</button>{primary ? <button type="button" className="ad-primary" onClick={onPrimary}>{primary} <ArrowRight size={18} /></button> : null}</div>; }
function FeatureFooter() { return <div className="ad-feature-footer" id="how-it-works"><span><b>ϟ</b><strong>Real agents</strong><small>Live on BNB Chain</small></span><span><b>⌾</b><strong>Tested for you</strong><small>We compare their answers</small></span><span><b>Ⅲ</b><strong>Clear results</strong><small>See who performed best</small></span><span><b>◯</b><strong>You stay in control</strong><small>Hire only when you’re ready</small></span></div>; }
function RaceRow({ entry, index }: { entry: RaceEntry; index: number }) { const complete = entry.status === "completed"; const failed = entry.status !== "running" && !complete; return <div className="ad-race-row"><span className={`ad-race-dot ${complete ? "complete" : failed ? "failed" : "running"}`}>{complete ? <Check size={14} /> : failed ? <CircleAlert size={14} /> : <Loader2 className="spin" size={14} />}</span><div><strong>Agent {index + 1}</strong><small>{complete ? "Returned an answer" : failed ? "Couldn’t finish" : "Testing…"}</small></div><b>{entry.latencyMs ? `${entry.latencyMs}ms` : statusLabel(entry.status)}</b></div>; }
function Reason({ title, detail }: { title: string; detail: string }) { return <div className="ad-reason"><Check size={19} /><span><strong>{title}</strong><small>{detail}</small></span></div>; }
function AgentRow({ result, name }: { result: ComparedAudition; name: string }) { return <div className="ad-agent-row"><span><strong>{name}</strong><small>{result.comparison.label}</small></span><small>{statusLabel(result.status)}</small></div>; }
function EmptyResult({ error }: { error: string | null }) { return <div className="ad-empty-result"><CircleAlert size={22} /><h2>We couldn’t compare an answer yet.</h2><p>{error || "Try the task again when live agent responses are available."}</p></div>; }
function statusLabel(status: RaceStatus) { if (status === "completed") return "Done"; if (status === "running") return "Testing"; if (status === "timeout") return "Couldn’t finish"; if (status === "unsupported") return "Unavailable"; return "Couldn’t finish"; }
