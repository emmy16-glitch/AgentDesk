# Phase 4 Production Hardening Audit

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

This audit records what the production-hardening slice proves and what it deliberately does not prove.

## Added proof surfaces

- `/api/health/` — application liveness only.
- `/api/readiness/` — bounded BNB mainnet RPC + ERC-8004 Identity Registry bytecode check.
- `/proof/` — human-readable evidence-state map.
- `scripts/production-smoke.mjs` — CI/local smoke for liveness, security headers, manifest and readiness semantics.

## Added failure guarantees

- A timed-out audition remains visible.
- A timeout cannot receive BEST FIT.
- Missing output stays `NOT ENOUGH EVIDENCE`.
- Readiness degradation returns a truthful 503 instead of a fabricated healthy state.
- Global rendering failure explicitly states that AgentDesk did not synthesize replacement evidence.

## Production shell changes

- framework identification header disabled;
- `nosniff`, frame denial, strict referrer policy and restricted camera/microphone/geolocation permissions;
- wallet-compatible cross-origin opener policy;
- installable web manifest;
- CI concurrency + least-privilege contents permission.

## Public production deployment

AgentDesk is publicly deployed at:

https://agentdesk-bnb-eight.vercel.app/

The live deployment has been used for the judge/demo flow and production browser recording. The public URL is now part of the submission documentation rather than a pending post-build task.

## Not claimed by this phase

- This does not close Phase 3 issue #5.
- This does not prove an external paid job has already completed.
- This does not make liveness/readiness a proxy for an individual agent's quality or reachability.

One genuine completed external ERC-8183 job should only be added to the evidence set when that job actually exists and can be independently inspected.
