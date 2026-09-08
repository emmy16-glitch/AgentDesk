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
| Wallet connection | `lib/wagmi.ts` + `components/wallet/WalletProvider.tsx` | Wallet UX only; does not prove an agent hire |
| Camber assistant | `lib/camber.ts` + `lib/camber-agent-config.ts` | Separate assistant integration; not marketplace identity proof |
| Legacy activation contract | `contracts/AgentTrustMarketplace.sol` | Prototype/testnet infrastructure only; not a completed agent job |

## Current Phase 1 UI

The current marketplace may show:

- real ERC-8004 token/agent identifiers;
- BSC chain/network provenance;
- indexed owner/protocol/source fields;
- source-attributed score/feedback/star data where returned by the upstream source;
- evidence-backed category labels;
- freshness/check timestamps;
- direct identity metadata and advertised services;
- explicit reachability results when a user requests a probe.

It must not show fabricated trust percentages, invented users, invented uptime, fake verification badges, or claim a service was hired/completed when only a prototype activation occurred.

## Phase 2 task-first UX contract

The home experience will progressively move from directory-first discovery to the locked first question:

> **What do you want an agent to do?**

The four required task families are:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Each task family gets its own input contract and comparable audition outputs. Protocol terminology belongs in evidence/provenance details, not as a prerequisite for using the product.

## Audition result contract

Every audition result must expose enough information to distinguish evidence from interpretation:

- candidate identity/source ID;
- task/category;
- status: completed / unsupported / timeout / error;
- raw or source-linked evidence;
- measured latency;
- checked/observed timestamp;
- quote/price and expiry when genuinely available;
- relevant output fields for the category;
- explainable Task Fit reasons;
- missing-evidence reasons.

Preferred ranking labels:

- BEST FIT
- STRONG FIT
- PARTIAL FIT
- NOT ENOUGH EVIDENCE

No unexplained global trust score.

## Failure behavior

- Discovery failure shows a clear unavailable state; it never falls back to fabricated marketplace records.
- Missing category evidence leaves an agent unclassified for that category.
- Endpoint probe failure reports unreachable/blocked/unsupported; it does not imply maliciousness.
- Audition timeout/error remains visible and contributes to `NOT ENOUGH EVIDENCE` rather than silently becoming a positive result.
- Wallet or commerce failure must not create a completed-hire state.

## Visual contract

- Preserve the dark BNB-aligned visual language, strong focus states, responsive layout, and accessible controls.
- Real agent names and descriptions are variable-length; cards and comparison surfaces must tolerate that without clipping critical evidence.
- Mobile category/task controls must remain reachable by touch and keyboard.
- Visual QA must test the current source-backed/task-first product, not legacy seed agent names.

## Verification

Required baseline checks:

- `npm run contract:compile`
- `npm run build`
- browser smoke tests at desktop/tablet/mobile widths
- zero horizontal overflow on supported viewports
- no legacy `AgentTrust` judge-facing branding
- no legacy fabricated seed metrics on the active marketplace path

The final judge demo must ultimately prove a complete task → audition → compare → real hire → result path as specified in `HACKATHON_LOCK.md`.
