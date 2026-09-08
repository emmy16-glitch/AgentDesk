# Visual QA — Phase 2 difference report

Live implementation compared against the reference design `bnb.png` (1312×1199).

Screenshots are captured with Playwright driving a real Chromium (149.0.7827.0) at
four breakpoints, then measured numerically with `tests/analyze.py` and
`tests/analyze2.py` (pixel row/column scanning) rather than judged by eye.

Captures are taken against a **production build** (`next start`), not the dev
server, so no HMR overlay or dev-only artefacts are included.

## Method

| Tool | Purpose |
| --- | --- |
| `tests/visual.spec.ts` | Screenshots + structural assertions at 1440 / 1280 / 768 / 390 |
| `tests/measure.spec.ts` | Dumps real `getBoundingClientRect` geometry and computed styles to JSON |
| `tests/analyze.py` | Locates content bounds, navbar, sidebar and card gutters by scanning pixels |
| `tests/analyze2.py` | Measures headline cap-height, line pitch, cube bbox and average gold |

Browser note: the Playwright CDN is unreachable from the sandbox, so Chromium is
extracted from the `@sparticuz/chromium` npm tarball. See "Running" below.

## What matched before this pass

- **Background colour** — `#03080d` live vs `#03070d` reference (within 1/255).
- **Gold hue** — page-wide average `#f5c33f` vs `#f7c33b` reference.
- **Cube size and vertical placement** — gold bbox `y 182..377` vs `y 183..377`.
- **Structure** — navbar, hero, filters, 4-up card grid, three sidebar panels,
  stats footer all present in the correct order.
- **Card gutters** — 16px, against 13–14px in the reference.

## What differed, and the fix

### 1. Container width — the systemic error

The `min-width: 1180px` rule widened the shell to `min(1520px, 100% - 48px)`.
At 1440px that yielded a 1392px container against the reference's 1242px — **12.1%
too wide**. Every child inherited the stretch, so the hero, cube and cards were all
proportionally wrong.

Fixed by locking the wide breakpoint to `min(1242px, 100% - 48px)`.
Content margins went from 20/99 (left-biased) to **99/99 (centred)**.

### 2. Cube horizontal position

Followed from the container. Cube centre was at 54.9–57.0% of viewport width;
reference sits at **55.9%**. After the container fix and a 66/34 hero split it
lands at 55.9%.

### 3. Headline wrapped to three lines

"AI Agents on BNB Chain." measures **585px** at 45px/-1.6px, but the copy column
only offered 553–578px, so it broke onto a third line and collided with the CTAs.
The hero grid is now `minmax(600px, 66%) / minmax(290px, 34%)`.

### 4. Typography — wrong typeface

`font-family` was hardcoded to **Arial**; the reference uses a tighter grotesque.
Now self-hosted **Inter** via `@fontsource/inter` (no external font requests —
Google Fonts is unreachable from the sandbox anyway).

Cap-height moved to **35 / 42px** against the reference's 35 / 41px, and line
pitch to **55px**, exactly matching.

### 5. Feature row overlapped the CTAs

`.hero-features` was absolutely positioned at `bottom: 36px` and, once the
headline reflowed, sat on top of the buttons. Repositioned to `bottom: 26px`.

### 6. Agent names clipped

`white-space: nowrap` on `.agent-card h2` overflowed the card. The name is now
wrapped in a `<span>` that ellipsises, `h2`/header children get `min-width: 0`,
the icon shrank 64→54px and the title 15→14.5px.

Note the renamed agents ("HealthGuard AI", "RebalanceGuard") are materially longer
than the reference's "Guardian AI" / "RiskLens", so at 4-up the two longest still
ellipsise. They render in full from 1280px down, where the grid goes 2-up.

## Intentional differences from the reference

These follow from the wallet/Camber integration and are **not** regressions:

- Wallet shows "No wallet connected" / "— tBNB" / "Connect Wallet" instead of a
  hardcoded `0x8a3f…91c2` / `0.4823 tBNB` / "Disconnect".
- Buttons read "Connect to Hire" rather than "Hire Agent" (gated on connection).
- Assistant shows an empty state instead of a canned "Safe to hire" verdict.
- "My Active Agents" is 0, since nothing has been hired on-chain.
- Agents renamed: Guardian AI → HealthGuard AI, RiskLens → RebalanceGuard.

## Responsive behaviour

| Breakpoint | Layout | Result |
| --- | --- | --- |
| 1440 | 4-up cards, right sidebar | Pass |
| 1280 | 4-up cards, right sidebar | Pass |
| 768 | 2-up cards, sidebar as 3-col strip | Pass |
| 390 | 1-up cards, sidebar stacked, nav links hidden | Pass |

All four assert zero horizontal overflow and zero console errors.

## Status

- `npm run build` — passes, 9/9 static pages
- `npx tsc --noEmit` — 0 errors
- `npx playwright test` — 12/12 passing

## Running

```bash
# One-time: extract Chromium from the npm tarball (CDN is blocked).
npm i @sparticuz/chromium --no-save
node -e "const z=require('zlib'),f=require('fs');f.mkdirSync('/tmp/chromium-bin',{recursive:true});
f.writeFileSync('/tmp/chromium-bin/chromium',z.brotliDecompressSync(
  f.readFileSync('node_modules/@sparticuz/chromium/bin/chromium.br')));"
chmod +x /tmp/chromium-bin/chromium
mkdir -p /tmp/chromium-bin/lib && tar xf <(node -e "const z=require('zlib'),f=require('fs');
process.stdout.write(z.brotliDecompressSync(f.readFileSync(
  'node_modules/@sparticuz/chromium/bin/al2023.tar.br')))") -C /tmp/chromium-bin/lib

# Then, against a production build:
npm run build && npx next start -H 0.0.0.0 -p 3000 &
LD_LIBRARY_PATH=/tmp/chromium-bin/lib/lib npx playwright test
```

`CHROMIUM_PATH` overrides the binary location for CI.
