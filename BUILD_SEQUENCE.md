# AgentDesk Build Sequence

This file turns `HACKATHON_LOCK.md` into an execution order.

## Completed

1. Phase 1 — real BSC agent discovery and provenance
2. Phase 2 — Live Agent Auditions
3. Phase 3 implementation — genuine ERC-8183 hiring, funding, delivery verification and portable completion evidence

Phase 2 crossed its live gate with real BSC ERC-8004 identity `#302258`: the registered A2A service completed a bounded pre-hire audition/quote and preserved real response evidence.

Phase 3 implementation is merged. Its remaining acceptance gate is deliberately external: one real connected buyer must fund a genuine provider, receive the work, and preserve an independently inspectable ERC-8183 job/delivery/completion reference. Issue #5 stays open until that happens.

## Now

The four-category depth pass is temporarily deferred by product decision. The active work is:

1. Public deployment readiness and runtime observability
2. Browser/mobile and transparent failure-state QA
3. Judge-demo hardening and proof surfaces
4. Complete the outstanding real Phase 3 proof run when a buyer wallet/provider is available
5. Return to equal-depth hardening across Health Factor Monitoring, Yield Optimisation, Grid Trading and Rebalancing

## Gates

### Phase 1 gate — passed

- real BSC agents are ingested from a real source;
- source IDs/provenance are preserved;
- static metrics are removed or clearly labelled;
- all claims shown to judges are defensible.

### Phase 2 gate — passed

- at least one real candidate can be auditioned on a task;
- raw result, latency, freshness, quote and failure state are preserved;
- Task Fit is explainable;
- the task-first UI can audition several discovered candidates and compare observable evidence without a global trust score.

### Phase 3 implementation gate — passed

- provider-signed ERC-8183 terms are verified before funding;
- the selected provider is bound to its ERC-8004 agent wallet;
- audition receipt commitments survive into provider-signed/on-chain terms;
- buyer-wallet funding uses the canonical Commerce/Router flow;
- delivery verification can reproduce the provider manifest hash against on-chain evidence;
- completion reputation is blocked unless the paid job and delivery both verify.

### Phase 3 live-proof gate — open (#5)

- one real selected external agent is funded;
- that agent performs the requested work;
- a deliverable/result is returned;
- an independently inspectable job/payment/delivery/completion reference exists.

### Production/demo hardening gate

- production build exposes bounded liveness/readiness probes;
- no upstream outage creates a fabricated fallback;
- security headers and production smoke checks are CI-gated;
- desktop/tablet/mobile QA stays green;
- timeout/unsupported/error states remain visible and cannot become BEST FIT;
- judges can inspect the evidence vocabulary and runtime proof boundaries directly.

## GitHub execution issues

- #3 — Phase 1: real BSC agent discovery — completed
- #4 — Phase 2: Live Agent Auditions — completed
- #5 — Phase 3: genuine on-chain agent job — implementation merged; real external proof still open

`HACKATHON_LOCK.md` remains the product source of truth. This file only defines current execution order.
