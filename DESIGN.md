---
version: alpha
name: "AgentTrust"
description: "A dark BNB Chain marketplace that helps people compare and hire verified AI agents."
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
    fontFamily: "Arial, ui-sans-serif, system-ui, sans-serif"
  display:
    fontFamily: "Arial, ui-sans-serif, system-ui, sans-serif"
rounded:
  DEFAULT: "0.625rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  page-max: "77.5rem"
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

# AgentTrust Design System

## Overview

### Creative North Star

The supplied AgentTrust BNB marketplace capture: a compact exchange-quality dashboard in a near-black control room, with BNB gold reserved for trust, activation, and the illuminated 3D agent cube.

### Product context and register

- **Audience and primary job:** BNB Chain users comparing verified autonomous agents before activation.
- **Target market(s) and evidence:** Global English-language Web3 marketplace, evidenced by the supplied marketplace content and BSC Testnet controls.
- **Locale(s) and language policy:** English (`en`); concise product labels and compact numeric data.
- **Usage scene:** Desktop-first exploration, with the wallet and assistant visible alongside the agent catalog.
- **Register:** Hybrid brand/product. The hero cube is expressive; card data and assistant panels stay operationally dense.
- **Memorable signature:** The glowing, faceted BNB cube and its surrounding monitor/trade/optimize/protect markers.
- **Restraint:** Card surfaces and dashboard panels use quiet tonal separation rather than broad gradients or decorative glass.
- **Anti-references:** Generic neon crypto landing pages, oversized rounded SaaS cards, and emoji iconography.
- **Token ownership/runtime mapping:** The hand-authored Tailwind v4 `@theme` block in `app/globals.css` is canonical. This file mirrors its values; shared page and component styles consume those runtime tokens.

## Colors

`background` anchors the canvas. `surface` and `card` create low-contrast depth with cool blue-black borders. `primary` is an expressive BNB gold for primary actions, active navigation, and the cube glow. `success` identifies positive agent and network state. White is reserved for primary names and metrics; `muted` is used for supporting metadata.

## Typography

The system stack is intentionally neutral and dense. Hero display uses 800 weight and tight tracking; panel headings and controls use 600–700 weight. Supporting metadata stays 10–13px with generous line-height so the data-dense cards remain legible.

## Layout

The desktop shell is a fixed marketplace column plus 304px dashboard column with an 18px gap. The catalog is a four-card grid. At narrow widths, the sidebar stacks and cards reduce to two then one column. The main reference viewport uses a 1255px left-aligned content region to preserve the visible dashboard edge.

## Elevation & Depth

Depth comes from dark tonal layers, thin blue-black borders, inset highlights, and sparse gold glows. Only the hero cube and primary activation controls emit warm light.

## Shapes

Panels and cards use 10px corners; controls use 7–10px corners. Category filters are the only intentional pills. Lucide and small inline SVG icons use consistent rounded strokes.

## Components

### Foundational visual states

Buttons brighten on hover and expose a gold visible focus ring. Cards lift slightly on hover. Reduced-motion disables these enhancements. Search has an owned clear action when it contains text.

### Buttons and actions

Gold solid buttons are for activation, connection, and the primary marketplace path. Outline/dark buttons are secondary. Green indicates current/healthy state, not a primary action.

### Navigation and data display

The active navigation item has a gold underline. Agent cards prioritize icon, category, trust score, compact metrics, capability checklist, price, and one activation action in that order.

### Forms and overlays

Search and assistant fields are dark, bordered inputs with a visible focus state. Wallet selection is an app-owned modal; hire actions preserve their geometry while waiting for wallet confirmation and the BSC Testnet receipt. Success and failure appear inline at the action that caused them.

### Iconography

Use Lucide icons and inline SVG marks, never emoji. Filled colored icon tiles are reserved for agent identity; utility icons remain outlined.

### Motion

Motion is limited to short hover lifts and color transitions. It is disabled for reduced-motion preference.

### Content and data visualization

Use direct action labels such as “Hire Agent” and data-first labels such as “Trust Score”, “Interactions”, and “Uptime”.

## Do's and Don'ts

- **Do:** Keep the 3D BNB object as the sole expressive visual centerpiece.
- **Do:** Maintain the permanent desktop dashboard beside the hero and catalog.
- **Don't:** Use broad bright gradients on ordinary panels.
- **Don't:** Replace the catalog’s compact trust and capability data with spacious marketing cards.
