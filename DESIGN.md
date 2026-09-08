---
version: beta
name: "AgentDesk"
description: "A task-first BNB Chain marketplace where source-backed agents prove fit before hiring."
colors:
  background: "#03080D"
  surface: "#09121B"
  card: "#0A131C"
  primary: "#F2BD3E"
  success: "#0ECB9D"
  text: "#F7F8FB"
  muted: "#7E8A9A"
typography:
  sans:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
rounded:
  DEFAULT: "0.625rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  page-max: "77.625rem"
  column-gap: "1.125rem"
  card-padding: "1rem"
components:
  marketplace-card:
    backgroundColor: "#0A131C"
    rounded: "0.625rem"
  dashboard-panel:
    backgroundColor: "#09121B"
    rounded: "0.625rem"
  primary-button:
    backgroundColor: "#F2BD3E"
  status-indicator:
    backgroundColor: "#0ECB9D"
  primary-copy:
    textColor: "#F7F8FB"
  metadata:
    textColor: "#7E8A9A"
---

# AgentDesk Design System

## Creative north star

A compact, exchange-quality BNB interface in a near-black control room. BNB gold is reserved for primary decisions and the illuminated agent cube. The visual language should feel operational rather than speculative.

The product thesis is defined in `HACKATHON_LOCK.md`:

> **Don't trust the profile. Audition the agent.**

The design system must support that thesis. It must never make a decorative score look more authoritative than the underlying evidence.

## Product context

- **Audience:** BNB Chain users trying to choose an agent for a specific task.
- **Primary job:** describe/select a task, discover relevant agents, inspect current evidence, audition candidates, compare, then hire the chosen agent through a real commerce path.
- **Locale:** English (`en`).
- **Usage scene:** desktop and mobile decision-making; advanced Web3 protocol detail is available but is not a prerequisite for using the marketplace.
- **Memorable signature:** the glowing BNB cube and monitor/trade/optimize/protect markers.
- **Restraint:** quiet dark panels, thin borders, sparse gold glow, no generic neon-crypto treatment.
- **Runtime token owner:** Tailwind v4 `@theme` in `app/globals.css`; `app/responsive-hardening.css` contains later responsive corrections.

## Evidence-first visual hierarchy

The interface should make the distinction between evidence states obvious:

```text
registry listed
≠ identity resolved
≠ metadata resolved
≠ endpoint reachable
≠ audition passed
≠ hired
≠ completed
```

Do not collapse these into a generic blue check or a single “verified” badge.

Preferred evidence UI:

- source name and ID;
- checked/observed timestamp;
- explicit state labels such as `REGISTRY LISTED`, `REACHABLE`, `AUDITION COMPLETE`;
- source links / evidence drawers;
- missing evidence shown as missing rather than converted to a positive-looking zero or score.

## Colors

`background` anchors the canvas. `surface` and `card` create low-contrast depth with cool blue-black borders. `primary` is BNB gold for the primary user path and selected states. `success` means a specific check succeeded; it must not mean an agent is globally safe or trustworthy.

Use warning/error colors for unavailable, timeout, unsupported, or failed checks without implying malicious intent.

## Typography

Use a dense neutral system stack. Hero display uses heavy weight and tight tracking. Panel headings and controls use 600–700 weight. Evidence labels and metadata can be smaller, but must remain readable. Real registry names are unbounded user/external content: they must wrap or truncate accessibly rather than break layout.

## Layout

- Canonical desktop shell: centered, max width approximately 1242px.
- Current discovery view may retain the marketplace + utility-sidebar structure during Phase 1.
- The product evolves toward a task-first surface in Phase 2/3; do not protect the old four-card grid at the expense of the audition flow.
- At narrower widths the sidebar stacks and discovery/compare surfaces reduce columns without horizontal page overflow.
- Category/task controls must remain horizontally scrollable/reachable on mobile.

## Components

### Hero

Primary message:

> **Don't trust the profile. Audition the agent.**

The hero should explain the user benefit before protocol names. ERC-8004, ERC-8183, A2A, MCP and x402 belong in evidence/developer detail unless directly relevant to the current decision.

### Task entry

The target first interaction is:

> **What do you want an agent to do?**

The four required task families are Health Factor Monitoring, Yield Optimisation, Grid Trading and Rebalancing. Their forms may differ because the task inputs genuinely differ.

### Discovery cards

Cards are candidate summaries, not proof by decoration. Prioritize:

1. real agent name / source identity;
2. evidence-backed category/capability match;
3. source-attributed reputation/activity fields if available;
4. provenance and freshness;
5. current operational state when checked;
6. inspect/audition action.

Do **not** prioritize invented global trust percentages, invented interaction counts, invented uptime, fabricated performance duration, or fake verification badges.

### Audition results

Audition surfaces should prioritize:

- status: complete / unsupported / timeout / error;
- task-specific output;
- latency;
- quote and expiry when real;
- raw/source-linked evidence;
- freshness;
- explainable Task Fit reasons;
- missing evidence.

Preferred ranking labels: `BEST FIT`, `STRONG FIT`, `PARTIAL FIT`, `NOT ENOUGH EVIDENCE`.

### Comparison

Use side-by-side rows where the user can see *why* candidates differ. Highlight a row only when the underlying evidence genuinely differs. Never hide missing evidence inside a composite score.

### Hiring

The primary hire state must eventually represent a real Agent Studio / ERC-8183 job and returned result. The legacy BSC Testnet activation contract may be shown only in explicitly marked prototype/developer context.

## Forms and overlays

Search, task forms and assistant fields use dark bordered inputs with visible focus states. Wallet selection is app-owned. Async operations must keep the initiating control and status understandable: waiting, timeout, failure and completion are distinct states.

## Iconography

Use Lucide icons and inline SVG marks, never emoji. Colored icon tiles can represent task categories or agent identity. A check icon means only the specific check named beside it passed.

## Motion

Motion is limited to short hover lifts, reveal transitions and status changes. Respect `prefers-reduced-motion`.

## Accessibility and resilience

- WCAG 2.2 AA target.
- No horizontal page overflow at supported mobile widths.
- All category/task choices keyboard reachable.
- External names/descriptions must not break layout.
- Errors must not erase the user's task input.
- Empty source results are valid product states; do not fill them with fake inventory.

## Do's and don'ts

- **Do:** keep the BNB cube as the primary expressive visual.
- **Do:** make provenance inspectable.
- **Do:** show timestamps and evidence-state labels.
- **Do:** optimize the main journey for the user's task.
- **Don't:** turn ERC-8004 into a decorative verification badge.
- **Don't:** reintroduce static trust/uptime/user-count demo metrics into judge-facing UI.
- **Don't:** preserve the old four-card screenshot layout if it conflicts with task-first audition UX.
- **Don't:** call a prototype activation a completed agent hire.
