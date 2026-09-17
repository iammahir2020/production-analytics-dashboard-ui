# Build Steps — Production Analytics Dashboard

Each step is a single, reviewable unit of work. Check it off after reviewing, then move to the next. Steps marked **(pause)** touch external/shared systems (GitHub, Vercel) and will always be confirmed before running, regardless of checklist state.

**Commit points:** marked with 🔖 at the end of a phase. These are *suggestions only* — commits are never made automatically. When we reach one, I'll say so and propose a commit message describing what that phase actually built; you decide whether and when to run `git commit`.

**Companion file:** [`learn.md`](learn.md) gets a new entry after every step — a plain-language explanation of what was done and why, building into a full study record of the build. Each entry includes a **Commands run** list: the actual shell commands executed for that step, with whatever flags/config/presets were passed — a real trace of what ran, not just a description of it.

**Before each step**, I give a short heads-up covering: what we're about to do, why this approach over the obvious alternative, what problem/mistake it's specifically guarding against, and how it moves the build forward. That's the forward-looking version; `learn.md`'s entry afterward is the record of what actually happened.

**Engineering standards held throughout (not one-off steps — applied continuously as each piece is built):**
- Debounce input handlers that trigger fetches or expensive work (e.g. the orders search box)
- Keep files small and single-purpose — split a component/module up rather than letting one file grow to do several jobs
- Paginate any list that can grow large (orders table); keep naturally-short lists (recent orders/activity on the dashboard) simple, un-paginated
- Any image that ends up in the UI goes through `next/image` (automatic compression/optimization) — flagged case by case if one comes up, since the current design doesn't require any
- No unnecessary re-renders; no dependency added without a real reason
- Keep code simple and direct — no over-engineering, no code that looks meaningful but isn't actually doing anything (see project memory on this)
- UI must read as deliberately designed — modern, distinctive, and polished, not a generic templated "AI slop" look. See the design checkpoint before Phase 2.
- **Server → Client Component props carry data or rendered elements, never functions.** A closure passed from a Server Component into a `"use client"` component's props builds and typechecks clean but throws at request time ("Functions cannot be passed directly to Client Components") — only actually running the server catches it. Pass a pre-rendered `ReactNode` instead (same mechanism `children` already uses). Relevant again for Phase 3's `FiltersBar`/`OrdersTable` split (Server shell feeding Client components) — found in Phase 2b's `ExpandableChart`
- **Every responsive grid/flex span gets an explicit value at the smallest breakpoint it applies to, not just the breakpoint being changed.** `lg:col-span-6` with no base span silently defaults to `col-span-1` below `lg` — it'll build, lint, and typecheck clean, and only show up on an actual narrow screen. Set the mobile-first span, then layer breakpoint overrides on top of it. Found in Phase 2b's `SummaryCards` hero tile
- **A skeleton changes in the same step as the real layout it shadows, never after.** A mismatched skeleton causes a visible layout jump when real content streams in — that's a regression, not a neutral omission
- **Any header/content that shares a corner with an absolutely-positioned control (a dialog close button, a corner overlay action) reserves explicit clearance for it.** Edge-to-edge content and a corner overlay don't coexist safely by default — found in Phase 2b's `ExpandableChart` modal header colliding with shadcn's `DialogContent` close button
- **After any visual/layout phase, do a real-screen review, not just a clean `build`/`lint`/`tsc`.** All four bugs above passed every automated check; none are the kind those tools can catch (one's purely visual, three are breakpoint- or runtime-conditional)
- **When two or more panels sit as siblings in the same grid row, check they actually match height, not just that the grid "should" stretch them.** `Suspense`/`SectionBoundary`/`ErrorBoundary` render no wrapping DOM element, so the grid's own `align-items: stretch` stops at each panel's outer wrapper `div` — the `<section>`/`Card` inside need explicit `h-full`/`flex-1` to actually fill it. Found between Order status/Top products and again between Recent orders/Recent activity
- **A page-wide layout value (container max-width, etc.) may exist in more than one independent place.** `app/layout.tsx`'s `<main>` and `components/shared/app-header.tsx`'s header row each hard-coded their own `max-w-*` — changing one without checking for the other would have misaligned the header against the page content. Grep for a value before assuming one edit covers it
- **Current type/density baseline for any new component (build against this, not Phase 2b's original tighter scale):** page container `max-w-7xl`; section headings 13px via the shared `<SectionHeading>` (`components/shared/section-heading.tsx`) — extract into it rather than re-typing the literal className a 6th time; body/list text 14–15px; card padding 16px (Card's own default — don't reach for `size="sm"` reflexively); chart/donut heights around 160px. Recalibrated from the original Phase 2b numbers, which were correct for fixing flatness but ended up calibrated against Linear's all-day power-user density rather than this app's actual "glanced at, not lived in" audience
- **A Recharts tooltip that needs more than the raw `dataKey`/`value`** (a real label, a matching color, anything from the underlying domain object) **reads it off `item.payload` in a custom `formatter`**, not off `name`/`value` alone — `name` is often just the raw data key. See `StatusDonut`'s tooltip for the pattern
- **"How many data dependencies does this page have" isn't the only Suspense-boundary question — "what UI must never be in the blast radius when that dependency refetches" is a second, separate one.** A page can have exactly one data dependency and still need a boundary narrower than the whole route, if something on it (a filter bar, any always-interactive control) doesn't itself depend on that fetch. Without that narrower boundary, the nearest `loading.tsx` fallback replaces the *entire* page on every refetch — unmounting and remounting live, focused inputs on every interaction. Found in `/orders`: fixed by splitting the data-dependent part into its own component (`OrdersResults`) under its own `<Suspense>`, with `FiltersBar` rendered outside it
- **A Base UI form primitive doesn't necessarily do the obvious thing by default — check its actual type, don't assume.** `SelectValue` renders the raw selected value, not the matching option's label, unless given an explicit `children` mapping function. Same category as `ToggleGroup`'s array-valued single-select from earlier — read the type (`find node_modules/@base-ui/react/<component> -iname "*.d.ts"`) before trusting an assumption carried over from a different library's API shape
- **Never combine an all-sides `border-{color}` utility with a directional one (`border-l-{color}`, `border-r-{color}`) on the same element — always use directional color utilities for every side that needs one, even the "default" sides.** `tailwind-merge` treats the all-sides utility as conflicting with the directional one and drops it entirely (not just the shared side) when the two appear together, silently leaving the non-overridden sides with no real color at all. Confirmed as a real shipped bug once already (the Phase 2b ledger) and caught again before shipping in the orders table's sticky column — worth checking for on sight now, not re-diagnosing from scratch each time it recurs
- **A `border` on a `position: sticky` cell inside a `border-collapse` table doesn't reliably repaint at its current scrolled position (worst in Chrome) — use `box-shadow` for any accent/edge on a sticky table cell instead.** `box-shadow` isn't part of the border model and isn't affected by `border-collapse` at all. Two insets can combine in one declaration (`inset 3px 0 0 0 {color}, inset -1px 0 0 0 var(--border)`) for a status stripe + edge separator together. See `components/orders/sticky-ledger-cell.tsx`, the shared component both ledger tables use for their sticky leading column

## Phase 0 — Project Setup

- [x] 1. Scaffold Next.js 14+ project (App Router, TypeScript strict, ESLint, Tailwind, no `src/`) via `create-next-app`; verify `npm run dev` serves the default page
- [x] 2. Initialize shadcn/ui (`npx shadcn init`) and set base theme/tokens
- [x] 3. Install remaining dependencies: `recharts`, `date-fns`
- [x] 4. Create empty folder structure: `components/{ui,dashboard,orders,shared}`, `lib/{api,types,data}`, `hooks/` (no `lib/utils/` — shadcn's `lib/utils.ts` file already owns that name; formatters go in `lib/format.ts` instead, see step 13)
- [x] 5. `git init`, initial commit — **(pause before creating/pushing to a remote GitHub repo)**

⏸ **Checkpoint — skill files.** This is where you'll add any skill files to the repo for infrastructure, coding-pattern, and UI-design guidance. I'll pick them up and apply them from here through the rest of the build — flag me if I miss one.

## Phase 1 — Types, Mock Data, Service Layer

- [x] 6. Define TypeScript types: `Order`, `Customer`, `Activity`, `AnalyticsSummary`, `RevenuePoint` (`lib/types/`)
- [x] 7. Write a mock-data seed script generating datasets into `lib/data/`
  - [x] 7a. Customers dataset (~50)
  - [x] 7b. Orders dataset (~200, over the last 90 days, referencing customer ids; statuses: pending/processing/completed/cancelled/refunded)
  - [x] 7c. Activity dataset (~30 events)
  - [x] 7d. Total-visitors figure (`mock-analytics.json`) — added during step 11, appended after 7a–7c so the RNG sequence for those was undisturbed; needed as the denominator for conversion rate
- [x] 8. Build `lib/api/client.ts` — `mockFetch` wrapper with artificial delay + configurable fail rate
- [x] 9. Build `lib/api/customers.ts` — `getCustomers()`, active-customer count
- [x] 10. Build `lib/api/orders.ts` — `getOrders(filters)`, `getOrderById(id)`
- [x] 11. Build `lib/api/analytics.ts` — `getSummaryStats()` (revenue, orders, active customers, conversion rate), `getRevenueTimeseries()`
- [x] 12. Build `lib/api/activity.ts` — `getRecentActivity()`
- [x] 13. Build `lib/format.ts` — currency/date formatting helpers

🔖 **Suggested commit point** — types, mock data, and the full service layer are in place.

🎨 **Design checkpoint — first UI phase starts next.** Everything up to here has been infrastructure with no visible UI. Before building `app/page.tsx` and its components, the look needs to be deliberate: a real visual direction (type, color, spacing, density), not default shadcn-out-of-the-box or a generic dashboard template — the goal is a UI nobody mistakes for unreviewed AI output. If design skill files have been added, this is where they get applied; if not, I'll state the direction explicitly before writing the first component so it can be reviewed before it spreads across the rest of the build.

## Phase 2 — App Shell & Dashboard Page (Server Component shell)

- [x] 13.1. Apply the confirmed Khata design tokens (`.interface-design/system.md`) to `app/globals.css` — both themes' colors, Hanken Grotesk font — replacing shadcn's neutral Nova preset values
- [x] 13.2. Install `next-themes`; wrap the root layout with `ThemeProvider` (class-based, matching the `.dark` convention already in `app/globals.css`), 3-state (light/dark/system)
- [x] 13.3. Build `ThemeToggle` (Client Component — needs `next-themes`'s `useTheme` hook)
- [x] 13.4. Build the shared app shell in `app/layout.tsx`: header with Dashboard/Orders navigation links + `ThemeToggle`, styled to the confirmed Khata direction
> **Architecture note (decided during step 14):** the page fetches nothing itself. Each section is an async Server Component behind its own `Suspense` boundary, fetching its own data — so one failing/slow source degrades that section alone, sections stream in independently, and each gets its own skeleton. Sections are drawn around *data dependencies*, not visual boxes: both charts read one `getRevenueTimeseries()` call, so they share a section rather than duplicating the fetch.

- [x] 14. Build `app/page.tsx` as a Server Component shell: each section wrapped in its own `Suspense` boundary; sections fetch their own data (summary, recent orders, recent activity)
- [x] 15. Design `SummaryCards` properly (revenue, orders, active customers, conversion rate) — hero figures per the Khata direction
- [x] 16. Build `ChartsSection` (async Server Component, fetches `getRevenueTimeseries()`) + `RevenueChart` (Client Component, Recharts) receiving pre-shaped data as props
- [x] 17. Add `OrdersChart` (Client Component, Recharts) to the same section — same fetch, no duplication
- [x] 18. Design `RecentOrdersList` properly (ledger-stamp status treatment)
- [x] 19. Design `RecentActivityFeed` properly
- [x] 20. Per-section skeletons matching each section's real layout (replacing the temporary `SectionFallback`), plus `app/loading.tsx` for the shell
- [x] 21. Per-section error boundary with retry (a Client Component wrapping each section), plus `app/error.tsx` for route-level failures

🔖 **Suggested commit point** — dashboard page is complete: summary cards, charts, recent orders/activity, loading and error states.

## Phase 2b — Dashboard density & composition pass

> **Why this phase exists (decided 17 Sep 2026).** The first dashboard pass was reviewed on screen and read as flat: five full-width sections at one hierarchy level, laid out with landing-page spacing on a data surface. Research into how shipped dashboards handle density (Linear, Stripe, Vercel teardowns) confirmed the diagnosis — and independently described our exact page as the canonical AI-generated dashboard. The direction was confirmed against a rendered side-by-side specimen: https://claude.ai/artifact/R8K26YFZEYLehT8QvZh2jA
>
> **Colour tokens are not the fix.** Measured against Linear's (`#08090a`/`#0f1011`/`#23252a`), our existing surface and border steps are already in range. An earlier recommendation to widen the elevation step was **retracted** — the flatness was composition and density, and the confirmed specimen proves it by reading as higher-contrast while using the current tokens verbatim. See `learn.md` for the full reasoning.
>
> **The signature is the ledger.** খাতা is an account book; that's the one thing here no other generic dashboard arrives at, and it's currently spent on a single 3px border. Step 21.4 is the real differentiator, not the grid.

- [x] 21.1. Restructure `app/page.tsx` onto a 12-column grid — KPI strip (hero revenue tile ~span 6 + three compact), charts row (8/4), content row (7/5); section gap 32px → 12px, gutters 8px, panel padding 16px → 10–12px. **Update all four skeletons to match in the same step** — a skeleton that no longer matches its real layout is worse than no skeleton
- [x] 21.2. House both charts in bordered panels; add a lakh-scaled `YAxis` (`৳1.5L`, matching `lib/format.ts`'s existing grouping convention); replace the two stacked 256px charts with one side-by-side row at ~128px
- [x] 21.3. Type pass: cap the weight band at 400–600 (drop `font-extrabold` from hero figures), systematise tracking by size (−0.022em display → +0.02em on small caps), and demote or remove the page `<h1>` since the nav already states location
- [x] 21.4. **Ledger treatment for `RecentOrdersList`** — date / particulars / status / amount columns, hairline rules between entries, red-ink parenthesised negatives for cancelled + refunded, double-ruled net total, tabular figures throughout; row count 5 → 8. The column structure carries straight into the Phase 3 orders table
- [x] 21.5. Add an intra-panel hairline token to `globals.css` (both themes) for rules *inside* a panel — lighter than `--border`, which stays the panel-edge token. The only token addition in this phase; no existing value changes
- [x] 21.6. Build `ExpandableChart` (Client Component wrapping shadcn `Dialog`) + a corner expand affordance, always-visible rather than hover-gated. The expanded view raises tick count, date-label frequency and stroke weight — it shows more, not just bigger. Suppress the last axis label under the button rather than moving the button
- [x] 21.7. Extend `getSummaryStats()` with a prior-period comparison; add deltas + sparkline to the KPI tiles. **The only item in this phase with service-layer work rather than pure UI** — sequenced last so the visual pass can land without it
- [x] 21.8. Update `.interface-design/system.md` with the revised density/type/layout spec, so the written direction doesn't drift from the code

🔖 **Suggested commit point** — dashboard composition pass complete: dense grid, ledger treatment, expandable charts.

## Phase 2c — Dashboard richness (Tier A: real data, no new mock fields)

> **Why this phase exists.** Before starting the orders page, audited what more the dashboard could meaningfully show — full reasoning and the deferred options (payment method, courier, region — all would need new mock-data fields) are in `plan.md`'s "Dashboard metrics" section. Scoped deliberately small: four additions, all pure aggregation over data already in `mock-orders.json`, chosen against the same "four KPI cards, nothing else competing" discipline from the Phase 2b research rather than building everything researched.

- [x] 21.9. Add `StatusBreakdownPoint`/`TopProduct` types (`lib/types/analytics.ts`); add `averageOrderValue` to `AnalyticsSummary`
- [x] 21.10. Add `getOrderStatusBreakdown()` and `getTopProducts(limit)` to `lib/api/analytics.ts`; extend `getSummaryStats()` with `averageOrderValue` (revenue ÷ revenue-generating orders, not ÷ all orders — document why in the code comment)
- [x] 21.11. Add `ORDER_STATUS_COLOR_VAR` to `components/orders/order-status.tsx` — raw CSS-var mapping mirroring the existing `ORDER_STATUS_STYLES` Tailwind-class mapping, one source of truth for status→color; Recharts `Cell` needs a raw value, not a class
- [x] 21.12. Build `OrderStatusBreakdown` (donut + legend, reusing the status palette) + matching skeleton
- [x] 21.13. Build `TopProducts` (ranked list, not a chart) + matching skeleton
- [x] 21.14. Wire both into `app/page.tsx` as a new insights row (5/12 + 7/12) between the charts row and the recent-orders/activity row, each its own `Suspense`/`SectionBoundary` pair; resize `SummaryCards`' KPI strip to 5 tiles (hero `lg:col-span-4` + four compacts `lg:col-span-2`; mobile `grid-cols-4`, hero full row + compacts filling the row beneath — no orphaned cell, applied correctly from the start this time); update `app/loading.tsx` to match, in the same step

🔖 **Suggested commit point** — dashboard richness pass complete: status breakdown, top products, AOV, cancellation rate.

## Phase 3 — Orders Page: Data + Filters

- [x] 22. Build `app/orders/page.tsx` Server Component shell reading `searchParams`, doing the initial filtered fetch server-side
- [x] 23. Build `FiltersBar` (Client Component): debounced search input, status `Select`, date-range picker
- [x] 24. Wire `FiltersBar` to the URL via `useSearchParams`/`useRouter` (native, no library)
- [x] 25. Build `OrdersTable` (Client Component) rendering rows from props
- [x] 26. Build `OrderRow` wrapped in `React.memo`
- [x] 27. Build reusable `Pagination` component, URL-driven `page` param
- [x] 28. Add `app/orders/loading.tsx` — table skeleton
- [x] 29. Add `app/orders/error.tsx` — error boundary with retry
- [x] 30. Build `EmptyState` ("No orders match your filters" + Clear filters CTA) and wire into `OrdersTable`

🔖 **Suggested commit point** — orders page is functional: table, URL-synced filters, pagination, empty/loading/error states.

## Phase 4 — Order Details

- [ ] 31. Build `app/orders/[id]/page.tsx` Server Component — fetch order by id, `notFound()` on invalid id
- [ ] 32. Add `app/orders/[id]/loading.tsx`
- [ ] 33. Build `OrderDetailsView` (customer info, line items, status, timeline) — presentational
- [ ] 34. Link each `OrderRow` to `/orders/[id]`

🔖 **Suggested commit point** — order details route is wired up end to end.

## Phase 5 — Basic Testing

- [ ] 35. Install and configure Jest + React Testing Library via `next/jest` (jsdom environment); add `npm test` script
- [ ] 36. Unit tests: `lib/format.ts` formatters (currency, date)
- [ ] 37. Unit tests: `lib/api/client.ts` `mockFetch` (resolves with data after delay; throws when fail rate triggers)
- [ ] 38. Unit tests: `lib/api/orders.ts` `getOrders(filters)` — status filter, search filter, date-range filter, pagination slicing
- [ ] 39. Component test: `SummaryCards` renders the correct values from props
- [ ] 40. Component test: `EmptyState` renders its message/CTA and calls the clear-filters handler on click

🔖 **Suggested commit point** — test suite in place covering the service layer and key components.

## Phase 6 — Responsive Pass

- [ ] 41. Dashboard breakpoints: summary card grid, chart sizing at mobile/tablet/desktop
- [ ] 42. Orders table/page responsiveness (e.g. card layout or scroll container on mobile)
- [ ] 43. Filters bar responsiveness (stacks on mobile)

🔖 **Suggested commit point** — responsive pass complete across breakpoints.

## Phase 7 — Performance Pass

- [ ] 44. Audit and add `useMemo` only where real derived/expensive computation happens (document what was and wasn't memoized, and why)
- [ ] 45. Audit and add `useCallback` only where paired with a memoized child (`OrderRow`) or a debounced handler
- [ ] 46. Check for duplicate API calls / unnecessary re-renders; fix any found
- [ ] 47. Evaluate lazy-loading (`next/dynamic`) for any heavy, non-critical client component; apply only where it gives a real benefit, skip otherwise
- [ ] 48. Audit `package.json` for unused/unnecessary dependencies; remove anything not actually in use
- [ ] 49. Record memoization, lazy-loading, and dependency decisions in the decision log
- [ ] 49b. **Revisit the per-section Suspense architecture** (decided at step 14, deliberately kept for now): check whether sections popping in at different times reads as janky once real skeletons exist, and whether the streaming win still holds with uniform ~500ms delays. Restructure only if there's a real problem — see `learn.md`'s "Step 14, revised" entry for the full reasoning and the rejected alternatives (`Promise.all`, `Promise.allSettled`)

🔖 **Suggested commit point** — performance pass complete, decisions documented.

## Phase 8 — Accessibility Pass

- [ ] 50. Keyboard navigation + visible focus states on table and filters; proper labels/aria attributes

🔖 **Suggested commit point** — accessibility pass complete.

## Phase 9 — README

- [ ] 51. Write `README.md`: setup, architecture/folder structure, API/data-fetching approach, Server vs Client Component explanation, performance decisions, testing approach, key implementation notes (decision log), AI-assisted development section

🔖 **Suggested commit point** — README complete.

## Phase 10 — Verification & Deployment

- [ ] 52. Run `npm run build`, `npm run lint`, `npm test`, `tsc --noEmit`; fix anything surfaced
- [ ] 53. Confirm the production build is minified — Next.js's SWC compiler minifies JS and Tailwind purges/minifies CSS automatically; spot-check the build output for this rather than adding manual tooling
- [ ] 54. Run a Lighthouse audit (Performance, Accessibility, Best Practices, SEO) against the production build; address anything significant it surfaces
- [ ] 55. Manual end-to-end pass: dashboard load, filters + URL sync, pagination, order details, empty state, forced error+retry (temporarily raise fail rate), responsive check

🔖 **Suggested commit point** — final verification pass complete; this is the commit that goes to GitHub.

- [ ] 56. Create GitHub repo + push — **(pause for confirmation)**
- [ ] 57. Deploy to Vercel, verify the live link — **(pause for confirmation)**
