# AgentDesk UX Contract

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

## Product context

- Audience: BNB Chain users who need an agent for a specific job, not users browsing generic profiles for entertainment.
- Primary product question: **Which live BNB agent is the best fit for this exact task, right now?**
- Primary flow: `Ask → Details → Test → Best Match → Check → Hire`.
- Product thesis: **Don't trust the listing. Test the agent.**
- Product thesis and truthfulness rules are locked in `HACKATHON_LOCK.md`.
- Active locale: English (`en`). Accessibility target: WCAG 2.2 AA.

## Evidence boundaries

AgentDesk must keep these states separate:

```text
registry listed
≠ on-chain identity resolved
≠ metadata resolved
≠ service advertised
≠ endpoint/service reachable
≠ capability confirmed
≠ task result returned
≠ hired
≠ funded
≠ completed paid job
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
| Audition execution | `lib/auditions/engine.ts` + `lib/auditions/a2a.ts` | Direct identity resolution plus advertised A2A service testing |
| Comparison | `lib/auditions/compare.ts` | Explainable ordering from observable audition evidence only |
| Wallet connection | `lib/wagmi.ts` + `components/wallet/WalletProvider.tsx` | Wallet UX only; does not prove an agent hire |
| AgentDesk Brain | `lib/brain/` + optional Camber adapter | Explains existing evidence; cannot create proof |
| Legacy activation contract | `contracts/AgentTrustMarketplace.sol` | Prototype/testnet infrastructure only; not a completed agent job |

## Current guided UX

The homepage leads with:

> **What do you want an agent to do?**

The four required task families are first-class controls:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Each family has its own required input contract. AgentDesk uses source-backed ERC-8004 discovery, qualifies compatible candidates, and tests them on the same bounded task where a usable live service is available.

The shared `AgentDeskShell` keeps navigation, the supplied environmental background, and progress state stable across the entire flow. Wallet connection is not a prerequisite for Ask, Details, Test, Best Match or Check.

## Task rules

Screen 2 keeps **Your rules** secondary so task details remain primary. Rules are task-specific constraints, not a profile or long-term preference system: risk tolerance, optional maximum hire price, optional protocol restriction, action permission, and the public-wallet data boundary where relevant.

The same optional `guardrails` object travels with the task through candidate testing. A changed rule invalidates prior comparison state. Rule evaluation distinguishes `pass`, `fail`, and `unknown`; unknown never becomes a pass. Known price, protocol, or unauthorized-action conflicts are hard failures and cannot receive Best Match. The same task object, including rules, is committed into the audition receipt and can be carried into the signed ERC-8183 job description.

## Live result contract

Every live result exposes enough information to distinguish evidence from interpretation:

- candidate identity/source ID;
- task/category;
- status: task result / capability response / unsupported / timeout / error;
- raw or source-linked evidence;
- measured latency;
- checked/observed timestamp;
- quote/price and expiry when genuinely available;
- relevant task-specific output when genuinely returned;
- explainable Task Fit reasons;
- missing-evidence reasons.

A **LIVE CAPABILITY MATCH** means the agent confirmed a matching service/capability through the live path. It does not mean the requested paid work was already carried out.

```text
Capability confirmed
≠ Task completed
≠ Trade executed
≠ Paid job completed
```

There is no unexplained global trust score.

## Test behavior

- Pre-hire test prompts are explicitly bounded and read-only.
- AgentDesk does not ask candidates to execute trades, move funds, sign approvals or make irreversible changes as part of the pre-hire test.
- A2A is used only when the resolved ERC-8004 registration advertises a compatible A2A service path.
- AgentDesk may resolve protocol-standard Agent Card information from the advertised A2A origin; it does not convert arbitrary websites into task endpoints.
- Text responses, A2A structured-data parts and task-matched live service offers can become evidence.
- A live service offer/quote counts as pre-hire capability/price evidence, not as proof of service delivery.
- Authentication-required, unsupported transports, asynchronous/multi-turn states, application errors and timeouts remain visible instead of being upgraded into positive results.

## Comparison behavior

For candidates tested on the same task, comparison order must remain explainable and deterministic. It may consider:

1. hard user-rule conflicts;
2. whether a task-specific result exists versus a capability-only response;
3. usable task-specific output;
4. confirmed rule compatibility;
5. machine-readable quote availability;
6. preserved evidence count;
7. measured response latency;
8. deterministic tie-breaking.

The UI states why a candidate ranked where it did. A Best Match label therefore means “best observable fit for this task/evidence set,” not “globally trustworthy” or “economically guaranteed.”

## Failure behavior

- Discovery failure shows a clear unavailable state; it never falls back to fabricated marketplace records.
- Missing category evidence leaves an agent unclassified for that category.
- Endpoint probe failure reports unreachable/blocked/unsupported; it does not imply maliciousness.
- Test timeout/error remains visible and contributes to insufficient evidence rather than silently becoming a positive result.
- A2A application-level errors inside structured data are treated as errors, not valid outputs.
- Wallet or commerce failure must not create a completed-hire state.
- A capability-only response must not be relabelled as task completion.

## Live verification history

AgentDesk CI previously proved the Phase 2 live gate against real BSC ERC-8004 identity `#302258`:

- A2A protocol path resolved from the registered service;
- live Grid Trading audition/quote response completed;
- measured service latency: 40 ms in that historical run;
- three evidence items preserved;
- a current quote was returned;
- output was returned;
- engine Task Fit remained conservatively `PARTIAL FIT` because economic correctness was not independently validated.

The public production site has also been exercised through the real Grid Trading flow. The current recorded production run returns a **LIVE CAPABILITY MATCH** and moves to Hire. That proves a live capability/service response, not a trade or paid-job completion.

## Visual contract

- Preserve the dark BNB-aligned visual language, strong focus states, responsive layout, and accessible controls.
- Real agent names and descriptions are variable-length; cards and comparison surfaces must tolerate that without clipping critical evidence.
- Mobile category/task controls must remain reachable by touch and keyboard.
- Visual QA must test the current source-backed/task-first product, not legacy seed agent names.
- Capability confirmation, task results, failures and paid-job states must look visibly distinct.

## Verification

Required baseline checks:

- `npm run typecheck`
- `npm run contract:compile`
- `npm run build`
- production/readiness smoke checks
- browser tests at desktop/tablet/mobile widths
- zero horizontal overflow on supported viewports
- no legacy `AgentTrust` judge-facing branding
- no legacy fabricated seed metrics on the active marketplace path

The public product is live at `https://agentdesk-bnb-eight.vercel.app/`. The remaining external proof gate is one genuine completed ERC-8183 paid job; it must not be simulated just to make the flow look complete.
