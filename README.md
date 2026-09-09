# AgentDesk

**Don't trust the profile. Audition the agent.**

AgentDesk is a BNB Chain AI-agent marketplace built around a task-first hiring flow:

```text
Describe a task
→ discover relevant BSC ERC-8004 agents
→ verify identity + advertised services
→ audition / quote candidates
→ compare fresh evidence
→ run category-specific independent checks
→ let AgentDesk Brain explain the proof boundary
→ authenticate ERC-8183 hire terms
→ fund the selected job on-chain
→ receive and verify the result
```

The hackathon product and architecture direction is locked in [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md). Treat that file as the source of truth before making product, UI, data, or integration changes.

## Current status

### Phase 1 — real discovery ✅

The active marketplace uses source-backed BSC/ERC-8004 discovery instead of a fabricated seed catalogue. It preserves source provenance, freshness, identity-registry reads, registration metadata, advertised services and truthful discovery failures.

See [`docs/PHASE1_DATA_MODEL.md`](./docs/PHASE1_DATA_MODEL.md) and [`docs/PHASE1_CANDIDATE_AUDIT.md`](./docs/PHASE1_CANDIDATE_AUDIT.md).

### Phase 2 — Live Agent Auditions ✅

AgentDesk leads with **“What do you want an agent to do?”** and can audition several discovered candidates through their real advertised A2A services. It preserves measured latency, timestamps, quotes, raw evidence and transparent timeout/error/unsupported states, then ranks candidates using explainable Task Fit rather than a fabricated global Trust Score.

Phase 2 was live-verified against ERC-8004 agent `#302258`. See [`docs/PHASE2_AUDITION_AUDIT.md`](./docs/PHASE2_AUDITION_AUDIT.md).

### Phase 3 — genuine ERC-8183 hiring implementation ✅

The production code supports deterministic audition receipts, strict selected-agent wallet binding, provider-signed ERC-8183 negotiation, buyer-wallet funding, provider notification, on-chain job-state refresh, deliverable-hash verification and completion-only ERC-8004 reputation feedback.

**Issue #5 remains open as the live proof gate** until a real connected buyer wallet funds an external provider, that provider performs the task, and the resulting job/delivery/completion references can be independently inspected. AgentDesk does not call `FUNDED` a completed hire.

### Phase 4 — production + judge-demo hardening ✅

Production hardening includes security headers, liveness/readiness endpoints, judge-facing `/proof/`, installable manifest, global failure handling, production smoke checks, responsive browser QA, deployment runbooks and explicit failure-state testing.

See [`docs/PRODUCTION_RUNBOOK.md`](./docs/PRODUCTION_RUNBOOK.md) and [`docs/JUDGE_DEMO.md`](./docs/JUDGE_DEMO.md).

### Phase 5 — AgentDesk Brain + four-category depth

The four task families now have category-specific verification paths that do **not** require trading capital:

- **Health Factor Monitoring:** read-only BNB wallet context + Venus Core liquidity/shortfall checks;
- **Yield Optimisation:** canonical token + live PancakeSwap V3 route/pool context, while APY remains unverified unless independently reproducible;
- **Grid Trading:** live pool/price context + deterministic machine-readable range/grid-count/fee-tier checks;
- **Rebalancing:** target-allocation math, canonical target assets and scenario-turnover checks.

Yield/Grid amounts are **scenario capital only**. No deposit, approval, order, trade or rebalance is executed by category-depth checks.

Agents are asked to optionally expose precise claims in an `agentdesk` JSON block. Prose-only answers remain usable, but AgentDesk will not invent numerical parameters just to make them easier to score.

After independent checks, **AgentDesk Brain** explains verified facts, unresolved claims, conflicts, watchouts and the best next question. When a Camber Brain is configured, Camber powers that explanation. Otherwise AgentDesk uses a deterministic evidence-engine fallback. Either way, the Brain cannot change proof state.

See [`docs/PHASE5_BRAIN_CATEGORY_DEPTH.md`](./docs/PHASE5_BRAIN_CATEGORY_DEPTH.md) and [`camber/agentdesk-brain/`](./camber/agentdesk-brain/).

## Evidence vocabulary

AgentDesk deliberately separates these states:

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

A generic “verified agent” label is not used as a substitute for those distinct proofs.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Optional/server-side configuration:

```text
SCAN8004_API_KEY=          # higher 8004scan rate limits
BSC_MAINNET_RPC_URL=       # direct ERC-8004/category verification reads
BSC_TESTNET_RPC_URL=       # only if a genuine quoted job targets BSC testnet
CAMBER_API_KEY=            # server-only Camber CLI credential
CAMBER_BRAIN_ENABLED=false # deterministic evidence engine works without Camber
CAMBER_BRAIN_AGENT_TAG=    # e.g. @owner.agentdesk-brain
CAMBER_CLI_PATH=camber     # optional path override
```

Useful verification commands:

```bash
npm run typecheck
npm run contract:compile
npm run build
npm run test:production-smoke   # run while the production server is up
npm run test:ui
```

## Camber integration boundary

`POST /api/assistant` remains the older HealthGuard assistant integration. Phase 5 adds a separate `/api/brain/analyse` path for AgentDesk Brain.

Camber Brain is an explanatory layer only. A Camber agent tag does not count as ERC-8004 marketplace identity, liveness, Task Fit, hiring evidence, transaction evidence or job completion.

The source-controlled Camber Context Bundle lives in `camber/agentdesk-brain/`. Creating/syncing the actual account-side Camber agent requires an authenticated Camber account/CLI or MCP session.

## Historical prototype contract

`contracts/AgentTrustMarketplace.sol` remains historical BSC Testnet activation infrastructure only. It is not evidence of an external agent job and is not the active ERC-8183 hiring path.

## Product positioning

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

See [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md) for the locked product thesis, truthfulness rules, demo requirements and change-control rules.
