# Khata — Visual Direction

Confirmed direction for the Production Analytics Dashboard. Specimen: https://claude.ai/artifact/8YpmauiFaGuMrMNTfsoYcG

**Revised 17 Sep 2026 (Phase 2b — density & composition pass).** The first
dashboard build followed this spec correctly on every individual token but
still read as flat: five full-width sections at one hierarchy level, laid
out with landing-page spacing on a data surface. This section's sizes,
weights and padding numbers below are the corrected ones the code now
actually uses. The color tokens further down were **not** the problem —
measured against a comparable dense dashboard (Linear), our surface/border
steps were already in the right range — and are unchanged from the
original confirmation. Density specimen:
https://claude.ai/artifact/R8K26YFZEYLehT8QvZh2jA

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

Revised down in Phase 2b — the original numbers below were landing-page
spacing applied to a data surface (a dashboard needs to function like an
instrument panel, not a gallery).

- Base unit: 4px
- Grid gutters (between panels): 8px (was 32px between sections)
- Panel/card padding: 12px via `<Card size="sm">` — shadcn's own density
  variant, already in the codebase, just not previously used for anything
  dashboard-facing
- Chart panels specifically: tighter still (~5–10px) — a plot doesn't need
  the same breathing room as text, so it doesn't get the same padding

## Type scale

Weight band capped at **400–600** — `font-extrabold` (800) was in the
original hero figures; removed. Hierarchy comes from size + color, not
boldness. Tracking tightens as size increases:

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero KPI figure (revenue) | 28px | 500 | −0.018em | tabular-nums, `text-primary` |
| Compact KPI figure | 20px | 500 | −0.012em | tabular-nums |
| Body | 14px | 500 | normal | |
| Body secondary | 14px | 400 | normal | `color: ink-secondary` |
| Label (card labels, table/ledger headers) | 10–11px | 600 | `tracking-wider` (0.05em) | uppercase |

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
| Grid line *(new, Phase 2b)* | `rgba(36,29,22,.06)` | `rgba(243,236,223,.06)` |
| Success | `#3F7A5C` | `#6FAE8C` |
| Warning | `#9C6B1F` | `#D1A54B` |
| Danger | `#A6432E` | `#D97A62` |
| Neutral status | `#8A8072` | `#A89D8B` |

Distribution: ~60/30/10 — ground/surface/border carry the page, accent is used with intention (interactive/active state, hero currency figures), never decoratively.

**Border vs. grid line.** `Border` marks a panel's own edge. `Grid line`
is lighter and marks a rule *inside* one — ledger row dividers, chart
gridlines. Added once panels actually had distinct shapes for an edge to
bound; before Phase 2b there was only ever one visible boundary per
section, so a second, subtler rule token had nothing to differentiate
itself from.

## Key component patterns

**Order status — ledger-stamp treatment, not a pill badge.** A 3px left-border color bar on the row + a small colored dot + colored semibold text label. No background fill, no rounded badge shape. Mapping (5 order statuses → the palette above, no extra hues invented):
- `pending` → warning
- `processing` → accent (order actively "in motion" — reuses the brand color rather than adding a 6th hue)
- `completed` → success
- `cancelled` → neutral status (not alarming — a cancellation isn't a failure state)
- `refunded` → danger

**Summary card (hero stat).** No longer four equal cards — a 12-column
strip, revenue's tile spanning 6/12 (hero, `text-primary`, 28px/500),
the other three at 2/12 each (20px/500). Sized by importance, not split
evenly.

**Period deltas — real ones only, still no fabrication.** The original
rule stands: don't invent period-over-period data the mock dataset can't
support. What changed is that revenue and order-count deltas turned out to
be honestly computable (trailing 30 days vs. the prior 30, from real order
timestamps) — see `lib/api/analytics.ts`'s `periodDelta()`. Active
customers and conversion rate still get **no** delta: the mock data has no
per-period join tracking or per-period visitor counts, so a trend there
would still be invented.

**Charts are housed, not floating.** Both live in a bordered panel
(`ExpandableChart`) with a Y axis (lakh-scaled on revenue) — the original
build had neither, so a chart's shape was visible but its magnitude
wasn't. Revenue leads at 8/12 columns, orders trails at 4/12, side by side
at ~128px tall rather than stacked at 256px each. Each panel has an
always-visible corner control to view the chart full-size in a dialog —
hover-only would be undiscoverable on a dashboard and dead on touch.

**Recent orders is a ledger, not a list.** Real column structure — date /
particulars / status / amount — hairline rules between rows (a new,
lighter `--grid-line` token distinct from `--border`, see the color table
below), cancelled/refunded rendered in red ink with parenthesised amounts
(real double-entry convention), and a double-ruled net total
(`border-style: double`) at the foot. This is the direction's actual
signature — খাতা is an account book — and was previously only expressed as
a 3px border.

**Currency formatting.** `৳` prefix + lakh-grouped digits (`৳45,59,700.00`), built manually (not `Intl`'s currency style — see `lib/format.ts`'s own comment for why `en-BD`/`bn-BD` don't give this directly).

**Theme toggle.** 3-state segmented control (Light/Dark/System), bordered pill, active segment filled with accent + accent-foreground text. Prototyped in the specimen artifact; real implementation via `next-themes` (step 13.1–13.2).

## Naming

"Khata" (খাতা — ledger/account book) was used as the specimen's working name. Not yet adopted anywhere in the actual codebase/package.json — open question for the user, not decided.
