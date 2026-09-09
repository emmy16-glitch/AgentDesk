"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowLeftRight, BarChart3, Check, CircleAlert, CircleHelp, Loader2, Scale, ShieldCheck, TrendingUp, UserRoundCheck, WalletCards, Zap, X } from "lucide-react";
import AgentDeskShell from "@/components/agentdesk/AgentDeskShell";
import IndependentCheck from "@/components/auditions/IndependentCheck";
import ERC8183HireFlow from "@/components/hiring/ERC8183HireFlow";
import { useWallet } from "@/components/wallet/WalletProvider";
import { type ComparedAudition } from "@/lib/auditions/compare";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import { actionPolicyLabel, dataPolicyLabel, protocolRuleLabel, rulesSummary } from "@/lib/guardrails/labels";
import type { ActionPolicy, RiskTolerance, RuleCheck, TaskGuardrails } from "@/lib/guardrails/types";
import type { MarketplaceCategory } from "@/lib/8004scan";
import { useDiscoveryStream } from "@/hooks/useDiscoveryStream";

type Stage = 1 | 2 | 3 | 4 | 5 | 6;
type RaceStatus = AuditionResult["status"] | "running" | "request-error";
type RaceEntry = { tokenId: number; status: RaceStatus; latencyMs?: number | null; error?: string };

const choices: Array<{ id: MarketplaceCategory; label: string; short: string; icon: typeof ShieldCheck }> = [
  { id: "Health Factor Monitoring", label: "Protect", short: "Monitor lending risk", icon: ShieldCheck },
  { id: "Yield Optimisation", label: "Earn", short: "Find yield options", icon: TrendingUp },
  { id: "Grid Trading", label: "Trade", short: "Plan a price range", icon: ArrowLeftRight },
  { id: "Rebalancing", label: "Balance", short: "Review allocations", icon: Scale },
];

export default function GuidedMarketplace() {
  const [stage, setStage] = useState<Stage>(1);
  const [category, setCategory] = useState<MarketplaceCategory>("Yield Optimisation");
  const [prompt, setPrompt] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("500");
  const [risk, setRisk] = useState<RiskTolerance>("moderate");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [approvedProtocols, setApprovedProtocols] = useState<string[]>([]);
  const [protocolRestriction, setProtocolRestriction] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState("");
  const [maxPriceAsset, setMaxPriceAsset] = useState("$U");
  const [actionPolicy, setActionPolicy] = useState<ActionPolicy>("approval-required");
  const [walletAddress, setWalletAddress] = useState("");
  const [protocol, setProtocol] = useState("");
  const [pair, setPair] = useState("WBNB/USDT");
  const [capital, setCapital] = useState("500 USDT");
  const [portfolio, setPortfolio] = useState("");
  const [objective, setObjective] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { connected, openConnect } = useWallet();
  const discovery = useDiscoveryStream();
  const race = discovery.race;
  const results = discovery.results;
  const failures: Array<{ tokenId: number; error: string }> = [];
  const streamError = discovery.error;
  const names = useMemo(() => new Map(discovery.shortlist.map((agent) => [agent.tokenId, agent.name])), [discovery.shortlist]);
  const best = results.find((result) => !result.ruleEvaluation.hardFailure);
  const hasNoEligibleWinner = results.length > 0 && !best;

  const guardrails = useMemo<TaskGuardrails>(() => ({
    riskTolerance: risk,
    ...(maxPrice.trim() && maxPriceAsset.trim() ? { maxPrice: { amount: maxPrice.trim(), asset: maxPriceAsset.trim() } } : {}),
    approvedProtocols,
    actionPolicy,
    dataPolicy: category === "Health Factor Monitoring" ? "public-wallet-only" : "task-only",
  }), [actionPolicy, approvedProtocols, category, maxPrice, maxPriceAsset, risk]);

  function invalidateDependentResults() {
    discovery.abort(); discovery.reset();
  }

  function updateRisk(value: RiskTolerance) { setRisk(value); invalidateDependentResults(); }
  function updateProtocolRestriction(value: string | null) {
    setProtocolRestriction(value);
    setApprovedProtocols(value?.trim() ? [value.trim()] : []);
    invalidateDependentResults();
  }
  function updateMaxPrice(value: string) { setMaxPrice(value); invalidateDependentResults(); }
  function updateMaxPriceAsset(value: string) { setMaxPriceAsset(value); invalidateDependentResults(); }
  function updateActionPolicy(value: ActionPolicy) { setActionPolicy(value); invalidateDependentResults(); }

  function buildTask(): AuditionTask | null {
    const instructions = prompt.trim();
    if (category === "Yield Optimisation") return asset.trim() && amount.trim() ? { category, asset: asset.trim(), amount: amount.trim(), riskPreference: risk, guardrails, ...(instructions ? { instructions } : {}) } : null;
    if (category === "Health Factor Monitoring") return walletAddress.trim() ? { category, wallet: walletAddress.trim(), protocol: protocol.trim() || undefined, goal: instructions || undefined, guardrails } : null;
    if (category === "Grid Trading") return pair.trim() && capital.trim() ? { category, pair: pair.trim(), capital: capital.trim(), riskPreference: risk, guardrails, ...(instructions ? { instructions } : {}) } : null;
    return portfolio.trim() && objective.trim() ? { category, portfolio: portfolio.trim(), objective: objective.trim(), guardrails, ...(instructions ? { instructions } : {}) } : null;
  }

  function beginDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return setError("Describe what you want an agent to do first.");
    setError(null); setStage(2);
  }

  async function beginTesting() {
    if (maxPrice.trim() && !/^\d+(?:\.\d+)?$/.test(maxPrice.trim())) return setError("Enter a valid maximum hire price, or leave it blank.");
    if (protocolRestriction !== null && !protocolRestriction.trim()) return setError("Name the protocol you want to allow, or choose Any protocol.");
    const task = buildTask();
    if (!task) return setError("Complete the required details so AgentDesk can test the right agents.");
    setError(null); setStage(3); void discovery.start(task);
  }

  function back() {
    if (stage === 3) discovery.abort();
    // Screen 3 completes automatically. Returning from a result therefore goes
    // to editable details instead of immediately advancing through a completed stream.
    if (stage === 4) { setError(null); setStage(2); return; }
    setError(null); setStage((current) => Math.max(1, current - 1) as Stage);
  }
  function reset() { discovery.abort(); discovery.reset(); setStage(1); setError(null); }
  const activeChoice = choices.find((choice) => choice.id === category)!;

  useEffect(() => {
    if (stage === 3 && discovery.phase === "complete" && discovery.results.length) setStage(4);
  }, [discovery.phase, discovery.results.length, stage]);

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
        {category === "Yield Optimisation" ? <><Field label="Asset" value={asset} setValue={setAsset} /><Field label="Amount" value={amount} setValue={setAmount} suffix="USDC" /><RiskField value={risk} setValue={updateRisk} /><Field label="Goal (optional)" value={prompt} setValue={setPrompt} /></> : null}
        {category === "Health Factor Monitoring" ? <><Field label="Wallet address" value={walletAddress} setValue={setWalletAddress} placeholder="Paste wallet address" /><Field label="Protocol (optional)" value={protocol} setValue={setProtocol} placeholder="e.g. Venus" /><Field label="What should it monitor?" value={prompt} setValue={setPrompt} wide /></> : null}
        {category === "Grid Trading" ? <><Field label="Pair" value={pair} setValue={setPair} /><Field label="Amount" value={capital} setValue={setCapital} /><RiskField value={risk} setValue={updateRisk} /><Field label="Strategy constraints (optional)" value={prompt} setValue={setPrompt} /></> : null}
        {category === "Rebalancing" ? <><Field label="Current allocation" value={portfolio} setValue={setPortfolio} placeholder="Describe holdings or a position" wide /><Field label="Target allocation" value={objective} setValue={setObjective} placeholder="What should improve?" wide /></> : null}
      </div><YourRules
        guardrails={guardrails}
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        protocolRestriction={protocolRestriction}
        setProtocolRestriction={updateProtocolRestriction}
        maxPrice={maxPrice}
        setMaxPrice={updateMaxPrice}
        maxPriceAsset={maxPriceAsset}
        setMaxPriceAsset={updateMaxPriceAsset}
        risk={risk}
        setRisk={updateRisk}
        actionPolicy={actionPolicy}
        setActionPolicy={updateActionPolicy}
        isWalletTask={category === "Health Factor Monitoring"}
      /><p className="ad-safety-note"><ShieldCheck size={18} /> No funds are used here. We test agents first.</p></section>
      {error ? <p className="ad-inline-error" role="alert">{error}</p> : null}<ScreenActions back={back} primary="Find agents" onPrimary={() => void beginTesting()} /> <FeatureFooter />
    </form> : null}

    {stage === 3 ? <section className="ad-test ad-screen" aria-live="polite"><ScreenHeading title={discovery.phase === "auditioning" ? `Testing ${discovery.shortlist.length} strong ${discovery.shortlist.length === 1 ? "match" : "matches"}` : discovery.phase === "comparing" ? "Comparing their results…" : "Finding the right agents"} description={discovery.phase === "auditioning" ? "AgentDesk is testing the strongest matches against your task and rules." : discovery.phase === "comparing" ? "Choosing the strongest result from the completed auditions." : "AgentDesk is searching for agents that match your task and rules."} center /><div className="ad-task-chip centered"><strong>{activeChoice.label}</strong><span>{prompt}</span></div><p className="ad-rules-test-note">Using your task + rules</p><section className="ad-surface ad-test-surface ad-stream-surface">{discovery.phase === "failed" ? <StreamFailure message={streamError || "We couldn’t find enough available agents right now."} onRetry={() => void beginTesting()} onBack={back} /> : race.length ? <><header><div><strong>Live testing</strong><p>Testing selected agents in parallel.</p></div><span>{race.length} selected <i /> Live auditions</span></header><div className="ad-race-list">{race.map((entry) => <RaceRow key={entry.tokenId} entry={{ tokenId: entry.tokenId, status: entry.status, latencyMs: entry.latencyMs, error: entry.message }} name={names.get(entry.tokenId)} />)}</div></> : <StreamActivity lines={discovery.activities} />}{discovery.phase !== "failed" ? <p className="ad-safety-note"><ShieldCheck size={18} /> No funds are used here. We only test agents first.</p> : null}<div className="ad-actions"><button className="ad-text-button" type="button" onClick={back}><ArrowLeft size={18} /> Back</button>{discovery.phase === "comparing" ? <span className="ad-stream-status"><Loader2 className="spin" size={16} /> Comparing</span> : null}</div></section><FeatureFooter /></section> : null}

    {stage === 4 ? <section className="ad-match ad-screen">{best ? <><ScreenHeading eyebrow="YOUR BEST MATCH" title={names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`} description="The agent that performed best for your task." /><section className="ad-match-layout"><div className="ad-match-reasons"><Reason title="Answered your task" detail={best.output ? "Returned a usable task-specific result" : "No usable task output was returned"} /><Reason title={best.ruleEvaluation.status === "partial" ? "Fits what we could confirm" : "Fits your rules"} detail={ruleSummary(best)} /><Reason title="Clear price" detail={best.quote ? `${best.quote.amount} ${best.quote.asset}${best.ruleEvaluation.checks.find((check) => check.id === "price")?.status === "pass" ? " · within your limit" : ""}` : "A price was not returned"} />{best.ruleEvaluation.checks.length ? <RuleChecks checks={best.ruleEvaluation.checks} title="Why this fits you" compact /> : null}{best.quote ? <p className="ad-price"><small>Price</small><strong>{best.quote.amount} {best.quote.asset}</strong></p> : null}<div className="ad-actions"><button className="ad-primary" type="button" onClick={() => setStage(5)}>Check answer <ArrowRight size={18} /></button></div></div><div className="ad-agent-answer"><span>Agent’s answer</span><p>{best.output || "This agent did not return a usable answer."}</p><details><summary>View proof</summary><ul>{best.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul></details></div></section>{results.length > 1 || failures.length ? <section className="ad-other-agents"><header><strong>Other agents</strong><span>Live results only</span></header>{results.filter((result) => result.candidate.tokenId !== best.candidate.tokenId).map((result) => <AgentRow key={result.candidate.tokenId} result={result} name={names.get(result.candidate.tokenId) || `Agent #${result.candidate.tokenId}`} />)}{failures.map((failure) => <div className="ad-agent-row" key={failure.tokenId}><span>{names.get(failure.tokenId) || "Agent"}</span><small>Couldn’t finish</small></div>)}</section> : null}</> : hasNoEligibleWinner ? <NoEligibleResult onEditRules={() => setStage(2)} onTryAnotherTask={reset} /> : <EmptyResult error={error} />}{best ? <ScreenActions back={back} primary="Check answer" onPrimary={() => setStage(5)} /> : !hasNoEligibleWinner ? <button className="ad-text-button" type="button" onClick={back}><ArrowLeft size={18} /> Back</button> : null}</section> : null}

    {stage === 5 ? <section className="ad-check ad-screen">{best ? <><ScreenHeading eyebrow="VERIFYING THE RESULT" title={<>We checked<br /><em>this agent’s answer</em></>} description={`Here’s what AgentDesk could verify about ${names.get(best.candidate.tokenId) || "this agent"}’s result.`} /><section className="ad-check-layout"><div className="ad-surface ad-check-answer"><span className="ad-micro">SELECTED AGENT</span><h2>{names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`}</h2><p>{best.output || "No usable answer was returned."}</p><details><summary>View full answer and proof</summary><ul>{best.evidence.map((item, index) => <li key={`${item.kind}-${index}`}>{item.summary}</li>)}</ul></details></div><div className="ad-surface ad-verification"><h2>What we checked</h2><p>AgentDesk only shows the results of live evidence checks.</p><IndependentCheck result={best} />{best.ruleEvaluation.checks.length ? <RuleChecks checks={best.ruleEvaluation.checks} title="Your rules" /> : null}</div></section><ScreenActions back={back} primary="Continue to hire" onPrimary={() => setStage(6)} /></> : <EmptyResult error={error} />}</section> : null}

    {stage === 6 ? <section className="ad-hire ad-screen">{best ? <><ScreenHeading eyebrow="FINAL STEP" title={<>Hire <em>this agent</em></>} description={`You’re ready to hire ${names.get(best.candidate.tokenId) || "this agent"} for your task.`} /><section className="ad-hire-layout"><div className="ad-surface ad-hire-summary"><span className="ad-micro">SELECTED AGENT</span><h2>{names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`}</h2><dl><div><dt>Task</dt><dd>{prompt}</dd></div><div><dt>Price</dt><dd>{best.quote ? `${best.quote.amount} ${best.quote.asset}` : "Not returned"}</dd></div><div><dt>Network</dt><dd>BNB Smart Chain</dd></div><div><dt>Status</dt><dd>{statusLabel(best.status)}</dd></div></dl><RulesSummary guardrails={best.task.guardrails ?? guardrails} /></div><div className="ad-surface ad-hire-action"><WalletCards size={35} /><h2>{connected ? "Review terms to continue" : "Connect wallet to continue"}</h2><p>{connected ? "Get fresh provider-signed terms before creating a real ERC-8183 job." : "A wallet connection is only needed to complete the hire. It lets you approve payment when you are ready."}</p>{!connected ? <button className="ad-primary" type="button" onClick={openConnect}>Connect wallet <ArrowRight size={18} /></button> : <ERC8183HireFlow result={best} agentName={names.get(best.candidate.tokenId) || `Agent #${best.candidate.tokenId}`} />}</div></section><ScreenActions back={back} /></> : <EmptyResult error={error} />}</section> : null}
  </AgentDeskShell>;
}

function ScreenHeading({ eyebrow, title, description, center = false }: { eyebrow?: string; title: ReactNode; description: string; center?: boolean }) { return <header className={center ? "ad-heading centered" : "ad-heading"}>{eyebrow ? <span className="ad-micro">{eyebrow}</span> : null}<h1>{title}</h1><p>{description}</p></header>; }
function Field({ label, value, setValue, suffix, placeholder, wide = false }: { label: string; value: string; setValue: (value: string) => void; suffix?: string; placeholder?: string; wide?: boolean }) { const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; return <label className={wide ? "ad-field wide" : "ad-field"} htmlFor={id}><span>{label}</span><div><input id={id} value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} />{suffix ? <small>{suffix}</small> : null}</div></label>; }
function RiskField({ value, setValue }: { value: RiskTolerance; setValue: (value: RiskTolerance) => void }) { return <fieldset className="ad-field ad-risk-field"><legend>Risk preference</legend><div role="radiogroup" aria-label="Risk preference">{(["low", "moderate", "high"] as RiskTolerance[]).map((option) => <button key={option} type="button" role="radio" aria-checked={value === option} className={value === option ? "active" : ""} onClick={() => setValue(option)}><span>{option[0].toUpperCase() + option.slice(1)}</span>{value === option ? <Check size={14} /> : null}</button>)}</div></fieldset>; }
function YourRules({ guardrails, open, onOpenChange, protocolRestriction, setProtocolRestriction, maxPrice, setMaxPrice, maxPriceAsset, setMaxPriceAsset, risk, setRisk, actionPolicy, setActionPolicy, isWalletTask }: { guardrails: TaskGuardrails; open: boolean; onOpenChange: (open: boolean) => void; protocolRestriction: string | null; setProtocolRestriction: (value: string | null) => void; maxPrice: string; setMaxPrice: (value: string) => void; maxPriceAsset: string; setMaxPriceAsset: (value: string) => void; risk: RiskTolerance; setRisk: (value: RiskTolerance) => void; actionPolicy: ActionPolicy; setActionPolicy: (value: ActionPolicy) => void; isWalletTask: boolean }) {
  const id = "your-rules-panel";
  return <section className={`ad-rules ${open ? "open" : ""}`} aria-label="Your rules"><header><div><strong>Your rules</strong>{!open ? <div className="ad-rules-summary">{rulesSummary(guardrails, true).map((line) => <span key={line}>{line}</span>)}</div> : <p>Your rules apply only to this task.</p>}</div><button type="button" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}>{open ? "Done" : "Edit"}</button></header>{open ? <div className="ad-rules-panel" id={id}><RiskField value={risk} setValue={setRisk} /><fieldset className="ad-rule-field"><legend>Allowed protocols</legend><div className="ad-rule-choice" role="radiogroup" aria-label="Protocol restriction"><button type="button" role="radio" aria-checked={protocolRestriction === null} className={protocolRestriction === null ? "active" : ""} onClick={() => setProtocolRestriction(null)}>Any protocol</button><button type="button" role="radio" aria-checked={protocolRestriction !== null} className={protocolRestriction !== null ? "active" : ""} onClick={() => setProtocolRestriction("")}>Limit to a protocol</button></div>{protocolRestriction !== null ? <label className="ad-rule-input" htmlFor="rule-protocol"><span>Allowed protocol</span><input id="rule-protocol" value={protocolRestriction} onChange={(event) => setProtocolRestriction(event.target.value)} placeholder="e.g. Venus" /></label> : null}</fieldset><fieldset className="ad-rule-field"><legend>Maximum hire price <small>Optional</small></legend><div className="ad-rule-price"><label htmlFor="rule-price"><span className="sr-only">Maximum hire price amount</span><input id="rule-price" inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Optional amount" /></label><label htmlFor="rule-price-asset"><span className="sr-only">Maximum hire price asset</span><input id="rule-price-asset" value={maxPriceAsset} onChange={(event) => setMaxPriceAsset(event.target.value)} placeholder="Asset" /></label></div></fieldset><fieldset className="ad-rule-field"><legend>Permission</legend><div className="ad-rule-choice" role="radiogroup" aria-label="Permission">{(["analysis-only", "propose-only", "approval-required"] as ActionPolicy[]).map((policy) => <button key={policy} type="button" role="radio" aria-checked={actionPolicy === policy} className={actionPolicy === policy ? "active" : ""} onClick={() => setActionPolicy(policy)}>{actionPolicy === policy ? <Check size={14} /> : null}{actionPolicyLabel(policy)}</button>)}</div></fieldset>{isWalletTask ? <p className="ad-rule-data"><ShieldCheck size={16} /><span><strong>Data</strong>{dataPolicyLabel(guardrails.dataPolicy)}</span></p> : null}</div> : null}</section>;
}
function ruleSummary(result: ComparedAudition): string { if (result.ruleEvaluation.status === "fits") return "The rules we could check were respected"; if (result.ruleEvaluation.status === "partial") return "One or more rules couldn’t be confirmed"; return "This candidate doesn’t meet your rules"; }
function RuleChecks({ checks, title, compact = false }: { checks: RuleCheck[]; title: string; compact?: boolean }) { return <section className={compact ? "ad-rule-checks compact" : "ad-rule-checks"}><h3>{title}</h3>{checks.map((check) => <div key={check.id} className={check.status}><span>{check.status === "pass" ? <Check size={15} /> : check.status === "unknown" ? <CircleHelp size={15} /> : <X size={15} />}</span><p><strong>{check.label}</strong><small>{check.summary}</small></p></div>)}</section>; }
function RulesSummary({ guardrails }: { guardrails: TaskGuardrails }) { return <section className="ad-hire-rules"><h3>Your rules</h3>{rulesSummary(guardrails).map((rule) => <span key={rule}>{rule}</span>)}<p>These are the rules this agent was tested against.</p></section>; }
function NoEligibleResult({ onEditRules, onTryAnotherTask }: { onEditRules: () => void; onTryAnotherTask: () => void }) { return <div className="ad-empty-result"><CircleAlert size={22} /><h2>No agent met all your rules.</h2><p>You can adjust your rules or try another task.</p><div className="ad-empty-actions"><button type="button" className="ad-primary" onClick={onEditRules}>Edit rules</button><button type="button" className="ad-secondary" onClick={onTryAnotherTask}>Try another task</button></div></div>; }
function ScreenActions({ back, primary, onPrimary }: { back: () => void; primary?: string; onPrimary?: () => void }) { return <div className="ad-screen-actions"><button type="button" className="ad-secondary" onClick={back}><ArrowLeft size={18} /> Back</button>{primary ? <button type="button" className="ad-primary" onClick={onPrimary}>{primary} <ArrowRight size={18} /></button> : null}</div>; }
function FeatureFooter() { return <div className="ad-feature-footer" id="how-it-works"><span><Zap aria-hidden="true" /><strong>Real agents</strong><small>Live on BNB Chain</small></span><span><ShieldCheck aria-hidden="true" /><strong>Tested for you</strong><small>We compare their answers</small></span><span><BarChart3 aria-hidden="true" /><strong>Clear results</strong><small>See who performed best</small></span><span><UserRoundCheck aria-hidden="true" /><strong>You stay in control</strong><small>Hire only when you’re ready</small></span></div>; }
function StreamActivity({ lines }: { lines: string[] }) { return <div className="ad-stream-activity">{lines.length ? lines.slice(-3).map((line, index) => <p key={`${line}-${index}`} className={index === lines.slice(-3).length - 1 ? "current" : ""}>{index === lines.slice(-3).length - 1 ? <Loader2 className="spin" size={15} /> : <Check size={15} />}{line}</p>) : <p className="current"><Loader2 className="spin" size={15} />Preparing the search…</p>}</div>; }
function StreamFailure({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) { return <div className="ad-stream-failure"><CircleAlert size={20} /><h2>{message}</h2><p>Try again, or adjust your task and rules.</p><div><button type="button" className="ad-secondary" onClick={onBack}>Edit details</button><button type="button" className="ad-primary" onClick={onRetry}>Try again</button></div></div>; }
function RaceRow({ entry, name }: { entry: RaceEntry; name?: string }) { const complete = entry.status === "completed"; const failed = entry.status !== "running" && !complete; return <div className="ad-race-row"><span className={`ad-race-dot ${complete ? "complete" : failed ? "failed" : "running"}`}>{complete ? <Check size={14} /> : failed ? <CircleAlert size={14} /> : <Loader2 className="spin" size={14} />}</span><div><strong>{name || "Selected agent"}</strong><small>{complete ? "Returned an answer" : entry.error || (failed ? entry.status === "timeout" ? "Took too long" : "Couldn’t finish" : "Testing…")}</small></div><b>{entry.latencyMs ? `${entry.latencyMs}ms` : statusLabel(entry.status)}</b></div>; }
function Reason({ title, detail }: { title: string; detail: string }) { return <div className="ad-reason"><Check size={19} /><span><strong>{title}</strong><small>{detail}</small></span></div>; }
function AgentRow({ result, name }: { result: ComparedAudition; name: string }) { return <div className="ad-agent-row"><span><strong>{name}</strong><small>{result.comparison.label}</small></span><small>{statusLabel(result.status)}</small></div>; }
function EmptyResult({ error }: { error: string | null }) { return <div className="ad-empty-result"><CircleAlert size={22} /><h2>We couldn’t compare an answer yet.</h2><p>{error || "Try the task again when live agent responses are available."}</p></div>; }
function statusLabel(status: RaceStatus) { if (status === "completed") return "Done"; if (status === "running") return "Testing"; if (status === "timeout") return "Couldn’t finish"; if (status === "unsupported") return "Unavailable"; return "Couldn’t finish"; }
