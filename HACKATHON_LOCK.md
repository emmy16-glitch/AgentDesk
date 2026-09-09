# AgentDesk — Hackathon Product Lock

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

> Status: **LOCKED**
>
> This document is the source of truth for the BNB Chain hackathon build. Any new code, UI, copy, demo flow, or integration must support this direction. Do not replace it with a generic AI-agent marketplace, a static directory, or fabricated trust metrics.
>
> Implementation note (2026-09-09): the fabricated `data/agents.ts` catalogue and its judge-facing card/detail/hire surfaces are not part of the active marketplace. Real discovery begins from ERC-8004 / BSC sources. The public AgentDesk build is live on Vercel. The legacy `AgentTrustMarketplace` contract remains prototype infrastructure only.

## Product thesis

**AgentDesk is the BNB marketplace where agents prove they are right for a user's specific task before the user hires them.**

Primary line:

> **Don't trust the listing. Test the agent.**

Supporting line:

> Give AgentDesk the job. Find relevant agents. Test what they actually return. Check the evidence. Then decide who to hire.

## What problem we are solving

A user looking at an agent marketplace should not have to guess which agent is best from a profile card, follower count, generic badge, or unexplained score.

AgentDesk should answer the decision question:

> **Which live BNB agent is the best fit for this exact task, right now?**

The product must therefore combine:

1. real BSC agent identity/discovery;
2. current, decision-quality agent data;
3. task-specific auditions, results or capability responses;
4. transparent comparison;
5. a real on-chain hire/job path;
6. delivery/result visibility.

## Current public truth state

The production marketplace is live at:

https://agentdesk-bnb-eight.vercel.app/

The current production Grid Trading recording reached a **LIVE CAPABILITY MATCH** and then continued to Hire.

That state means a live agent confirmed it could provide the requested service. It does **not** mean the task was completed, a trade was executed, money moved, or a paid ERC-8183 job completed.

```text
Capability confirmed
≠ Task completed
≠ Agent hired
≠ Job funded
≠ Paid job completed
```

This distinction is part of the product's evidence model and must remain visible in copy, UI, demos and submission material.

## Hackathon alignment

The main build must optimize for the published marketplace criteria:

### Functionality

The complete intended flow is:

```text
LAND
→ DESCRIBE / SELECT A TASK
→ DISCOVER RELEVANT LIVE AGENTS
→ TEST / AUDITION
→ COMPARE
→ CHECK EVIDENCE
→ HIRE
→ RECEIVE / VERIFY RESULT
```

No dead-end cards. No fake hire completion. A demo must show only the states the real system actually reaches.

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
- capability/service response;
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

If data cannot be proven, remove it or label the boundary clearly.

### Agent diversity

All four required categories must be first-class product experiences, not cosmetic tabs:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Each category must have meaningful discovery data and a task-specific decision/evidence surface.

## Core differentiator: Live Agent Testing

AgentDesk must not differentiate itself with a generic "trust score".

The differentiator is **task-specific testing before hire**.

A listing answers:

> What does this agent claim it can do?

A live test answers:

> What did this agent actually return for my task right now?

The result can be a genuine task result, a capability/service offer, an unsupported response, a timeout, or an error. Those states must stay distinct.

### Example user journey

```text
User: "I have 500 USDC. Find a good BNB Chain yield strategy."

AgentDesk
→ discovers eligible live agents
→ filters by required capability
→ requests a bounded read-only audition / capability check
→ gathers comparable outputs
→ displays provenance and freshness
→ explains why candidates rank differently
→ user chooses whether to hire the selected agent
→ ERC-8183 job / payment path begins only after confirmation
→ result is surfaced when real delivery evidence exists
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

- proposed grid parameters or service capability;
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

Target/current architecture:

```text
ERC-8004 / 8004scan / BSC agent sources
              ↓
      AgentDesk discovery layer
              ↓
category + capability + network + provenance
              ↓
         live testing layer
       /         |          \
  Agent A     Agent B     Agent C
       \         |          /
             compare
                ↓
              check
                ↓
              hire
                ↓
        ERC-8183 / real job path
                ↓
             result
```

### Discovery rules

- Only present agents as live/real when the exact supporting state is available.
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
✓ endpoint/service reachable
✓ price within user budget when a real quote exists
✓ relevant source/reputation evidence when available
✓ live task response or capability response returned
✓ response fresh enough for this task
```

Prefer labels such as:

- BEST FIT
- STRONG FIT
- PARTIAL FIT
- NOT ENOUGH EVIDENCE

If a numerical score is ever used, the formula and inputs must be inspectable.

## Hiring / commerce lock

The custom `AgentTrustMarketplace.hireAgent()` contract is prototype activation infrastructure. It must **not** be represented as proof that an actual external agent performed a job unless that is genuinely true.

Target hiring path:

```text
candidate selected
→ current provider terms confirmed
→ real agent job / commerce request
→ wallet approval / funding
→ on-chain job reference
→ agent work
→ deliverable / result
→ settlement / completion evidence
```

Use the native BNB Agent Studio / ERC-8183 commerce path where practical.

The existing custom contract can remain for compatibility, experimentation, analytics, referral events, or historical prototype context, but must not be confused with real agent-service delivery.

## ERC-8004 lock

ERC-8004 is not a marketing badge.

If the UI says an agent has ERC-8004 identity evidence, AgentDesk must be able to show the actual identity / source reference.

Required direction:

- integrate a real ERC-8004 / 8004scan data source;
- surface actual BSC agent identity;
- retain source IDs in the data model;
- link identity and reputation data where available;
- remove static claims that cannot be backed by the source.

## Static catalogue status

The original `data/agents.ts` seed catalogue is not part of the active marketplace path.

The old hard-coded trust scores, user counts, uptime, performance duration and generic verification flags must not be recreated in judge-facing code unless a real source supports the exact claim.

Historical prototype concepts belong in git history, not as marketplace inventory presented as live truth.

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

The primary UX is task-first:

```text
Ask → Details → Test → Best Match → Check → Hire
```

## Comparison surface

Agent comparison must favor decision-quality evidence over decorative metrics.

Candidate comparison may include:

| Field | Requirement |
| --- | --- |
| Agent identity | real source / ID |
| Network | BSC / supported chain |
| Capability match | evidence-backed |
| Endpoint/service status | live check |
| Test result | current task-specific output or clearly labelled capability response |
| Quote / price | current value when genuinely supplied |
| Response latency | measured |
| Reputation | sourced where available |
| Last activity | sourced where available |
| Data freshness | timestamp |
| Why ranked here | explainable reasons |

## Truthfulness rules

These are non-negotiable.

Do not claim:

- 200K+ agents are directly integrated unless actually discovered/usable;
- an agent was hired if only prototype activation occurred;
- an agent performed a task when it only confirmed capability;
- a trade was executed when no trade occurred;
- money moved when it did not;
- a metric is live when it is static;
- a trust score is objective when it is internally invented;
- ERC-8004 verification without a real identity/source;
- ERC-8183 commerce completion without a genuine completed job flow;
- production readiness without evidence.

Preferred language:

- "registry listed" when that is the evidence;
- "endpoint/service reachable" when reachability is the evidence;
- "live capability confirmed" for a real capability/service response;
- "task result" only when a task-specific result was actually returned;
- "task fit" for explainable ranking;
- "funded" only for a funded job;
- "completed" only when the actual paid-job completion state/evidence supports it.

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
- comparison;
- freshness/provenance UI;
- clear recommendation without hiding evidence.

### Phase 4 — Real hire implementation

- implement the ERC-8183 / Agent Studio job path;
- wallet approval/funding controls;
- job reference/state;
- delivery/result verification;
- completion proof boundary.

The implementation exists. A genuine external paid completion remains a separate live proof gate and must not be fabricated.

### Phase 5 — Four-category depth

- ensure every required category has a meaningful working path;
- remove cosmetic-only categories;
- add category-specific task forms and evidence checks.

### Phase 6 — Production/judge hardening

- public deployment;
- browser QA;
- mobile QA;
- failure-state QA;
- source links;
- no secrets in browser/source;
- reproducible demo script;
- README/docs updated to current reality.

**Status:** public production deployment is live at `https://agentdesk-bnb-eight.vercel.app/`.

### Phase 7 — Optional partner tracks

Only after the main marketplace path is strong:

- Altana scoped-agent wallet execution;
- TermiX Agent Advantage evidence/report;
- PancakeSwap-specific measurable benefit.

Do not claim these optional partner requirements as complete unless their actual required evidence exists.

## Demo lock

The demo should prove the strongest truthful story the live system actually reaches:

```text
1. User states a real task
2. AgentDesk discovers relevant BSC agents
3. Compatible candidates are tested
4. Results/capability responses are compared using current evidence
5. User sees what is proven and what is still missing
6. User can continue toward Hire
7. Paid-job execution/completion is shown only when it genuinely exists
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

Public product: `https://agentdesk-bnb-eight.vercel.app/`

Do not switch between AgentTrust / AgentDesk in judge-facing product copy unless there is an intentional product rename and the repository is updated consistently.

## Final positioning

### One line

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

### Product tagline

> **Don't trust the listing. Test the agent.**

### Expanded pitch

> AgentDesk starts with the user's task, discovers relevant BNB agents, tests compatible candidates on that task, compares fresh evidence, checks what can be independently reproduced, and lets the user decide who to hire. Instead of asking users to trust a static listing or unexplained score, AgentDesk makes the selection decision observable and task-specific.

## Change-control rule

This file is intentionally strict.

Before adding a major feature, ask:

1. Does it improve functionality, data quality, or four-category depth?
2. Does it make the discovery → test → compare → check → hire → result flow stronger?
3. Is every claim provable?
4. Would this make sense in an official BNB Agent Studio marketplace?

If the answer is no, defer it.

Any intentional change to this locked direction should update this document in the same commit and explain why.
