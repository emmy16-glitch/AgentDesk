# Phase 1 — Discovery and evidence model

Status: active implementation source of truth for Phase 1.

AgentDesk must never collapse registration, metadata, reachability and task quality into one vague "verified" label.

## Evidence ladder

```text
8004scan indexed record
        ↓
source-backed marketplace classification
        ↓
direct BSC ERC-8004 identity read
        ↓
registration metadata / advertised services
        ↓
explicit endpoint reachability probe
        ↓
Phase 2 task-specific audition
        ↓
Phase 3 real ERC-8183 hire + deliverable
```

Each arrow is a new proof boundary. Passing an earlier boundary does not imply the next one.

## Layer 1 — indexed source record

Source: 8004scan.

Useful fields include chain ID, token ID, name, description, owner, supported protocols, source score, stars, feedback count and indexed timestamps.

Rules:
- Chain ID must be BNB Smart Chain mainnet (`56`) for the main marketplace.
- 8004scan values remain source-owned values. For example, `total_score` may be displayed only as an `8004scan source score`; AgentDesk must not relabel it as an AgentDesk trust score.
- The response records which 8004scan API base actually answered because the upstream is currently migrating API surfaces.
- A failed source request has no fabricated catalogue fallback.

## Layer 2 — derived marketplace classification

Source: AgentDesk deterministic classification over source text.

The four required categories are:
- Health Factor Monitoring
- Yield Optimisation
- Grid Trading
- Rebalancing

Rules:
- Semantic search ranking is discovery assistance, not category proof.
- A category is assigned only when the agent's own indexed name, description or tags contain evidence terms.
- One agent may map to multiple categories.
- The exact matched terms are retained as `categoryEvidence` and may be shown in the UI.
- An agent with no evidence stays unclassified rather than being forced into a category.

## Layer 3 — direct on-chain identity

Source: BSC mainnet ERC-8004 Identity Registry.

Registry address:
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

AgentDesk reads:
- `ownerOf(tokenId)`
- `tokenURI(tokenId)`
- `getAgentWallet(tokenId)` when available

Rules:
- Direct registry resolution is separate from 8004scan indexing.
- A successful identity read proves that the token exists in the configured registry at check time.
- It does not prove the advertised service is online or competent.

## Layer 4 — registration metadata

The ERC-8004 token URI may resolve to registration metadata containing a name, description, services/endpoints, supported trust declarations and other metadata.

Rules:
- Metadata is untrusted input even though its URI is anchored by an on-chain identity.
- Parsing failures are explicit.
- Service advertisements are only advertisements until probed.
- Legacy `endpoints` metadata may be accepted for compatibility, but `services` is preferred.

## Layer 5 — endpoint reachability

Source: an explicit, read-only AgentDesk availability probe.

Rules:
- Probing is never automatic just because a card is rendered.
- Only public HTTPS endpoints are probed.
- Local/private/reserved targets and credential-bearing URLs are blocked.
- Redirects are not followed.
- A bounded timeout is required.
- A responding endpoint means only `endpoint-reachable`.
- Reachability does not prove task correctness, economic safety or agent quality.

## Phase 2 boundary — Live Audition

Only a category-specific, bounded audition may produce task-fit evidence.

Examples:
- Health: can this agent inspect the requested lending position and return the required health-factor fields?
- Yield: can it return a current strategy/quote for the requested asset and amount?
- Grid: can it produce a valid grid proposal for the requested pair/range/capital?
- Rebalancing: can it produce a valid rebalance proposal for the supplied portfolio/LP position?

This is intentionally not part of Phase 1.

## Phase 3 boundary — Hire

A hire is complete only when a real job/service transaction exists and the selected agent actually returns the promised deliverable/result. The old prototype activation contract is not equivalent to completed agent work.

## UI vocabulary

Use these terms precisely:

| UI term | Minimum evidence |
| --- | --- |
| Registry listed | indexed BSC ERC-8004 record |
| On-chain identity verified | direct Identity Registry read succeeded |
| Metadata resolved | token URI parsed successfully |
| Service advertised | valid service entry exists in registration metadata |
| Endpoint reachable | explicit safe probe received a qualifying response |
| Audition passed | Phase 2 task-specific check passed |
| Hired / completed | Phase 3 real job + returned deliverable / settlement evidence |

Avoid generic labels such as `Verified Agent`, `Trusted`, `Safe`, or `Live` unless the exact claim is defined and backed by the required evidence.
