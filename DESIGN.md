---
version: beta
name: "AgentDesk"
description: "A task-first BNB Chain marketplace where source-backed agents prove fit before hiring."
colors:
  background: "#070809"
  surface: "rgba(16, 18, 20, 0.78)"
  card: "rgba(20, 22, 25, 0.68)"
  primary: "#F3BA2F"
  success: "#5BD78B"
  text: "#F5F5F2"
  muted: "#74777D"
typography:
  sans:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
  display:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
rounded:
  DEFAULT: "0.625rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  page-max: "73.75rem"
  column-gap: "1.125rem"
  card-padding: "2rem"
components:
  marketplace-card:
    backgroundColor: "rgba(20, 22, 25, 0.68)"
    rounded: "1rem"
  dashboard-panel:
    backgroundColor: "rgba(16, 18, 20, 0.78)"
    rounded: "1rem"
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

A continuous six-step AgentDesk experience in a dark cinematic BNB environment. Soft glass and matte-metal surfaces support the task; the supplied environmental BNB artwork is the sole expressive visual. BNB gold is reserved for the primary decision, the active step, and small orientation details.

The product thesis is defined in `HACKATHON_LOCK.md`:

> **Don't trust the profile. Audition the agent.**

The design system must support that thesis. It must never make a decorative score look more authoritative than the underlying evidence.

## Product context

- **Audience:** BNB Chain users trying to choose an agent for a specific task.
- **Primary job:** describe/select a task, discover relevant agents, inspect current evidence, audition candidates, compare, then hire the chosen agent through a real commerce path.
- **Locale:** English (`en`).
- **Usage scene:** desktop and mobile decision-making; advanced Web3 protocol detail is available but is not a prerequisite for using the marketplace.
- **Memorable signature:** one persistent, blended BNB environmental artwork behind a calm, task-first workflow.
- **Restraint:** spacious dark glass, thin low-contrast borders, sparse gold, and no dashboard density or generic neon-crypto treatment.
- **Runtime token owner:** `app/agentdesk-flow.css` owns the `--ad-*` workflow tokens. `app/globals.css` adapts the Geist body font and Tailwind theme for the rest of the application.

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

Use Geist Sans throughout. Hero display is 650–700 with tight tracking and is used selectively; headings, controls, and evidence retain a calm 500–650 weight range. Real registry names are unbounded user/external content: they must wrap or truncate accessibly rather than break layout.

## Layout

- Canonical desktop shell: centered, max width 1180px, with 32px desktop and 18px mobile gutters.
- `AgentDeskShell` owns the navigation, environmental artwork, progress stepper, and base responsive behavior. Workflow content transitions in place without swapping the environment.
- The primary flow is Ask → Details → Test → Best match → Check → Hire. The old utility sidebar and registry grid are not part of this guided surface.
- At narrow widths, the shell uses one column, an abbreviated “Step n of 6” indicator, full-width actions, and a darker/right-shifted environmental object. No horizontal page overflow is allowed.

## Components

### Hero

Primary message:

> **What do you want an agent to do?**

The opening task surface explains the benefit before protocol names. ERC-8004, ERC-8183, A2A, MCP and x402 belong in evidence/developer detail unless directly relevant to the current decision.

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

Task forms use dark bordered inputs with visible focus states. Wallet selection is app-owned and appears only at the Hire stage. Async operations must keep the initiating control and status understandable: waiting, timeout, failure and completion are distinct states.

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
