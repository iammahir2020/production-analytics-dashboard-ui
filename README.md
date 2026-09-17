# Khata

A production analytics dashboard for a Bangladesh e-commerce business — revenue/orders/customers overview, charts, and an orders workflow with search, filters, pagination, and order details. "Khata" (খাতা) means ledger/account book — the visual direction throughout is a shopkeeper's ledger back office, not a generic SaaS dashboard (see `.interface-design/system.md`).

**Stack:** Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · shadcn/ui (Base UI) · Recharts · Jest + React Testing Library

## Setup

```bash
npm install
npm run dev      # http://localhost:3000
```

Other commands:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
npm test        # Jest
```

No environment variables or database — everything runs on a local mock dataset (`lib/data/`).

## Architecture & folder structure

```
app/            routes — Server Components unless marked "use client"
  page.tsx        dashboard shell
  orders/         orders list + [id] order details

components/
  ui/             shadcn primitives (copied source, not a library)
  dashboard/      dashboard-only components
  orders/         orders-only components
  shared/         cross-feature components (EmptyState, Pagination, error boundaries)

hooks/          shared client hooks (debounce, URL filter state, etc.)

lib/
  api/            service layer — one file per domain
  types/          shared TypeScript types
  data/           mock JSON datasets
  format.ts       currency/date formatting
```

Each domain (orders, dashboard) owns its components; anything reused across domains lives in `shared/`. Files stay small and single-purpose rather than growing multiple responsibilities.

## API / data-fetching approach

There's no backend — `lib/api/*.ts` is a mock service layer that stands in for one. Every function returns a `Promise` and goes through a shared `mockFetch()` wrapper (`lib/api/client.ts`) that adds a randomized delay and a configurable failure rate, so loading and error states are real, not simulated after the fact.

UI components never import mock JSON or call `fetch` directly — they only call functions from `lib/api/`. That's what makes it a genuine API boundary: swapping the mock layer for real HTTP calls later wouldn't touch a single component.

## Server vs Client Components

The dashboard is a Server Component shell that fetches nothing itself. Each section (summary cards, charts, recent orders, etc.) is its own **async Server Component**, wrapped in its own `Suspense` + error boundary — so sections stream in independently, each has its own skeleton, and one slow or failing section doesn't block or break the rest.

Client Components (`"use client"`) are used only where real interactivity is needed:

- **Filters & pagination** — read/write URL state, debounce input
- **Orders table rows** — click-to-navigate
- **Charts** — Recharts needs the browser
- **Theme toggle, expandable chart dialog** — local UI state

Everything else stays a Server Component. This keeps most of the app server-rendered while scoping client JS to only what actually needs it.

## State management

Filter state (search, status, date range, page) lives in the **URL**, via `useSearchParams`/`router.replace` — not local `useState`. That makes every filter combination shareable and bookmarkable, survives a refresh, and works correctly with the browser's back/forward buttons. No URL-state library (e.g. `nuqs`) was added — the native APIs cover everything this needed.

## Performance decisions

- **`useMemo`** — not used anywhere in application code. All derived/aggregated data (revenue totals, top products, status breakdowns) is computed **server-side** in `lib/api/`, so there's nothing expensive left to memoize on the client. Adding one would be memoizing a static prop for no reason.
- **`useCallback`** — used in `useOrderFiltersUrl` (the URL-filter hook), since its setters are returned to consumers and calling them shouldn't create a new function every render.
- **`React.memo`** — wraps `OrderRow`, so a row doesn't re-render when its own data hasn't changed.
- **Debouncing** — the orders search box debounces before updating the URL (400ms), avoiding a fetch on every keystroke.
- **Code-splitting** — the date-range picker (`react-day-picker`) is lazy-loaded with `next/dynamic`, since it's only needed once a user opens that popover. This alone cut ~74KB of uncompressed first-load JS from the orders routes.
- **No duplicate fetches** — every section reads a distinct slice of data; the two dashboard charts that share one timeseries share one fetch instead of two.

**Lighthouse** (production build, desktop):

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` (dashboard) | 100 | 100 | 100 | 100 |
| `/orders` | 100 | 100 | 100 | 100 |
| `/orders/[id]` | 100 | 100 | 100 | 100 |

Under Lighthouse's mobile preset (simulated slow-4G + 4x CPU throttle), the dashboard drops to ~80 — traced to Recharts' real client-side rendering cost for the three charts, confirmed by the orders page (no charts) staying at 94–99 under the same throttle. A known, already-considered tradeoff of using a real charting library, not a bug.

## Testing

Jest + React Testing Library, scoped to the highest-value logic rather than full coverage: the mock service layer (delay/failure behavior, filtering, pagination), the currency/date formatters, and a couple of presentational components. No end-to-end tests.

```bash
npm test
```

## Key implementation notes

- **Order details is a dedicated route** (`/orders/[id]`), not a modal — deep-linkable and simpler to reason about.
- **Loading/empty/error are three distinct states**, not one generic spinner: skeletons match the real layout, empty states explain what's missing (with a way out, e.g. "Clear filters"), and errors get a retry action scoped to just the section that failed.
- **BDT currency formatting** uses lakh-style digit grouping (৳45,59,700), matching how Bangladeshi apps actually display currency — `Intl.NumberFormat` alone doesn't get this right.
- A full, step-by-step build log — every decision, what was tried and rejected, and why — is in [`learn.md`](learn.md); the execution checklist is in [`step.md`](step.md).

## AI-assisted development

This project was built with Claude Code, directing the implementation step by step rather than generating it in one pass — each piece was planned, reviewed, and tested before moving to the next (see `step.md`/`learn.md` for the full record). Notable examples of catching and fixing real bugs during that process, not just accepting generated code:

- An error boundary was silently misreporting a successful-but-empty API response as a failed one (`RevenueChart` crashing on an empty dataset).
- A hand-edited URL parameter could crash the entire orders page with no way to recover, traced to a missing validation step.
- A generated shadcn component (`Calendar`) had a wiring bug that silently broke keyboard arrow-key navigation — found by testing the feature directly, not by reading the code.

Every line in the codebase was reviewed and is understood; the reasoning behind each architectural choice is documented inline and in `learn.md`.
