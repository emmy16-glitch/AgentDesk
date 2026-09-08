# AgentTrust UX Contract

## Product context

- Audience: BNB Chain users evaluating and activating AI agents.
- Primary jobs: discover, inspect trust data, ask HealthGuard a safety question, connect a wallet, and activate an agent.
- Active locale: English (`en`). Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type |
|---|---|---|
| Agent catalogue and categories | `data/agents.ts` | Product catalogue |
| On-chain payment and activation | `contracts/AgentTrustMarketplace.sol` | Solidity contract |
| Wallet connection | `lib/wagmi.ts` | EVM wallet configuration |
| HealthGuard AI | `lib/camber.ts` | AI integration boundary |

## Visual contract

- Project design context: `DESIGN.md`.
- Runtime token owner: Tailwind v4 `@theme` in `app/globals.css`.
- The marketplace and agent detail screens share dark panels, gold primary actions, visible focus rings, and compact data cards.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Wallet selection | `WalletUIProvider` | `components/wallet/WalletProvider.tsx` | injected / WalletConnect | browser modal + connect state |
| Agent activation | `HireButton` | `components/agents/HireButton.tsx` | card / detail | BSC Testnet receipt |
| Active agents | `ActiveAgentsProvider` | `components/agents/ActiveAgentsProvider.tsx` | sidebar | persisted transaction state |
| AI question form | `AIAssistant` | `components/AIAssistant.tsx` | sidebar / detail | API response + error state |
| Scrollbar | global stylesheet | `app/globals.css` | none | computed/browser inspection |

## Flow ledger

| Operation | Trigger | Pending | Success feedback | Failure recovery |
|---|---|---|---|---|
| Connect wallet | Connect Wallet / Connect to Hire | wallet option is busy | address and live balance appear | modal reports wallet cancellation/error |
| Hire agent | Hire Agent | confirmation then on-chain receipt | “Agent activated successfully” and dashboard item with BscScan link | retain agent page/card and show transaction error |
| Ask HealthGuard | assistant submit | send icon busy | response updates in place | keep question area usable and show retry guidance |
| Marketplace search | input/category filter | local, immediate | filtered cards | no-result list remains empty without layout break |

## Async and resilience

Transactions are pessimistic: the dashboard is updated only after a successful receipt. Hire controls are disabled while a wallet confirmation or receipt is pending. The assistant aborts an older request before sending a later question. Wallet and contract configuration errors explain the missing environment variable without claiming a completed activation.

## Verification

- Static: `npm run contract:compile`, `npm run build`, strict premium audit, and `designmd lint DESIGN.md`.
- Browser: marketplace cards, detail route, wallet modal, local HealthGuard response, narrow layout, and disconnected hire state.
- Live BSC Testnet activation remains dependent on a funded deployment account, a deployed contract address, and a browser wallet.
