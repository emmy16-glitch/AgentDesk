# AgentDesk

**Don't trust the profile. Audition the agent.**

AgentDesk is a BNB Chain AI-agent marketplace being built around a task-first hiring flow:

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

## Current status — Phase 1

The judge-facing marketplace is being moved off seed/demo catalogue claims and onto sourced BSC agent data.

Implemented now:

- server-side ERC-8004 discovery through 8004scan, scoped to BNB Smart Chain mainnet (`chainId 56`);
- compatibility handling for the current 8004scan API migration, while recording which upstream actually answered;
- evidence-backed, many-to-many classification into the four required hackathon categories;
- source provenance and freshness timestamps;
- direct reads from the BSC ERC-8004 Identity Registry;
- ERC-8004 `tokenURI`, owner, agent-wallet and registration-metadata resolution;
- explicit advertised-service extraction;
- bounded, read-only HTTPS endpoint reachability probes with private/local targets blocked;
- real numeric ERC-8004 detail routes (`/agents/<tokenId>`);
- no silent fallback to fabricated marketplace agents when live discovery fails;
- CI that compiles the Solidity contract and runs a production Next.js build on every push.

The evidence model is documented in [`docs/PHASE1_DATA_MODEL.md`](./docs/PHASE1_DATA_MODEL.md).

A dated real-candidate audit is in [`docs/PHASE1_CANDIDATE_AUDIT.md`](./docs/PHASE1_CANDIDATE_AUDIT.md). The current audit intentionally records Grid Trading as an unresolved real-agent gap rather than relabelling a generic trading bot.

## Evidence vocabulary

AgentDesk deliberately separates these states:

```text
registry listed
≠ on-chain identity resolved
≠ metadata resolved
≠ service advertised
≠ endpoint reachable
≠ audition passed
≠ hired / completed
```

A generic “verified agent” label is not used as a substitute for those distinct proofs.

## Remaining Phase 1 work

Before Phase 1 is closed:

1. exercise the live discovery endpoint against the deployed runtime and record category coverage;
2. run direct identity + endpoint checks on the strongest BSC candidates;
3. continue discovery for genuine Grid Trading candidates;
4. harden registration-metadata retrieval as untrusted external input;
5. finish separating legacy prototype code from current judge-facing code;
6. record a Phase 1 verification snapshot.

Only then do we move to Phase 2 Live Agent Auditions.

## Legacy prototype components

The repository still contains earlier prototype code for reference, including `data/agents.ts` and `AgentTrustMarketplace.sol`.

The old seed catalogue contains demo values such as trust scores, user counts, uptime and performance duration. Those values are **not** current marketplace evidence and no longer power the primary discovery/detail flow.

`AgentTrustMarketplace.hireAgent()` records a prototype activation on BSC Testnet. It is **not** proof that an external agent completed a service job. Real hire-and-deliver commerce is a Phase 3 goal using the BNB Agent Studio / ERC-8183 path where feasible.

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
CAMBER_TOKEN=            # HealthGuard prototype integration
```

Browser wallets are available through the Wagmi abstraction. Add `NEXT_PUBLIC_REOWN_PROJECT_ID` for WalletConnect/Reown-compatible wallets.

## Prototype marketplace contract

Fund a dedicated BNB Smart Chain Testnet account with tBNB, keep its private key only in your local environment, then run:

```bash
npm run contract:deploy:testnet
```

Copy the emitted address into `NEXT_PUBLIC_AGENTTRUST_MARKETPLACE_ADDRESS`, restart the app, and use the wallet flow only as a prototype activation test. Confirmations link to BscScan Testnet.

## Camber AI prototype

`POST /api/assistant` runs the installed Camber CLI on the server with `CAMBER_TOKEN` and the `@emmanuel.healthguard` agent tag. The token is never sent to the browser. This assistant prototype is separate from ERC-8004 identity proof and from the future audition engine.

## Product positioning

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

See [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md) for the locked product thesis, truthfulness rules, build order, demo requirements, and change-control rules.
