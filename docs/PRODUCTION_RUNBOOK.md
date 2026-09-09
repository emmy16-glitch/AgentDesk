# AgentDesk Production Runbook

This runbook is for public hackathon deployment and judge-demo operations. `HACKATHON_LOCK.md` remains the product source of truth.

## Pre-deploy gate

Run from a clean checkout:

```bash
npm ci
npm run typecheck
npm run contract:compile
npm run build
npm run start -- -H 127.0.0.1 -p 3000
npm run test:production-smoke
npm run test:ui
```

Do not deploy a build that replaces unavailable source data with seed agents, inferred quotes, invented completion states, or silent fallbacks.

## Runtime configuration

Required for the full public experience:

- `NEXT_PUBLIC_REOWN_PROJECT_ID` — wallet connection.
- `SCAN8004_API_KEY` — strongly recommended for stable 8004scan discovery limits. Server-only.
- `BSC_MAINNET_RPC_URL` — optional RPC override for ERC-8004 and readiness checks.
- `BSC_TESTNET_RPC_URL` — optional only when a quoted ERC-8183 job genuinely targets BSC testnet.

`CAMBER_TOKEN` remains a separate prototype integration and is not marketplace proof.

Never put a buyer private key, deployer key, scan API key, or Camber token in a `NEXT_PUBLIC_*` variable.

## Public probes

- `GET /api/health/` — process liveness only.
- `GET /api/readiness/` — bounded BNB mainnet + ERC-8004 registry readiness.
- `GET /proof/` — human-readable evidence map for judges.

A `503` from readiness is an honest degraded state, not permission to fabricate agent availability.

## Demo-safe operating procedure

1. Open `/api/health/` and confirm `ok: true`.
2. Open `/api/readiness/`. Prefer `200 ready`; if BNB RPC is temporarily degraded, disclose it rather than hiding it.
3. Open `/proof/` so the judge understands the evidence vocabulary.
4. Run the marketplace journey using live discovery.
5. Use blind auditions first; reveal identities only after evidence is visible.
6. Never call `FUNDED` completed.
7. Only show portable completion reputation after the job is `COMPLETED`, signed terms still verify, and the returned delivery reproduces the on-chain deliverable hash.

## Failure handling

### 8004scan unavailable

Show the existing discovery failure state. Do not switch to a static catalogue.

### Agent endpoint timeout

Keep the candidate visible as `timeout` / `NOT ENOUGH EVIDENCE`. Do not drop it from the comparison in a way that suggests it passed.

### ERC-8183 negotiation fails

Do not offer wallet funding. Explain the exact reason: unsupported service, invalid provider binding, invalid signature, wrong chain/Commerce contract, stale quote, or payment-token mismatch.

### Wallet transaction rejected

Keep the job uncreated/unfunded. A rejected wallet action is not a partial hire.

### Provider funded but no result yet

Display `FUNDED`. Poll/refresh evidence. Do not manufacture a delivery.

### Provider response available but hash does not match chain

Display it only as unverified provider data and block portable completion reputation.

## Release evidence to preserve

For the final submission capture:

- public deployment URL;
- exact Git commit SHA;
- successful CI run;
- one live discovery source URL;
- one live audition evidence trail;
- one audition receipt hash;
- one genuine ERC-8183 job + funding transaction;
- provider delivery source and reproduced on-chain deliverable hash;
- final ERC-8183 completion reference when available.
