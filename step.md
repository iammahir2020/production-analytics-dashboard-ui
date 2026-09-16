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

## Phase 0 — Project Setup

- [x] 1. Scaffold Next.js 14+ project (App Router, TypeScript strict, ESLint, Tailwind, no `src/`) via `create-next-app`; verify `npm run dev` serves the default page
- [x] 2. Initialize shadcn/ui (`npx shadcn init`) and set base theme/tokens
- [x] 3. Install remaining dependencies: `recharts`, `date-fns`
- [x] 4. Create empty folder structure: `components/{ui,dashboard,orders,shared}`, `lib/{api,types,data}`, `hooks/` (no `lib/utils/` — shadcn's `lib/utils.ts` file already owns that name; formatters go in `lib/format.ts` instead, see step 13)
- [ ] 5. `git init`, initial commit — **(pause before creating/pushing to a remote GitHub repo)**

⏸ **Checkpoint — skill files.** This is where you'll add any skill files to the repo for infrastructure, coding-pattern, and UI-design guidance. I'll pick them up and apply them from here through the rest of the build — flag me if I miss one.

## Phase 1 — Types, Mock Data, Service Layer

- [ ] 6. Define TypeScript types: `Order`, `Customer`, `Activity`, `AnalyticsSummary`, `RevenuePoint` (`lib/types/`)
- [ ] 7. Write a mock-data seed script generating datasets into `lib/data/`
  - [ ] 7a. Customers dataset (~50)
  - [ ] 7b. Orders dataset (~200, over the last 90 days, referencing customer ids; statuses: pending/processing/completed/cancelled/refunded)
  - [ ] 7c. Activity dataset (~30 events)
- [ ] 8. Build `lib/api/client.ts` — `mockFetch` wrapper with artificial delay + configurable fail rate
- [ ] 9. Build `lib/api/customers.ts` — `getCustomers()`, active-customer count
- [ ] 10. Build `lib/api/orders.ts` — `getOrders(filters)`, `getOrderById(id)`
- [ ] 11. Build `lib/api/analytics.ts` — `getSummaryStats()` (revenue, orders, active customers, conversion rate), `getRevenueTimeseries()`
- [ ] 12. Build `lib/api/activity.ts` — `getRecentActivity()`
- [ ] 13. Build `lib/format.ts` — currency/date formatting helpers

🔖 **Suggested commit point** — types, mock data, and the full service layer are in place.

🎨 **Design checkpoint — first UI phase starts next.** Everything up to here has been infrastructure with no visible UI. Before building `app/page.tsx` and its components, the look needs to be deliberate: a real visual direction (type, color, spacing, density), not default shadcn-out-of-the-box or a generic dashboard template — the goal is a UI nobody mistakes for unreviewed AI output. If design skill files have been added, this is where they get applied; if not, I'll state the direction explicitly before writing the first component so it can be reviewed before it spreads across the rest of the build.

## Phase 2 — Dashboard Page (Server Component shell)

- [ ] 14. Build `app/page.tsx` as a Server Component: parallel-fetch summary stats, revenue timeseries, recent orders, recent activity; pass down as props
- [ ] 15. Build `SummaryCards` (revenue, orders, active customers, conversion rate) — presentational, server-rendered
- [ ] 16. Build `RevenueChart` (Client Component, Recharts) — receives pre-shaped data as props
- [ ] 17. Build `OrdersChart` (Client Component, Recharts)
- [ ] 18. Build `RecentOrdersList` (server-rendered)
- [ ] 19. Build `RecentActivityFeed` (server-rendered)
- [ ] 20. Add `app/loading.tsx` — skeleton matching the dashboard layout
- [ ] 21. Add `app/error.tsx` — error boundary with retry

🔖 **Suggested commit point** — dashboard page is complete: summary cards, charts, recent orders/activity, loading and error states.

## Phase 3 — Orders Page: Data + Filters

- [ ] 22. Build `app/orders/page.tsx` Server Component shell reading `searchParams`, doing the initial filtered fetch server-side
- [ ] 23. Build `FiltersBar` (Client Component): debounced search input, status `Select`, date-range picker
- [ ] 24. Wire `FiltersBar` to the URL via `useSearchParams`/`useRouter` (native, no library)
- [ ] 25. Build `OrdersTable` (Client Component) rendering rows from props
- [ ] 26. Build `OrderRow` wrapped in `React.memo`
- [ ] 27. Build reusable `Pagination` component, URL-driven `page` param
- [ ] 28. Add `app/orders/loading.tsx` — table skeleton
- [ ] 29. Add `app/orders/error.tsx` — error boundary with retry
- [ ] 30. Build `EmptyState` ("No orders match your filters" + Clear filters CTA) and wire into `OrdersTable`

🔖 **Suggested commit point** — orders page is functional: table, URL-synced filters, pagination, empty/loading/error states.

## Phase 4 — Order Details

- [ ] 31. Build `app/orders/[id]/page.tsx` Server Component — fetch order by id, `notFound()` on invalid id
- [ ] 32. Add `app/orders/[id]/loading.tsx`
- [ ] 33. Build `OrderDetailsView` (customer info, line items, status, timeline) — presentational
- [ ] 34. Link each `OrderRow` to `/orders/[id]`

🔖 **Suggested commit point** — order details route is wired up end to end.

## Phase 5 — Basic Testing

- [ ] 35. Install and configure Jest + React Testing Library via `next/jest` (jsdom environment); add `npm test` script
- [ ] 36. Unit tests: `lib/utils/format.ts` formatters (currency, date)
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
