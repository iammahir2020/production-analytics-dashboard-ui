@AGENTS.md

# Production Analytics Dashboard

A take-home assignment for Future Studios (see `Frontend_Task1_Analytics_Dashboard.pdf`): a SaaS analytics dashboard — revenue/orders/customers summary, charts, an orders table with search/status/date filters, pagination, and order details. Evaluated on Next.js architecture, API/state management, component reusability, performance, responsive UI, clean code, and **AI-assisted development quality** — every decision needs to be explainable, not just shipped.

**This build follows a written plan — read it before assuming or inventing an approach:**
- [`plan.md`](plan.md) — the strategic decisions and why (tech choices, Server/Client split, state management, performance philosophy, testing scope, UI design standard)
- [`step.md`](step.md) — the granular, checkbox-by-checkbox execution order; work happens one step at a time, each reviewed before the next
- [`learn.md`](learn.md) — a plain-language log of what was actually done at each completed step, including the exact commands run

## Stack

- **Next.js 16.3.5**, App Router, no `src/` directory
- **TypeScript**, strict mode
- **React 19.2.8**
- **Tailwind CSS v4**
- **shadcn/ui** (Nova preset — Lucide icons, Geist font), components copied into `components/ui/`, not an npm dependency — read and editable, not a black box
- **Recharts** for charts, **date-fns** for date handling
- **Jest + React Testing Library** for tests (planned, Phase 5 — not installed yet)
- No backend: a mock service layer (`lib/api/`) simulates a real API (delay + occasional failure) over local JSON

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint (eslint-config-next core-web-vitals + typescript)
```

`npm test` doesn't exist yet — added in Phase 5 of `step.md` alongside Jest setup. `tsc --noEmit` is used for a standalone type check (not currently wired as an npm script).

## Directory layout

```
app/                  # App Router routes — Server Components unless marked "use client"
  page.tsx            # dashboard (Server Component shell)
  orders/
    page.tsx           # orders list (Server Component shell, reads searchParams)
    [id]/page.tsx        # order details (Server Component, dedicated route — not a modal)
components/
  ui/                 # shadcn primitives — copied source, not a library
  dashboard/           # dashboard-specific components (SummaryCards, charts, recent lists)
  orders/              # orders-specific components (table, filters, pagination)
  shared/              # cross-feature presentational components (EmptyState, etc.)
lib/
  api/                # the service layer — mockFetch wrapper + getX() functions per domain
  types/               # TypeScript types (Order, Customer, Activity, AnalyticsSummary, RevenuePoint)
  data/                # mock JSON datasets
  utils.ts             # shadcn's cn() helper (do not confuse with lib/format.ts, see below)
  format.ts             # currency/date formatting helpers (not lib/utils/format.ts — see Conventions)
hooks/                # shared client-side hooks (e.g. a debounce hook), as needed
```

Most of this is still empty scaffold — filled in phase by phase per `step.md`. Check `step.md`'s checkboxes for what actually exists right now versus what's planned.

## Conventions (binding — decided in `plan.md`, not open questions)

- **Server vs Client:** page shells are Server Components that fetch and pass data down as props. Client Components (`"use client"`) are reserved for things that actually need interactivity — filters, the orders table, charts (Recharts needs the browser), anything with `useState`/`useEffect`/event handlers.
- **Data access:** UI components never import mock JSON or call `fetch` directly — everything goes through `lib/api/*.ts`, which wraps a simulated delay + occasional failure (`lib/api/client.ts`'s `mockFetch`). This is what makes loading/error states real rather than theoretical.
- **Filter state lives in the URL** — native `useSearchParams`/`router.push`, not local `useState`, and deliberately not the `nuqs` library (see `plan.md` for the reasoning). Filters are shareable, back/forward-safe, and survive a refresh.
- **`useMemo`/`useCallback` are deliberate, not reflexive** — used only for real derived computation (e.g. chart data shaping) or when paired with a memoized child (`React.memo`) / debounced handler. The README (once written) documents what was *not* memoized and why.
- **No over-engineering, no "slop" code** — the simplest implementation that satisfies the requirement. No speculative abstractions, no code that looks meaningful but isn't doing real work. This matters more than usual here: AI-assisted development quality is a graded criterion.
- **UI must not read as generic AI-templated output** — a deliberate visual direction, not default-shadcn-out-of-the-box. See the design checkpoint in `step.md` right before the first UI phase.
- **File size:** keep files small and single-purpose; split rather than let one file take on multiple jobs.
- Debounce input handlers that trigger fetches (the orders search box). Paginate lists that can grow large (orders table); leave naturally-short lists (recent orders/activity) un-paginated. Any image goes through `next/image`. No dependency added without a real reason.

## Things to avoid

- Don't hardcode data inside UI components — the task PDF explicitly calls this out.
- Don't add `nuqs` or another URL-state library — this was a deliberate decision against it, not an oversight.
- Don't put formatters in `lib/utils/` — that name collides with shadcn's own `lib/utils.ts` (the `cn()` helper); formatters live in `lib/format.ts` instead.
- Don't commit directly to a `git push --force` on `main` without the user's explicit go-ahead, and never add a `Co-Authored-By`/AI-attribution line to commit messages or PR descriptions.
- Don't run ahead of `step.md` — implementation proceeds one reviewed step at a time, not in large batches.
