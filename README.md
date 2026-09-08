# AgentTrust

BNB Chain AI-agent marketplace prototype. The UI supports agent discovery, detail pages, wallet connection, an on-chain hire flow, an active-agent dashboard, and a modular HealthGuard AI endpoint.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Browser wallets are available immediately through the Wagmi abstraction. Add `NEXT_PUBLIC_REOWN_PROJECT_ID` for WalletConnect/Reown-compatible wallets.

## Deploy the marketplace contract

Fund a dedicated BNB Smart Chain Testnet account with tBNB, place its private key only in your local environment, then run:

```bash
npm run contract:deploy:testnet
```

Copy the emitted address into `NEXT_PUBLIC_AGENTTRUST_MARKETPLACE_ADDRESS`, restart the app, and use the wallet flow to hire an agent. Confirmations link to BscScan Testnet.

## Camber AI

`POST /api/assistant` runs the installed Camber CLI on the server with `CAMBER_TOKEN` and the `@emmanuel.healthguard` agent tag. The token is never sent to the browser. Install and authenticate the Camber CLI, then set `CAMBER_TOKEN` in `.env.local` before using the assistant.
