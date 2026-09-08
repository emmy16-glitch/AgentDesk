# AgentDesk — Hackathon Product Lock

> Status: **LOCKED**
>
> This document is the source of truth for the BNB Chain hackathon build. Any new code, UI, copy, demo flow, or integration must support this direction. Do not replace it with a generic AI-agent marketplace, a static directory, or fabricated trust metrics.
>
> Implementation note (2026-09-08): the original fabricated `data/agents.ts` catalogue and its judge-facing card/detail/hire surfaces have been removed from the active source tree. Real discovery now begins from ERC-8004 / BSC sources. The legacy `AgentTrustMarketplace` contract remains prototype infrastructure only.

## Product thesis

**AgentDesk is the BNB marketplace where agents prove they are right for a user's specific task before the user hires them.**

Primary line:

> **Don't trust the profile. Audition the agent.**

Supporting line:

> Discover live BNB agents. Audition them on your task. Compare real results. Hire the winner on-chain.

## What problem we are solving

A user looking at an agent marketplace should not have to guess which agent is best from a profile card, follower count, generic badge, or unexplained score.

AgentDesk should answer the decision question:

> **Which live BNB agent is the best fit for this exact task, right now?**

The product must therefore combine:

1. real BSC agent identity/discovery;
2. current, decision-quality agent data;
3. task-specific auditions or quotes;
4. transparent comparison;
5. a real on-chain hire/job path;
6. delivery/result visibility.

## Hackathon alignment

The main build must optimize for the published marketplace criteria:

### Functionality

The complete flow must work:

```text
LAND
→ DESCRIBE / SELECT A TASK
→ DISCOVER RELEVANT LIVE AGENTS
→ AUDITION / QUOTE
→ COMPARE
→ HIRE
→ RECEIVE / VERIFY RESULT
```

No dead-end cards. No fake hire completion. A successful demo must show a complete user journey.

### Data quality

Every meaningful metric shown to the user must have provenance.

Allowed examples:

- ERC-8004 identity / registration;
- serving network;
- declared capabilities;
- recent activity;
- reputation / feedback from a real source;
- endpoint liveness;
- live response latency;
- current quote / price;
- audition output;
- quote expiry;
- actual completed job evidence;
- timestamp / "checked X seconds ago".

Not allowed unless backed by a real source:

- invented trust percentages;
- invented active-user counts;
- invented uptime;
- invented months of performance;
- fake verification badges;
- fake completed-job counts;
- fabricated APY/performance data.

If data cannot be proven, remove it or label it clearly as sample/demo data.

### Agent diversity

All four required categories must be first-class product experiences, not cosmetic tabs:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Each category must have meaningful discovery data and a task-specific audition/decision surface.

## Core differentiator: Live Agent Auditions

AgentDesk must not differentiate itself with a generic "trust score".

The differentiator is **task-specific auditioning**.

A profile answers:

> Is this generally a reputable agent?

An audition answers:

> Is this agent a good choice for my exact task right now?

### Example user journey

```text
User: "I have 500 USDC. Find a good BNB Chain yield strategy."

AgentDesk
→ discovers eligible live agents
→ filters by required capability
→ requests a bounded read-only audition / quote
→ gathers comparable outputs
→ displays provenance and freshness
→ explains why candidates rank differently
→ user hires the selected agent
→ real job / payment path executes
→ result is surfaced back to the user
```

## Category audition contracts

### Health Factor Monitoring

User supplies:

- wallet / account;
- protocol if known;
- desired alert or monitoring goal.

Audition should surface, where supported:

- protocol coverage;
- current position / health-factor understanding;
- alert capability;
- response latency;
- quote / price;
- data source and timestamp.

### Yield Optimisation

User supplies:

- asset;
- amount;
- risk preference if required.

Audition should surface, where supported:

- proposed route / opportunity;
- estimated yield with provenance;
- supported protocol;
- assumptions / risk notes;
- quote / price;
- timestamp.

### Grid Trading

User supplies:

- token pair;
- capital;
- optional price range / risk preference.

Audition should surface, where supported:

- proposed grid parameters;
- assumptions;
- supported venue;
- expected fees / quote;
- live market context source;
- timestamp.

### Rebalancing

User supplies:

- wallet / portfolio / LP position;
- target or objective.

Audition should surface, where supported:

- proposed allocation / range adjustment;
- actions the agent would take;
- assumptions;
- quote / price;
- supported protocol;
- timestamp.

## Discovery architecture

The source of truth is **not** a static local agent catalogue.

Target architecture:

```text
ERC-8004 / 8004scan / BSC agent sources
              ↓
      AgentDesk discovery index
              ↓
category + capability + network + reputation
              ↓
         live audition layer
       /         |          \
  Agent A     Agent B     Agent C
       \         |          /
             compare
                ↓
              hire
                ↓
        ERC-8183 / real job path
                ↓
             result
```

### Discovery rules

- Only present agents as live/real when their BSC identity or endpoint can be verified.
- Store and show source identifiers.
- Preserve raw source data separately from derived ranking data.
- Every derived field must be explainable.
- Never silently convert missing data into a positive score.

## Ranking philosophy

AgentDesk may compute **Task Fit**, but not an unexplained global trust score.

A Task Fit result must be explainable with factors such as:

```text
✓ required capability supported
✓ correct BSC network / identity
✓ endpoint live
✓ recent relevant activity
✓ price within user budget
✓ recent reputation evidence
✓ audition completed successfully
✓ response fresh enough for this task
```

Prefer labels such as:

- BEST FIT
- STRONG FIT
- PARTIAL FIT
- NOT ENOUGH EVIDENCE

If a numerical score is ever used, the formula and inputs must be inspectable.

## Hiring / commerce lock

The current custom `AgentTrustMarketplace.hireAgent()` contract is a prototype activation mechanism. It must **not** be represented as proof that an actual external agent performed a job unless that is genuinely true.

Target hiring path:

```text
candidate selected
→ current quote confirmed
→ real agent job / commerce request
→ wallet approval / funding
→ on-chain job reference
→ agent work
→ deliverable / result
→ settlement / completion evidence
```

Use the native BNB Agent Studio / ERC-8183 commerce path where practical.

The existing custom contract can remain for compatibility, experimentation, analytics, referral events, or fallback demo infrastructure, but must not be confused with real agent-service delivery.

## ERC-8004 lock

ERC-8004 is not a marketing badge.

If the UI says an agent is ERC-8004-backed or verified, AgentDesk must be able to show the actual identity / source reference.

Required direction:

- integrate a real ERC-8004 / 8004scan data source;
- surface actual BSC agent identity;
- retain source IDs in the data model;
- link identity and reputation data where available;
- remove static claims that cannot be backed by the source.

## Static catalogue status

The original `data/agents.ts` seed catalogue has been **removed from the active source tree**.

The old hard-coded trust scores, user counts, uptime, performance duration and generic verification flags must not be recreated in judge-facing code unless a real source supports the exact claim.

Historical prototype concepts belong in git history, not as importable marketplace inventory.

## UX lock

The marketplace home should optimize for the user's job, not for Web3 protocol terminology.

Preferred first question:

> **What do you want an agent to do?**

A judge/user should not need prior knowledge of ERC-8004, ERC-8183, x402, MCP, A2A, or Agent Studio in order to use the product.

Protocol details belong in:

- evidence drawers;
- provenance panels;
- transaction details;
- developer / advanced views.

The primary UX is task-first.

## Comparison surface

Agent comparison must favor decision-quality evidence over decorative metrics.

Candidate comparison may include:

| Field | Requirement |
| --- | --- |
| Agent identity | real source / ID |
| Network | BSC / supported chain |
| Capability match | evidence-backed |
| Endpoint status | live check |
| Audition result | current task-specific output |
| Quote / price | current value |
| Response latency | measured |
| Reputation | sourced |
| Last activity | sourced |
| Data freshness | timestamp |
| Why ranked here | explainable reasons |

## Truthfulness rules

These are non-negotiable.

Do not claim:

- 200K+ agents are directly integrated unless actually discovered/usable;
- an agent was hired if only our activation registry was called;
- an agent performed a task if no result was returned;
- a metric is live when it is static;
- a trust score is objective when it is internally invented;
- ERC-8004 verification without a real identity/source;
- ERC-8183 commerce without a genuine job flow;
- production readiness without evidence.

Preferred language:

- "live BSC agent" only when verified;
- "audition" only when a real request/check was executed;
- "sample" when using demonstration data;
- "prototype activation" for the current custom contract;
- "task fit" for explainable ranking.

## Build order

### Phase 0 — Truth cleanup

- remove or label fabricated/static judge-facing metrics;
- align product name and copy;
- make current capabilities vs planned capabilities explicit.

### Phase 1 — Real discovery

- integrate 8004scan / ERC-8004 source;
- ingest real BSC agent identities;
- map capabilities/categories;
- show provenance and freshness;
- populate all four required categories with real candidates where available.

### Phase 2 — Audition engine

- define a normalized audition request/result interface;
- implement category-specific adapters;
- add timeout/error/unsupported states;
- measure latency;
- preserve raw audition evidence;
- explain Task Fit.

### Phase 3 — Compare UX

- task-first home flow;
- candidate shortlist;
- side-by-side comparison;
- freshness/provenance UI;
- clear winner recommendation without hiding evidence.

### Phase 4 — Real hire

- implement at least one true ERC-8183 / Agent Studio job end-to-end;
- wallet approval;
- job reference;
- delivery/result;
- completion proof.

### Phase 5 — Four-category depth

- ensure every required category has a meaningful working path;
- remove cosmetic-only categories;
- add category-specific task forms and audition outputs.

### Phase 6 — Production/judge hardening

- public deployment;
- browser QA;
- mobile QA;
- failure-state QA;
- source links;
- no secrets in browser/source;
- reproducible demo script;
- README/docs updated to current reality.

### Phase 7 — Optional partner tracks

Only after the main marketplace path is strong:

- Altana scoped-agent wallet execution;
- TermiX Agent Advantage evidence/report;
- PancakeSwap-specific measurable benefit.

Do not weaken the main track by implementing several incomplete bounty integrations.

## Demo lock

The final demo should prove this exact story:

```text
1. User states a real task
2. AgentDesk discovers live BSC agents
3. Multiple candidates are auditioned / checked
4. Results are compared using current evidence
5. User sees why one agent is the best fit
6. User hires it through a real on-chain job path
7. Agent returns a result / deliverable
8. AgentDesk shows proof, source, and transaction/job reference
```

Do not make the demo primarily about:

- scrolling marketplace cards;
- static trust scores;
- wallet connection alone;
- a transaction that does not invoke a real service;
- unsupported claims.

## Naming

Primary product name: **AgentDesk**

Repository: `emmy16-glitch/AgentDesk`

Do not switch between AgentTrust / AgentDesk in judge-facing product copy unless we intentionally decide to rename the product and update the repository consistently.

## Final positioning

### One line

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

### Product tagline

> **Don't trust the profile. Audition the agent.**

### Expanded pitch

> AgentDesk discovers live BNB agents, tests them against the user's specific task, compares fresh evidence and quotes, explains why each candidate fits, and lets the user hire the selected agent on-chain. Instead of asking users to trust a static profile or unexplained score, AgentDesk makes the hiring decision observable and task-specific.

## Change-control rule

This file is intentionally strict.

Before adding a major feature, ask:

1. Does it improve functionality, data quality, or four-category depth?
2. Does it make the discovery → audition → compare → hire → result flow stronger?
3. Is every claim provable?
4. Would this make sense in an official BNB Agent Studio marketplace?

If the answer is no, defer it.

Any intentional change to this locked direction should update this document in the same commit and explain why.
