# Future Studios — Task 1: Production Analytics Dashboard
**Deadline: 19 Sep 2026, time TBC (confirm with Pranta Kundu) — roughly 4 days**

**Companion files:** [`step.md`](step.md) is the granular, checkbox-by-checkbox execution of everything below — each step reviewed individually, no large batches. [`learn.md`](learn.md) is a running plain-language log, one entry per completed step, that doubles as study material for the whole build afterward.

---

## What's actually being evaluated

Read the evaluation criteria as the real spec, not the feature list:
> React/Next.js architecture · API and state management · Component reusability · Performance optimization · Responsive UI/UX · Clean code and design patterns · **AI-assisted development quality**

That last one is unusual and worth taking seriously. They explicitly say candidates may use AI tools but "should understand the generated code and be able to explain their architectural and technical decisions." This isn't a checkbox — it's the same spec-driven discipline you already use on your own projects (marks-upload, the AWS BFF). Keep a short decision log as you build, same as you do elsewhere. It becomes your README's "key implementation notes" almost for free, and it's the difference between "I used AI" and "I directed AI and can defend every choice."

**Submission checklist (merged from the email + the task PDF):**
- [ ] GitHub repository (public)
- [ ] Live deployment link (Vercel — free, and it's the Next.js team's own platform)
- [ ] README covering: setup instructions, architecture/folder structure, API/data-fetching approach, Server vs Client Component explanation, performance decisions (useMemo/useCallback/memoization/rendering)

---

## Tech stack decisions

| Choice | Pick | Why |
|---|---|---|
| Framework | Next.js 14+, App Router | Specified in the task |
| Language | TypeScript, strict mode | Specified; also just do it |
| Styling | Tailwind CSS | Specified |
| Components | Tailwind + shadcn/ui | You've used shadcn before — copy-owned components you can actually explain, not a black-box library. Fits the "you should understand it" evaluation angle. |
| Charts | Recharts | Lightweight, composable, plays well with React server/client boundaries |
| Mock data | Local JSON + a thin async service layer | No backend to stand up, but still forces a real API-shaped boundary — see below |
| Filter state | URL search params via native `useSearchParams` / `router.push` — **no `nuqs`** | Locked decision: zero extra dependency, and explaining *why not* a library is itself a clean README talking point — see the state management section |
| Testing | Jest + React Testing Library, via Next.js's built-in `next/jest` config | Zero-config path Next.js documents itself; covers the service layer/filtering logic and a couple of presentational components — deliberately basic, not full coverage or e2e |
| Deployment | Vercel | Zero-config for Next.js, free tier is enough |

## Mock data — the "proper service layer" is the point, not the data source

**Market/locale: Bangladesh, not the US.** Currency is BDT (৳), customer names are Bangladeshi, and product pricing reflects real Bangladesh electronics-retail figures (not a USD-to-BDT conversion of some other number — local retail pricing doesn't track FX rates linearly). `formatCurrency` in `lib/format.ts` builds `৳` + Western digits manually rather than relying on `Intl`'s currency style, since neither `en-BD`/`en-US` (no ৳ glyph in their ICU data — falls back to the literal code `"BDT"`) nor `bn-BD` (has the glyph, but converts digits to Bengali numerals too, inconsistent next to an English-language UI) give the conventional look real Bangladesh apps (bKash, Daraz BD) actually use.

The task says "use a JSON dataset or mock API." Don't just import JSON directly into components — that's the exact anti-pattern they call out ("do not hardcode data directly inside UI components").

Build a thin service layer that *behaves* like a real API even though it isn't one:

```
lib/
  api/
    client.ts        // simulated fetch wrapper: delay, occasional error injection
    orders.ts         // getOrders(filters), getOrderById(id)
    customers.ts       // getCustomers()
    analytics.ts       // getSummaryStats(), getRevenueTimeseries()
  types/
    order.ts
    customer.ts
    analytics.ts
  data/
    mock-orders.json
    mock-customers.json
```

`client.ts` wraps every "fetch" in an artificial delay (`setTimeout`) and a small chance of throwing, so your loading and error states are genuinely exercised rather than theoretical. This single decision demonstrates you understand real API integration even without a real backend — and it's an easy, concrete thing to explain in the README.

```ts
// lib/api/client.ts — sketch, not final code
async function mockFetch<T>(data: T, opts?: { delayMs?: number; failRate?: number }): Promise<T> {
  await new Promise(r => setTimeout(r, opts?.delayMs ?? 400));
  if (Math.random() < (opts?.failRate ?? 0)) throw new Error("Simulated API failure");
  return data;
}
```

## Architecture: Server vs Client Components

This is one of the seven things they explicitly want explained, so decide it deliberately, not by default.

**Server Components (no `"use client"`):**
- The dashboard page shell — fetches initial summary stats, recent orders, recent activity server-side
- Anything that's read-only on first load and doesn't need interactivity

**Client Components (`"use client"`):**
- The orders table — needs filtering, pagination, sorting state
- The filter bar (search, status, date range)
- Charts, if the library needs browser APIs to render (Recharts does)
- Anything using `useState`, `useEffect`, `onClick`, etc.

**The pattern to state clearly in your README:**
> The dashboard page is a Server Component that fetches initial data and passes it down as props. Interactive pieces — the orders table, filters, charts — are Client Components that own their own state. This keeps the initial page load fast and server-rendered, while interactivity is scoped to only where it's needed rather than marking the whole page client-side.

## State management for filters — your strongest architectural decision

**Recommendation: put filter state in the URL, not local `useState`.**

```tsx
// Native useSearchParams / router.push — decided against nuqs to keep the
// dependency list minimal; the tradeoff is worth naming explicitly in the README
const searchParams = useSearchParams();
const status = searchParams.get('status') ?? 'all';
const search = searchParams.get('q') ?? '';
```

**Why this is worth doing, and worth explaining:**
- Filters become shareable and bookmarkable — a URL with `?status=pending&q=acme` is a real, linkable view
- Back/forward browser navigation works correctly
- Refreshing the page doesn't lose your filter state
- It's the modern App Router-idiomatic pattern, and naming it shows you're not just using React the way you would have three years ago

This is the single best "why did you make this choice" answer you can give in an interview about this task — it's opinionated, defensible, and not the first thing most candidates reach for (most will just use `useState` and lose all of the above for free).

## Performance decisions — be deliberate, not reflexive

The task explicitly warns against `useMemo`/`useCallback` used "unnecessarily" — that's a real signal they're checking whether you understand why, not just syntax.

**Real useMemo candidates:**
- Deriving chart-ready data from raw orders (grouping/summing by date) — actual computation, not just a pass-through
- Computing filtered+sorted table rows if the dataset is large enough that recomputing on every render would be wasteful

**Real useCallback candidates:**
- Handlers passed down to a memoized child component (e.g., an `OrderRow` wrapped in `React.memo`) — useCallback only matters when paired with memoization downstream, say this explicitly in your README, it's a common gap in candidates' understanding
- Debounced search handlers

**What NOT to memoize** (and say so in your README — it shows judgment):
- Simple derived values that are cheap to recompute
- Functions passed to non-memoized components (useCallback does nothing there — no downstream component is checking the reference)

**Other code-quality guardrails held throughout the build, not just at the end:**
- Debounce input handlers that trigger fetches or expensive work (the orders search box)
- Keep files small and single-purpose — split a component/module up rather than letting one file take on several jobs
- Paginate anything that can grow large (orders table); leave naturally-short lists (recent orders/activity on the dashboard) simple and un-paginated
- Any image that ends up in the UI goes through `next/image` for automatic compression/optimization — the current design doesn't require any, but this is the rule if one shows up
- No unnecessary re-renders, no duplicated API calls, no dependency added without a real reason
- No over-engineering and no "slop" code — the simplest implementation that satisfies the requirement, nothing speculative, nothing that looks meaningful but isn't actually doing real work. This matters more here than usual: "AI-assisted development quality" is a graded criterion, and code you can't explain line-by-line fails it

## Loading / empty / error states

Three distinct states per data-fetching boundary, not one generic spinner:
- **Loading** — skeleton components matching the actual layout (not a centered spinner) — feels faster and is the modern standard
- **Empty** — "No orders match your filters" with a clear call-to-action (e.g., "Clear filters"), not just a blank table
- **Error** — a retry affordance, not just an error message dead-ending the user

In the App Router, `loading.tsx` and `error.tsx` at the route level give you some of this automatically via Suspense/error boundaries — worth using and worth naming in your README as a deliberate Next.js-idiomatic choice.

---

## Testing — basic, not exhaustive

Scope kept deliberately small given the runway: Jest + React Testing Library via Next.js's own documented `next/jest` config — zero extra tooling, no Playwright/e2e. Priority is the highest-value, easiest-to-assert-on logic, not blanket coverage:
- `lib/format.ts` formatters (currency, date)
- `lib/api/client.ts` — `mockFetch` resolves after its delay, throws when the fail rate triggers
- `lib/api/orders.ts` — `getOrders(filters)`: status filter, search filter, date-range filter, pagination slicing
- A couple of presentational component tests (`SummaryCards`, `EmptyState`)

Say explicitly in the README why this is the chosen scope (highest-value logic, not full coverage) — same "judgment, not just syntax" principle as the memoization section.

---

## UI design standard — must not read as generic AI output

The dashboard's visual design is being treated as its own deliberate decision, not a default. Out-of-the-box shadcn styling or a templated admin-dashboard look is explicitly the thing to avoid — the goal is a UI nobody would associate with unreviewed AI-generated output: a real visual direction (type, color, spacing, density), applied consistently once decided.

Skill files covering infrastructure, coding patterns, and UI design/implementation get added to the repo after the project scaffold (Phase 0) is in place, and are used from that point on. There's a dedicated checkpoint for this — right before the first UI is built — in `step.md`.

---

## Working process for this build

- **`step.md`** is the actual execution checklist — one small, independently reviewable step at a time, substeps where a step has more than one moving part. No large batches of unrelated work under a single step.
- **Before each step**, a short heads-up: what we're doing, why this approach over the obvious alternative, what mistake it's guarding against, how it moves the build forward.
- **After each step**, a `learn.md` entry: what was actually done, in plain language, building into a study record of the whole build.
- **Commit points** are suggested (🔖 markers in `step.md`) at the end of each phase — never made automatically. A commit message gets proposed there; committing is always your call.
- Anything touching GitHub or Vercel (repo creation, pushes, deploys) is paused for explicit confirmation regardless of checklist state.

---

## Suggested build order (4 days)

**Day 1 — Foundation**
- Project scaffold, Tailwind + shadcn setup
- Types, mock data, service layer with simulated delay/error
- Folder structure locked in
- Dashboard page skeleton (Server Component) with summary cards wired to mock data

**Day 2 — Core features**
- Revenue and orders charts
- Recent orders + recent activity sections
- Orders page: table, search, status filter, date filter — wired to URL state

**Day 3 — Polish**
- Pagination
- Order details — **locked decision: dedicated route (`/orders/[id]`)**, not a modal or intercepting route. Deep-linkable, simplest Server Component fetch, and the most defensible choice to explain given the time available
- Basic testing pass (Jest + RTL) — see Testing section
- Loading skeletons, empty states, error states with retry
- Responsive pass across breakpoints

**Day 4 — Finish**
- Performance pass: identify real useMemo/useCallback candidates, add them deliberately
- Evaluate `next/dynamic` lazy-loading for any heavy, non-critical client component — apply only where it's a real win, skip otherwise
- Audit `package.json` and remove any dependency that isn't actually earning its place
- Accessibility pass: keyboard nav on the table/filters, proper labels, focus states
- README — write this properly, it's a third of what's being graded
- `npm run build` + spot-check that the production output is minified (Next.js/SWC + Tailwind do this automatically — this step just confirms it)
- Run a Lighthouse audit (Performance/Accessibility/Best Practices/SEO) against the production build; fix anything significant it surfaces
- Deploy to Vercel, verify the live link actually works end to end
- Final read-through: does every submission requirement have an answer?

---

## README outline — map this directly to their 7 requirements

```markdown
# Production Analytics Dashboard

## Setup
[install, env vars if any, run commands]

## Architecture & Folder Structure
[explain the structure above, and why]

## API / Data-Fetching Approach
[the mock service layer, why it's shaped like a real API boundary]

## Server vs Client Components
[the split you made, and why — see above]

## Performance Decisions
[every useMemo/useCallback/memo you used, AND why you didn't use them elsewhere;
Lighthouse results and what, if anything, they changed]

## Testing
[what's covered (service layer, filtering logic, a couple of components) and why
that's the chosen scope rather than full coverage]

## Key Implementation Notes
[your decision log — what you chose and rejected, e.g. URL-based filter state
over local state, and why]

## AI-Assisted Development
[honest note: which parts you directed an AI agent on, and that you reviewed
and understand every line — this directly answers their stated evaluation
criterion]
```

---

## One thing to actually do today

Everything else on this list assumes you have roughly 4 days — if it's actually less, the priority order changes (cut order details and polish before cutting the README, since the README is explicitly graded and a modal-vs-route decision isn't).