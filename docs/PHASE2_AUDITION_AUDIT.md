# Phase 2 Live Agent Audition Audit

Date: 2026-09-08

Status: **Phase 2 live gate passed**

This audit records the evidence used to close AgentDesk Phase 2. It is intentionally narrower than the final hackathon demo: Phase 2 proves a real pre-hire audition/quote path. Phase 3 must still prove genuine on-chain hiring, funding, delivery and completion.

## Gate definition

The Phase 2 gate in `BUILD_SEQUENCE.md` requires:

- at least one real candidate can be auditioned on a task;
- raw result, latency, freshness, quote and failure state are preserved;
- Task Fit is explainable.

The Phase 2 PR additionally runs `scripts/live-audition-smoke.mjs` in GitHub Actions. The script fails CI unless at least one real BSC ERC-8004 identity resolves through AgentDesk and returns a completed task-specific pre-hire audition result.

## Passing live proof

AgentDesk CI run **76** (`34286312130`) passed the live audition gate on commit `7748d4c6b4ae647215b14abb472e2938ea11c723`.

Winning live smoke candidate:

| Field | Observed evidence |
| --- | --- |
| ERC-8004 token ID | `#302258` |
| Audit label | Brain on BNB grid planner audit candidate |
| Task family | Grid Trading |
| Request | Read-only WBNB/USDT grid-planning audition with `500 USDT` capital and moderate risk preference |
| Protocol | A2A |
| HTTP result | 200 |
| Audition status | `completed` |
| Measured A2A service latency | **40 ms** |
| Total smoke request elapsed time | 755 ms |
| Preserved evidence items | **3** |
| Quote returned | yes |
| Output returned | yes |
| Engine Task Fit | `PARTIAL FIT` |
| Error | none |

The live service response matched the requested Grid Trading task to the agent's advertised `grid_plan` service. The live service catalogue advertised that service at **0.10 $U** and returned the inputs/deliverables required for the pre-hire service offer.

AgentDesk deliberately leaves the engine-level Task Fit at `PARTIAL FIT` even after that successful response because the economic correctness of the proposed/advertised strategy has not been independently validated.

## What the three evidence items mean

The passing audition preserves:

1. **Identity evidence** — direct BSC ERC-8004 identity/registration resolution for the candidate.
2. **Agent Card evidence** — the A2A Agent Card resolved from the explicitly advertised A2A service origin.
3. **Service-response evidence** — the current A2A response used for the task-specific audition/quote, including measured latency.

The raw external payload is retained in the server-side audition result model. CI logs intentionally print only a compact, non-sensitive summary after the adapter was verified.

## Comparison proof

The Phase 2 UI can audition up to four source-qualified candidates on the same normalized task and then order them using only observable evidence:

1. completion status;
2. usable task-specific output;
3. machine-readable quote availability;
4. preserved evidence count;
5. measured latency;
6. deterministic token-ID tie break.

The comparison labels are relative and explainable: `BEST FIT`, `STRONG FIT`, `PARTIAL FIT`, or `NOT ENOUGH EVIDENCE`. They are not a global trust score.

## Failure-state proof

During Phase 2 adapter development, real candidates also exercised honest negative states:

- invalid or unresolved advertised Agent Card paths;
- placeholder/404 A2A services;
- application-level errors returned inside A2A structured data;
- agents that expose only asynchronous or unsupported flows.

Those outcomes remain `unsupported`, `timeout`, or `error`; they are never converted into a positive audition result or replaced with seed data.

## CI verification

Run 76 passed:

- TypeScript typecheck;
- Solidity compile;
- production Next.js build;
- real Phase 2 live audition gate;
- **16/16** source-backed Playwright tests across 1440px, 1280px, 768px and 390px viewports.

The browser tests cover the task-first home, all four task-family controls, dynamic source-qualified candidate selection, honest empty/failure states, multi-agent comparison and rejection of legacy fabricated trust metrics.

## Boundary: what Phase 2 does not prove

A completed Phase 2 audition/quote does **not** mean:

- the agent was hired;
- money or escrow was funded;
- an ERC-8183 job was created;
- a trade was placed;
- the advertised work was delivered;
- the service's economic recommendation was independently guaranteed correct.

Those are intentionally Phase 3 concerns.

## Phase 2 conclusion

Phase 2 is complete because AgentDesk now has a real, source-backed path from:

```text
user task
→ real discovered ERC-8004 candidate
→ direct identity/service evidence
→ live bounded A2A audition/quote
→ latency + evidence preservation
→ explainable comparison
```

The next engineering gate is Phase 3: select one candidate, create/fund a genuine on-chain agent job, receive the deliverable and preserve an independently inspectable job/transaction reference.
