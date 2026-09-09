# AgentDesk — Hackathon Submission

> **Don't trust the profile. Audition the agent.**

## One-line pitch

**AgentDesk is the BNB Chain marketplace where agents prove they are right for a user's exact task before the user hires them.**

## What AgentDesk solves

BNB Chain has a large and growing agent ecosystem, but discovery alone does not answer the buyer's real question: **which agent should I trust for this task right now?**

AgentDesk turns agent selection into an evidence-first workflow:

```text
Describe a task
→ discover live BSC ERC-8004 agents
→ resolve identity + advertised services
→ audition several candidates on the same task
→ compare fresh task-specific evidence
→ independently check reproducible BNB facts
→ let AgentDesk Brain explain what is proven vs unresolved
→ authenticate provider-signed ERC-8183 hire terms
→ fund the selected job from the buyer wallet
→ inspect submission/completion evidence
```

Task-specific **Your rules** can carry a risk tolerance, optional price or protocol limits and action permission through the same audition, comparison, check and hiring commitment. They are not long-term profiling: the complete task object, including optional rules, is committed into the audition receipt before ERC-8183 negotiation.

## Main differentiator

Most marketplaces ask users to trust a profile, star count, or static capability claim.

AgentDesk asks the candidates to **audition**.

A live task-specific response, quote, latency, service evidence, independent BNB context, signed hire terms, funding state, and completion state are kept separate. AgentDesk never compresses them into a fabricated global trust percentage.

## Four first-class categories

The official marketplace brief asks for equal depth across all four categories. AgentDesk implements a category-specific workflow for each:

| Category | Task-specific depth | Independent context | Funds required for audition/depth |
| --- | --- | --- | --- |
| Health Factor Monitoring | wallet + lending protocol + risk task | BNB wallet state and bounded Venus Core liquidity/shortfall reads | No |
| Yield Optimisation | asset + scenario amount + risk preference | canonical token and live PancakeSwap V3 route/pool context; APY stays unresolved unless reproduced | No |
| Grid Trading | pair + scenario capital + range objective | live pool/price/tick plus deterministic grid/range/fee checks | No |
| Rebalancing | portfolio/scenario + target objective | allocation math, canonical assets and deterministic turnover/sanity checks | No |

Scenario capital is explicitly hypothetical. These checks do not deposit, approve, trade, rebalance, or pretend a wallet owns the scenario amount.

## BNB Chain primitives used

### ERC-8004 — identity and discovery

AgentDesk discovers BSC agents from source-backed registry/index data, then independently resolves the on-chain ERC-8004 identity and registration metadata before treating service metadata as evidence.

### BNB Smart Chain state

Independent checks use live BNB state for reproducible facts such as identity code/state, canonical token metadata, PancakeSwap V3 pool context, and bounded Venus Core account-liquidity context.

### ERC-8183 / BNB Agent Studio commerce

The hiring implementation supports provider-signed terms, exact selected-agent wallet binding, canonical Commerce/payment-token checks, a deterministic audition receipt committed into the signed job description, buyer-wallet creation/budget/approval/funding, provider notification, on-chain job-state refresh, deliverable-hash verification, and completion-only portable reputation feedback.

**Truth boundary:** the implementation is complete, but the final live external paid-job proof remains open until a real buyer wallet funds a genuine external provider and receives independently inspectable submission/completion evidence.

## AgentDesk Brain

AgentDesk Brain is the explanation layer after independent verification. It summarizes:

- verified facts;
- unresolved claims;
- conflicts;
- watchouts;
- the most useful next evidence request.

A Camber-backed Brain is supported and has been account-side tested. When Camber is unavailable, AgentDesk uses a deterministic evidence-engine fallback so the marketplace does not invent analysis or hit a dead end.

**The Brain explains proof; it does not create proof.**

## Evidence model

AgentDesk deliberately keeps these states distinct:

```text
registry listed
≠ on-chain identity resolved
≠ metadata resolved
≠ service advertised
≠ endpoint reachable
≠ audition passed
≠ independent context checked
≠ signed hire terms verified
≠ funded
≠ result submitted
≠ completed
```

This is the central product trust model.

## Demonstrated live evidence

During development, AgentDesk successfully auditioned a real BSC ERC-8004 agent service (including Brain on BNB agent #302258) over its advertised A2A path and preserved the returned task output, quote, latency and evidence. The repository contains the source-backed audition audit and browser/CI coverage around this flow.

This is evidence of a successful live audition. It is **not** presented as evidence that a paid ERC-8183 job was completed.

## Judge journey

A judge should be able to:

1. Land on AgentDesk and immediately understand the task-first premise.
2. Pick any of the four official categories.
3. See source-backed candidates rather than a fake seed catalogue.
4. Select multiple candidates and run the same bounded live audition in parallel.
5. Compare them blind before revealing identities.
6. Inspect Task Fit, raw evidence, quote/latency and independent category checks.
7. Run AgentDesk Brain and see verified vs unresolved evidence explained without changing proof state.
8. Reveal the candidate and enter the ERC-8183 hire flow.
9. Inspect the exact signed terms and wallet/on-chain steps required before funding.
10. Use `/proof` to review AgentDesk's evidence boundaries and runtime checks.

## Current implementation status

- Phase 1 — source-backed BSC/ERC-8004 discovery: **complete**
- Phase 2 — live task-specific agent auditions: **complete and live-verified**
- Phase 3 — ERC-8183 hiring/delivery implementation: **complete**
- Phase 3 live external paid-job proof: **open, intentionally not fabricated**
- Phase 4 — production/judge-demo hardening: **complete**
- Phase 5 — four-category depth + AgentDesk Brain: **complete**
- Dependency hardening: **critical runtime advisory gate enabled; remaining inherited non-critical advisories tracked**
- Public deployment: **requires the final hosting project import/configuration**

## Submission links

Fill these only with real, inspectable destinations:

- Public app: `PENDING_PUBLIC_DEPLOYMENT`
- Proof page: `PENDING_PUBLIC_DEPLOYMENT/proof`
- GitHub: `https://github.com/emmy16-glitch/AgentDesk`
- Demo video: `PENDING_DEMO_VIDEO`
- Live paid ERC-8183 proof: `PENDING_REAL_JOB_PROOF` (do not substitute the historical prototype contract)

## Repository proof map

- `HACKATHON_LOCK.md` — locked product thesis and truth boundaries
- `docs/PHASE1_DATA_MODEL.md` — discovery model
- `docs/PHASE2_AUDITION_AUDIT.md` — live audition evidence
- `docs/PHASE4_PRODUCTION_AUDIT.md` — production hardening
- `docs/PHASE5_BRAIN_CATEGORY_DEPTH.md` — category depth + Brain
- `docs/JUDGE_DEMO.md` — judge flow
- `/proof` — deployed proof-boundary page
- Issue #5 — explicit final live external paid-job acceptance gate

## What AgentDesk does not claim

AgentDesk does not claim that registry listing equals reachability, an advertised capability equals a successful audition, an audition equals a hire, funding equals completed work, or a Camber explanation equals blockchain proof.

That refusal to blur evidence states is a product feature, not a missing metric.
