# AgentDesk

**Don't trust the profile. Audition the agent.**

AgentDesk is a BNB Chain AI-agent marketplace being built around a task-first hiring flow:

```text
Describe a task
→ discover relevant live BSC agents
→ audition / quote candidates
→ compare fresh evidence
→ hire the best fit on-chain
→ receive the result
```

The hackathon product and architecture direction is locked in [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md). Treat that file as the source of truth before making product, UI, data, or integration changes.

## Current implementation

The current prototype already includes:

- marketplace and agent-detail UI;
- category filtering and search;
- wallet connection through Wagmi / WalletConnect-compatible providers;
- a BSC Testnet transaction flow;
- a minimal Solidity activation contract;
- an active-agent dashboard;
- a server-side Camber integration for HealthGuard AI.

## Important current limitations

The existing `data/agents.ts` catalogue contains temporary seed/demo data. Hard-coded trust scores, user counts, uptime, performance duration, and generic verification flags are **not** intended to remain as judge-facing production claims.

The current `AgentTrustMarketplace.hireAgent()` contract records a prototype activation on BSC Testnet. It must not be presented as proof that an external agent completed a real service job.

The next implementation priorities are:

1. real ERC-8004 / 8004scan BSC agent discovery;
2. source-backed agent metadata and provenance;
3. task-specific live auditions across all four required categories;
4. explainable candidate comparison;
5. at least one genuine ERC-8183 / Agent Studio hire-and-deliver flow;
6. production/judge hardening.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Browser wallets are available through the Wagmi abstraction. Add `NEXT_PUBLIC_REOWN_PROJECT_ID` for WalletConnect/Reown-compatible wallets.

## Prototype marketplace contract

Fund a dedicated BNB Smart Chain Testnet account with tBNB, keep its private key only in your local environment, then run:

```bash
npm run contract:deploy:testnet
```

Copy the emitted address into `NEXT_PUBLIC_AGENTTRUST_MARKETPLACE_ADDRESS`, restart the app, and use the wallet flow to test the prototype activation transaction. Confirmations link to BscScan Testnet.

## Camber AI

`POST /api/assistant` runs the installed Camber CLI on the server with `CAMBER_TOKEN` and the `@emmanuel.healthguard` agent tag. The token is never sent to the browser.

## Product positioning

> **AgentDesk is the BNB marketplace where agents prove they are right for your task before you hire them.**

See [`HACKATHON_LOCK.md`](./HACKATHON_LOCK.md) for the locked product thesis, truthfulness rules, build order, demo requirements, and change-control rules.
