# AgentDesk UX Contract

## Product context

- Audience: BNB Chain users who need an agent for a specific job, not users browsing generic profiles for entertainment.
- Primary product question: **Which live BNB agent is the best fit for this exact task, right now?**
- Primary flow: `describe task → discover → audition/quote → compare → hire → receive result`.
- Product thesis and truthfulness rules are locked in `HACKATHON_LOCK.md`.
- Active locale: English (`en`). Accessibility target: WCAG 2.2 AA.

## Evidence boundaries

AgentDesk must keep these states separate:

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

The UI must never visually or verbally upgrade one state into the next without evidence.

## Authoritative sources

| Domain / scope | Authoritative source | Notes |
|---|---|---|
| BSC agent discovery | `lib/8004scan.ts` | Indexed ERC-8004 source data with explicit upstream provenance |
| Direct identity proof | `lib/erc8004-registry.ts` | Reads BSC ERC-8004 Identity Registry directly |
| Endpoint reachability | `lib/agent-liveness.ts` | Bounded read-only probe; reachability is not task quality |
| Category labels | evidence-backed derivation in `lib/8004scan.ts` | Multi-category; missing evidence stays unclassified |
| Audition contracts | `lib/auditions/types.ts` | Normalized request/result/evidence/quote contracts |
| Audition execution | `lib/auditions/engine.ts` + `lib/auditions/a2a.ts` | Direct identity resolution plus advertised A2A service auditioning |
| Comparison | `lib/auditions/compare.ts` | Explainable ordering from observable audition evidence only |
| Wallet connection | `lib/wagmi.ts` + `components/wallet/WalletProvider.tsx` | Wallet UX only; does not prove an agent hire |
| Camber assistant | `lib/camber.ts` + `lib/camber-agent-config.ts` | Separate assistant integration; not marketplace identity proof |
| Legacy activation contract | `contracts/AgentTrustMarketplace.sol` | Prototype/testnet infrastructure only; not a completed agent job |

## Current task-first UX

The homepage now leads with:

> **What do you want an agent to do?**

The four required task families are first-class controls:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Each family has its own required input contract. AgentDesk then shows source-qualified candidates discovered from the ERC-8004 evidence layer and lets the user select up to four for the same audition.

The older registry-card browser remains below the task-first flow as an evidence-inspection surface, not as the primary product journey.

## Audition result contract

Every audition result exposes enough information to distinguish evidence from interpretation:

- candidate identity/source ID;
- task/category;
- status: completed / unsupported / timeout / error;
- raw or source-linked evidence;
- measured latency;
- checked/observed timestamp;
- quote/price and expiry when genuinely available;
- relevant task-specific output;
- explainable Task Fit reasons;
- missing-evidence reasons.

Current ranking labels:

- BEST FIT
- STRONG FIT
- PARTIAL FIT
- NOT ENOUGH EVIDENCE

There is no unexplained global trust score.

## Audition behavior

- Audition prompts are explicitly pre-hire and read-only.
- AgentDesk does not ask candidates to execute trades, move funds, sign approvals or make irreversible changes during Phase 2 auditions.
- A2A is used only when the resolved ERC-8004 registration explicitly advertises an A2A service.
- AgentDesk may resolve the protocol-standard Agent Card path on the same advertised A2A origin; it does not convert arbitrary websites into task endpoints.
- Text responses, A2A structured-data parts and task-matched live service offers can become audition evidence.
- A live service offer/quote counts as pre-hire capability/price evidence, not as proof of service delivery.
- Authentication-required, unsupported transports, asynchronous/multi-turn states, application errors and timeouts remain visible instead of being upgraded into positive results.

## Comparison behavior

For candidates auditioned on the same task, comparison order is explainable and deterministic. It considers, in order:

1. audition completion state;
2. usable task-specific output;
3. machine-readable quote availability;
4. preserved evidence count;
5. measured response latency;
6. a deterministic token-ID tie break.

The UI states why each candidate ranked where it did. A relative BEST FIT label therefore means “best observable evidence in this audition set,” not “globally trustworthy” or “economically guaranteed.”

## Failure behavior

- Discovery failure shows a clear unavailable state; it never falls back to fabricated marketplace records.
- Missing category evidence leaves an agent unclassified for that category.
- Endpoint probe failure reports unreachable/blocked/unsupported; it does not imply maliciousness.
- Audition timeout/error remains visible and contributes to `NOT ENOUGH EVIDENCE` rather than silently becoming a positive result.
- A2A application-level errors inside structured data are treated as errors, not valid outputs.
- Wallet or commerce failure must not create a completed-hire state.

## Phase 2 live verification

AgentDesk CI run 76 proved the Phase 2 live gate against real BSC ERC-8004 identity `#302258`:

- A2A protocol path resolved from the registered service;
- live Grid Trading audition/quote response completed;
- measured service latency: 40 ms in that run;
- three evidence items preserved;
- a current quote was returned;
- output was returned;
- engine Task Fit remained conservatively `PARTIAL FIT` because economic correctness was not independently validated.

That verification proves a real pre-hire audition/quote path. It does not claim that the agent was paid, that an ERC-8183 job was funded, or that the advertised work was delivered. Those belong to Phase 3.

## Visual contract

- Preserve the dark BNB-aligned visual language, strong focus states, responsive layout, and accessible controls.
- Real agent names and descriptions are variable-length; cards and comparison surfaces must tolerate that without clipping critical evidence.
- Mobile category/task controls must remain reachable by touch and keyboard.
- Visual QA must test the current source-backed/task-first product, not legacy seed agent names.

## Verification

Required baseline checks:

- `npm run typecheck`
- `npm run contract:compile`
- `npm run build`
- real Phase 2 audition smoke gate on the Phase 2 PR
- browser tests at desktop/tablet/mobile widths
- zero horizontal overflow on supported viewports
- no legacy `AgentTrust` judge-facing branding
- no legacy fabricated seed metrics on the active marketplace path

The remaining full judge-demo work is Phase 3+: task → audition → compare → genuine on-chain hire → result, as specified in `HACKATHON_LOCK.md`.
