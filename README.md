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

`POST /api/ai/healthguard` delegates to `CAMBER_API_URL` when `CAMBER_API_KEY` is present. Without credentials, it supplies a clearly local HealthGuard safety response so the demo remains usable.
