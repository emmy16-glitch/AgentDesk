# AgentDesk authorization and paid-tool boundary

AgentDesk keeps agent discovery, hiring, agent-wallet infrastructure, paid tools and execution authority separate.

```text
human task + rules
        ↓
ERC-8004 discovery
        ↓
live audition + comparison
        ↓
independent check
        ↓
final hire permissions
        ↓
provider-signed ERC-8183 terms
        ↓
hired agent
        ↓
agent-side wallet / policy system
        ↓
optional paid B402/x402 tools
```

## User experience

The public six-step flow does not change:

```text
Ask → Details → Test → Best Match → Check → Hire
```

The final Hire screen contains one collapsed **Capabilities & permissions** section. It is intentionally not a seventh screen or a technical dashboard.

Defaults are conservative:

- external read-only intelligence: allowed;
- paid intelligence: off;
- transaction execution: either off or human approval required, based on the task's existing action rule.

Turning a capability on is not a payment. A paid-tool fee can happen only after hire if the selected agent actually calls an approved paid service.

## Paid intelligence providers

The implementation is provider-neutral. `lib/capabilities/catalog.ts` currently describes two integrations:

- **Cournot** — probability intelligence with source-backed outputs; may be reached over B402/x402 by a compatible hired agent;
- **Telegraph** — external evidence intelligence used by Auctorail-style authorization flows.

AgentDesk does not hard-code either service as mandatory. More paid services can use the same catalog and policy model later.

The catalog does not fabricate pricing. Paid services are treated as provider-quoted.

## No paid calls during auditions

Pre-hire auditions remain read-only:

- no wallet signature;
- no trade;
- no approval;
- no fund movement;
- no paid Cournot call;
- no paid Telegraph/x402 acquisition.

This preserves the UI promise that AgentDesk tests agents before the user spends money.

## Capability commitment

Final-hire permissions use `agentdesk-hire-capabilities-v1`.

A canonical capability object is hashed with `keccak256`. The capability hash is inserted into the ERC-8183 task description alongside the audition receipt.

AgentDesk refuses to fund negotiated terms if the provider-signed task drops either commitment.

```text
audition receipt hash
+
capability policy hash
        ↓
provider-signed ERC-8183 task
        ↓
funded job
```

This means changing paid-tool permissions after negotiation invalidates the quote and requires fresh provider-signed terms.

## Agent wallets

AgentDesk keeps the human buyer wallet separate from the hired agent's wallet infrastructure.

The human wallet appears only at Hire. Agent-side infrastructure may be Turnkey, TWAK, Altana or another compatible provider when the agent explicitly advertises it.

A provider name is advertisement evidence only:

```text
wallet provider advertised
≠ wallet policy configured
≠ policy enforced
≠ transaction signed
≠ ERC-8183 job completed
```

`agent_wallet_policy` carries the requested task and hire boundary to providers that understand it. AgentDesk does not label the policy enforced without separate evidence.

## Auctorail

Auctorail is integrated as an optional policy-only preflight adapter.

When configured, AgentDesk may send a bounded proposal to Auctorail's `/api/authorize` endpoint using:

```text
mode = policy
```

The AgentDesk adapter deliberately does **not** request Auctorail `mode=live`. Therefore this integration does not itself buy Telegraph/x402 evidence and does not return executable authority.

The API response remains:

```text
ALLOW | HOLD | BLOCK
```

with `executable: false`.

This keeps the correct Auctorail security principle:

```text
application asks for authority
≠
application creates authority
```

### Current proof boundary

The existing Auctorail repository has protected execution proof on Base Sepolia. AgentDesk must not claim that Auctorail currently enforces BSC agent transactions unless a BNB-compatible Auctorail executor is separately deployed and proven.

For production BNB enforcement, authoritative Mandates, signing authority, replay protection and protected credentials must remain on the trusted Auctorail side or an equivalent wallet-policy system.

## Local AgentDesk preflight

`POST /api/authorization/preflight` evaluates the selected capability policy before any external authorization integration.

Examples:

- paid tools off + Cournot request → `BLOCK`;
- Cournot approved and quoted within the user's tool budget → `ALLOW` policy preflight;
- amount in a different asset → `HOLD`, because AgentDesk does not invent FX conversion;
- transaction with `approval-required` → `HOLD` for human approval;
- transaction execution disabled → `BLOCK`.

An `ALLOW` from this endpoint is still not a wallet signature or executable permit.

## Inspection endpoint

`GET /api/agent-tools` exposes the supported paid-tool catalog and proof boundary for judges/builders without putting that technical detail into the primary six-screen UX.

## Environment

Optional Auctorail preflight:

```env
AUCTORAIL_PREFLIGHT_ENABLED=false
AUCTORAIL_BASE_URL=
AUCTORAIL_API_TOKEN=
```

Keep the integration disabled unless a trusted compatible service is configured.

Do not place payer keys, agent-wallet private keys, permit-signing secrets or protected executor credentials in the AgentDesk client bundle.

## Final rule

Capabilities are permissions, not proof.

Paid intelligence is a tool, not authority.

Auctorail/agent-wallet policy is an authorization boundary, not a claim that an action executed.

ERC-8183 funding is not job completion.
