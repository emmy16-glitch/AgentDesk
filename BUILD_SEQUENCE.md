# AgentDesk Build Sequence

This file turns `HACKATHON_LOCK.md` into an execution order.

## Completed

1. Phase 1 — real BSC agent discovery and provenance
2. Phase 2 — Live Agent Auditions

Phase 2 crossed its live gate in AgentDesk CI run 76 with real BSC ERC-8004 identity `#302258`: the registered A2A service completed a read-only Grid Trading audition/quote, returned output and a quote, preserved three evidence items, and measured 40 ms service latency in that run.

## Now

1. Phase 3 — one genuine ERC-8183 / Agent Studio job end-to-end
2. Expand the same working model across all four required categories where deeper execution adapters are needed
3. Public deployment, browser/mobile QA, failure-state QA and judge-demo hardening

## Gates

Do not start the next phase until the previous phase is truthful enough to support it.

### Phase 1 gate — passed

- real BSC agents are being ingested from a real source;
- source IDs/provenance are preserved;
- static metrics are removed or clearly labelled;
- all claims shown to judges are defensible.

### Phase 2 gate — passed

- at least one real candidate can be auditioned on a task;
- raw result, latency, freshness, quote and failure state are preserved;
- Task Fit is explainable;
- the task-first UI can audition several discovered candidates and compare observable evidence without a global trust score.

### Phase 3 gate

- at least one selected agent can be hired through a genuine job/commerce flow;
- the agent actually returns a result/deliverable;
- an independently inspectable job/transaction reference exists.

## GitHub execution issues

- #3 — Phase 1: real BSC agent discovery — completed
- #4 — Phase 2: Live Agent Auditions — completed by PR #7 after merge
- #5 — Phase 3: genuine on-chain agent job — next

`HACKATHON_LOCK.md` remains the product source of truth. This file only defines build order.
