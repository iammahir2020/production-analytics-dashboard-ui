# Khata — Visual Direction

Confirmed direction for the Production Analytics Dashboard. Specimen: https://claude.ai/artifact/8YpmauiFaGuMrMNTfsoYcG

## Direction and feel

A shopkeeper's ledger back office — not a generic SaaS dashboard. Grounded in Bangladesh e-commerce: Cash-on-Delivery as the dominant payment mode, courier partners (Pathao, Sundarban, RedX, Steadfast) as the real operational anxiety point, mobile financial services (bKash/Nagad/Rocket) as the market's actual "money moved safely" color language, and the lakh/crore convention for large Taka figures.

Feel: grounded, efficient, quietly confident with money — not playful, not glossy-consumer, not a cold trading-floor either. A well-run shop's back office.

**Rejected defaults:** cool blue/indigo SaaS accent (→ deep rose, bKash-association-grounded, not a literal brand copy); rounded pill/badge status chips (→ ledger-stamp left-border + colored text, no pill shape — pills are the clearest "AI dashboard" tell); Western thousands-grouped currency (→ lakh-grouped, `৳45,59,700` not `৳4,559,700`, verified via `Intl.NumberFormat("bn-BD", { numberingSystem: "latn" })`); Geist/default grotesk with size-only hierarchy (→ Hanken Grotesk, weight-driven).

## Typeface

**Hanken Grotesk** for everything — one family, weight-driven hierarchy (no second family; this is a data-dense ops tool, not an editorial page). Load via `next/font/google`. Replaces the Geist default from shadcn's Nova preset init (step 2).

- Weights in use: 400 (body), 500 (labels/medium body), 600 (semibold — status text, card labels), 700 (H2), 800 (display/hero figures)
- All dynamic numbers (currency, counts, dates in tables) get `font-variant-numeric: tabular-nums`

## Depth strategy

**Borders-only.** No drop shadows anywhere except a single restrained ring for floating elements (dropdowns/popovers), never stacked/layered shadows — that reads glossy-consumer, not workbench-tool. Borders should be low-opacity and barely visible except where they're doing real structural work.

## Spacing & density

- Base unit: 4px
- Tables/cards/controls: 12–16px padding (workbench-tight — the orders table needs to stay dense and scannable)
- Section-to-section gaps: 48px (generous — lets the dense zones breathe against each other, per "vary rhythm on purpose")

## Type scale

Not a strict ratio — weight-driven per the skill's own guidance (weight + color separate tiers more cleanly than size alone at this density). Reference sizes:

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display (hero figures) | 32px | 800 | `letter-spacing: -0.01em`, tabular-nums |
| H2 (section headings) | 20px | 700 | |
| Body | 14px | 500 | |
| Body secondary | 14px | 400 | `color: ink-secondary` |
| Label (card labels, table headers) | 11px | 600 | uppercase, `letter-spacing: 0.08em` |

## Color — both themes

Dark is not a naive inversion of light — each token keeps its semantic role but shifts weight (e.g. the accent brightens rather than just flipping lightness), borders switch from a solid warm hex to a low-opacity white overlay.

| Token | Light | Dark |
|---|---|---|
| Accent | `#A22A52` | `#E0567F` |
| Accent foreground | `#FDF4F7` | `#1A0A10` |
| Ground (page bg) | `#F5F2EA` | `#17130F` |
| Surface (cards/tables) | `#FCFAF4` | `#201A14` |
| Surface raised | `#FFFFFF` | `#241D16` |
| Ink (primary text) | `#241D16` | `#F3ECDF` |
| Ink secondary | `#5B5044` | `#C9BEAC` |
| Ink muted | `#8A8072` | `#8F8574` |
| Border | `#E6DECF` | `rgba(243,236,223,.10)` |
| Border strong | `#D8CDB8` | `rgba(243,236,223,.16)` |
| Success | `#3F7A5C` | `#6FAE8C` |
| Warning | `#9C6B1F` | `#D1A54B` |
| Danger | `#A6432E` | `#D97A62` |
| Neutral status | `#8A8072` | `#A89D8B` |

Distribution: ~60/30/10 — ground/surface/border carry the page, accent is used with intention (interactive/active state, hero currency figures), never decoratively.

## Key component patterns

**Order status — ledger-stamp treatment, not a pill badge.** A 3px left-border color bar on the row + a small colored dot + colored semibold text label. No background fill, no rounded badge shape. Mapping (5 order statuses → the palette above, no extra hues invented):
- `pending` → warning
- `processing` → accent (order actively "in motion" — reuses the brand color rather than adding a 6th hue)
- `completed` → success
- `cancelled` → neutral status (not alarming — a cancellation isn't a failure state)
- `refunded` → danger

**Summary card (hero stat).** Label: 11px/600/uppercase/tracked/muted. Value: 26–32px/800/tabular-nums/primary ink (or accent for the single most important figure — revenue). No fake deltas/trend arrows — don't invent period-over-period comparison data that doesn't exist in the mock dataset.

**Currency formatting.** `৳` prefix + lakh-grouped digits (`৳45,59,700.00`), built manually (not `Intl`'s currency style — see `lib/format.ts`'s own comment for why `en-BD`/`bn-BD` don't give this directly).

**Theme toggle.** 3-state segmented control (Light/Dark/System), bordered pill, active segment filled with accent + accent-foreground text. Prototyped in the specimen artifact; real implementation via `next-themes` (step 13.1–13.2).

## Naming

"Khata" (খাতা — ledger/account book) was used as the specimen's working name. Not yet adopted anywhere in the actual codebase/package.json — open question for the user, not decided.
