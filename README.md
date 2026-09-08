# AgentDesk

**Don't trust the profile. Audition the agent.**

AgentDesk is a BNB Chain AI-agent marketplace built around a task-first hiring flow:

```text
Describe a task
→ discover relevant BSC ERC-8004 agents
→ verify identity + advertised services
→ audition / quote candidates
→ compare fresh evidence
→ hire the best fit on-chain
→ receive the result
```

The hackathon product and architecture direction is locked in [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md). Treat that file as the source of truth before making product, UI, data, or integration changes.

## Current status — Phases 1 and 2 complete

### Phase 1 — real discovery

The active judge-facing marketplace no longer uses the original fabricated seed catalogue. Discovery and agent details come from source-backed BSC/ERC-8004 evidence.

Implemented:

- server-side ERC-8004 discovery through 8004scan, scoped to BNB Smart Chain mainnet (`chainId 56`);
- evidence-backed classification into Health Factor Monitoring, Yield Optimisation, Grid Trading and Rebalancing;
- source provenance and freshness timestamps;
- direct reads from the BSC ERC-8004 Identity Registry;
- `tokenURI`, owner, agent-wallet, registration metadata and advertised-service resolution;
- bounded HTTPS reachability probes with local/private targets blocked;
- no silent fallback to fabricated marketplace agents when discovery fails;
- the original fake catalogue and fake trust/uptime/user-count surfaces removed from the active source tree.

See [`docs/PHASE1_DATA_MODEL.md`](./docs/PHASE1_DATA_MODEL.md) and [`docs/PHASE1_CANDIDATE_AUDIT.md`](./docs/PHASE1_CANDIDATE_AUDIT.md).

### Phase 2 — live agent auditions

AgentDesk now leads with **“What do you want an agent to do?”** rather than a generic directory.

Implemented:

- normalized audition request/result contracts for all four required task families;
- category-specific, bounded read-only audition prompts;
- live A2A Agent Card/service resolution from ERC-8004-advertised services;
- synchronous A2A `message/send` auditions where supported;
- structured-data and live service-offer/quote normalization;
- measured latency, timestamps, quotes, raw evidence and transparent timeout/error/unsupported states;
- batch auditioning of up to four real discovered candidates;
- explainable Task Fit and comparison ordering based only on observable evidence;
- task-first candidate selection and side-by-side comparison UI;
- responsive browser QA across desktop, tablet and mobile widths;
- a CI live-audition gate that must prove at least one real ERC-8004 candidate can answer a pre-hire audition before the Phase 2 branch passes.

Phase 2 was live-verified against ERC-8004 agent `#302258` during AgentDesk CI run 76: the advertised A2A service returned a real Grid Trading service offer/quote with measured latency, output and three preserved evidence items. That proves a live pre-hire audition/quote path; it does **not** claim that a paid job was executed. See [`docs/PHASE2_AUDITION_AUDIT.md`](./docs/PHASE2_AUDITION_AUDIT.md).

## Evidence vocabulary

AgentDesk deliberately separates these states:

```text
registry listed
≠ on-chain identity resolved
≠ metadata resolved
≠ service advertised
≠ endpoint reachable
≠ audition passed
≠ hired
≠ completed
```

A generic “verified agent” label is not used as a substitute for those distinct proofs.

## Next — Phase 3 real hire

The next gate is one genuine on-chain job/commerce flow:

```text
selected candidate
→ current quote / terms
→ genuine ERC-8183 / Agent Studio job and funding reference
→ agent work
→ deliverable
→ completion / settlement evidence
```

`contracts/AgentTrustMarketplace.sol` remains historical BSC Testnet activation infrastructure only. It is not proof of an external agent job and is not the target Phase 3 hiring path.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Optional/server-side configuration:

```text
SCAN8004_API_KEY=        # higher 8004scan rate limits
BSC_MAINNET_RPC_URL=     # direct ERC-8004 identity reads
CAMBER_TOKEN=            # separate HealthGuard assistant prototype
```

Useful verification commands:

```bash
npm run typecheck
npm run contract:compile
npm run build
npm run test:ui
```

The Phase 2 pull-request CI also runs `scripts/live-audition-smoke.mjs` against real ERC-8004 identities/services.

## Camber AI prototype

`POST /api/assistant` runs the separate Camber integration server-side using `CAMBER_TOKEN`. Camber assistant configuration does not count as ERC-8004 marketplace identity, liveness, task fit or hiring evidence.

## Product positioning

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

See [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md) for the locked product thesis, truthfulness rules, build order, demo requirements and change-control rules.
