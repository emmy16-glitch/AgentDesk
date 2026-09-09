# AgentDesk Build Sequence

This file turns `HACKATHON_LOCK.md` into an execution order.

## Completed

1. Phase 1 — real BSC agent discovery and provenance
2. Phase 2 — Live Agent Auditions
3. Phase 3 implementation — genuine ERC-8183 hiring, funding, delivery verification and portable completion evidence
4. Phase 4 — production + judge-demo hardening

Phase 2 crossed its live gate with real BSC ERC-8004 identity `#302258`: the registered A2A service completed a bounded pre-hire audition/quote and preserved real response evidence.

Phase 3 implementation is merged. Its remaining acceptance gate is deliberately external: one real connected buyer must fund a genuine provider, receive the work, and preserve an independently inspectable ERC-8183 job/delivery/completion reference. Issue #5 stays open until that happens.

## Now — Phase 5

The previously deferred equal-depth pass is active and implemented around a zero-funds/read-only evidence model:

1. Health Factor Monitoring — BNB wallet context + Venus Core account-liquidity/shortfall evidence
2. Yield Optimisation — canonical token + live PancakeSwap V3 route/pool context while APY remains unverified unless reproducible
3. Grid Trading — live market context + machine-readable range/grid/fee-tier checks
4. Rebalancing — allocation arithmetic, canonical target assets and scenario-turnover checks
5. AgentDesk Brain — explains verified/unresolved/conflicting evidence after independent checks; Camber is optional and cannot change proof state
6. Complete the outstanding real Phase 3 proof run when a buyer wallet/provider is available
7. Public deployment + final hackathon submission packaging

Yield/Grid amounts are scenario capital only. Phase 5 does not require deposits, approvals, orders, trades or four paid jobs.

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

### Phase 4 production/demo hardening gate — passed

- production build exposes bounded liveness/readiness probes;
- no upstream outage creates a fabricated fallback;
- security headers and production smoke checks are CI-gated;
- desktop/tablet/mobile QA stays green;
- timeout/unsupported/error states remain visible and cannot become BEST FIT;
- judges can inspect the evidence vocabulary and runtime proof boundaries directly.

### Phase 5 category-depth gate

- all four task families expose category-specific independent checks;
- precise numerical claims are tested only when machine-readable rather than inferred from prose;
- Yield/Grid scenario capital is clearly non-custodial and requires no funds;
- APY, future profitability and unsupported protocol claims remain unresolved rather than being upgraded by UI language;
- AgentDesk Brain runs only after independent verification and cannot mutate verification/identity/job state;
- Camber outage/unavailability falls back to a clearly labelled deterministic evidence engine;
- browser QA proves the Brain explanation does not manufacture proof.

## GitHub execution issues

- #3 — Phase 1: real BSC agent discovery — completed
- #4 — Phase 2: Live Agent Auditions — completed
- #5 — Phase 3: genuine on-chain agent job — implementation merged; real external proof still open

`HACKATHON_LOCK.md` remains the product source of truth. This file only defines current execution order.
