# Learning Log — Production Analytics Dashboard

This file is a plain-language record of the whole build, one entry per step from [`step.md`](step.md). It's written to be read on its own later — as study material, or as a refresher on why the project looks the way it does — not just as a changelog.

Each entry covers, in everyday terms:
- **What was done** — the concrete thing that got built
- **Why** — the reasoning or tradeoff behind it, especially anything non-obvious
- **How it fits together** — how it connects to the pieces before/after it

Entries are added as each step in `step.md` is completed, in order, so reading top to bottom retraces the whole build from an empty repo to a finished dashboard.

---

<!-- Entries start below as steps are completed. -->

## Step 1 — Scaffold the Next.js project

**What was done:** Ran the official `create-next-app` CLI to generate the project — Next.js 16.3.5 (satisfies the "14+" requirement, and is simply the current version), App Router, TypeScript in strict mode, Tailwind CSS, ESLint, no `src/` directory. Since the repo already had files in it (the task PDF, `plan.md`, `step.md`, `learn.md`), `create-next-app` refused to run directly here — it only scaffolds into an empty directory. Worked around this by scaffolding into a scratch folder and merging the generated files in (`rsync`, excluding the `.git` folder `create-next-app` creates by default, since Phase 0's own Step 5 handles `git init` for this repo specifically).

**Why this way:** `create-next-app` is Next.js's own scaffolding tool — it wires up `tsconfig.json`, Tailwind's config, ESLint, and the App Router file structure in a way that's guaranteed to match the installed Next.js version. Hand-writing that config risks subtle mismatches (wrong path aliases, outdated Tailwind content globs) that are tedious to debug later, so the CLI is worth using even for something this "simple."

**Problem avoided:** Hand-rolled config drifting out of sync with what Next.js 16 actually expects, and losing the existing planning docs by scaffolding over them.

**One fix made along the way:** the dev server logged a warning that Turbopack was picking up an unrelated `package-lock.json` sitting in the home directory (`/home/mahir`) while trying to detect the workspace root — nothing to do with this project, just something else on the machine. Left alone, this is the kind of thing that can cause inconsistent behavior depending on where commands are run from. Fixed by explicitly pinning `turbopack.root` to this project's own directory in `next.config.ts`, so root detection is no longer ambiguous.

**Verification:** `npm run dev` started cleanly and `curl http://localhost:3000` returned `HTTP 200` with the default Next.js page, both before and after the Turbopack fix.

**Commands run:**
```
node -v && npm -v
# → v22.22.2 / 10.9.7

# First attempt, run directly in the repo — refused because the directory
# already had files in it (the PDF, plan.md, step.md, learn.md):
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm

# Scaffolded into a scratch directory instead:
npx --yes create-next-app@latest app --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
# (run from a temp folder under the scratchpad directory)

# Merged the generated project into the repo root, excluding the scaffold's
# own .git (git init happens for the real repo at Step 5 instead):
rsync -a --exclude='.git' <scratch>/app/ /home/mahir/Repositories/future-studios-task/
rm -rf <scratch-dir>

# Manual edit (not a command): next.config.ts — added `turbopack: { root: __dirname }`

# Verification:
nohup npm run dev > /tmp/nextdev3.log 2>&1 & disown
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
# → HTTP 200

pkill -f "next-server"; pkill -f "next dev"   # stop the dev server
```

**How this moves the build forward:** every later phase (types, service layer, dashboard, orders page) is written inside this scaffold — the App Router structure, Tailwind setup, and TypeScript config it created are the foundation the rest of `step.md` builds on directly.

## Step 2 — Initialize shadcn/ui

**What was done:** Ran `npx shadcn@latest init` with the `Nova` preset (Lucide icons, Geist font — the standard, unopinionated baseline). This wrote `components.json` (the CLI's config — where it looks for/writes components, path aliases), `lib/utils.ts` (the `cn()` class-merging helper every shadcn component uses), and a full set of CSS variables/design tokens into `app/globals.css` — colors, radii, chart colors, all defined for both light and dark mode.

**Why this way:** shadcn/ui isn't an npm package you import — it's a CLI that copies component source directly into the repo (`components/ui/`), which is exactly why it was chosen back in `plan.md`: the code is fully visible and explainable, not a black box. `Nova` was picked over the other seven bundled presets (Vega, Maia, Lyra, Mira, Luma, Sera, Rhea) because it's the plain, standard baseline — the point of this step is just wiring up the *mechanism* (tokens, utility, config), not choosing the final look. The real visual identity is a separate, deliberate decision at the design checkpoint right before Phase 2, and restyling later just means changing these CSS variables — nothing structural has to change.

**Problem avoided — a real bug caught here:** the generated `app/globals.css` had `--font-sans: var(--font-sans)` — a self-referential CSS variable that never actually resolves to anything. Browsers treat that as invalid, so the `font-sans` Tailwind utility would have silently fallen back to the browser default font instead of the Geist Sans font that's actually being loaded in `app/layout.tsx` (which defines `--font-geist-sans`, not `--font-sans`). This is exactly the "looks meaningful but does nothing" failure mode to watch for in generated code — it would have compiled and run fine, just silently not done what it looked like it did. Fixed it to `--font-sans: var(--font-geist-sans)` and confirmed the compiled CSS bundle resolves correctly.

**Verification:** `npm run lint` clean, `npm run build` completed a full production build with no errors, and the compiled CSS was inspected directly to confirm the font-variable fix took effect.

**Commands run:**
```
# Checked the installed Tailwind version and the CLI's own options first:
cat package.json | grep -A2 '"tailwindcss"'          # → "^4"
npx --yes shadcn@latest init --help

# Discovered the available presets (interactive prompt, then an intentionally
# invalid value to get the CLI to list them in its error message):
npx --yes shadcn@latest init --preset
npx --yes shadcn@latest init --preset invalid
# → Available presets: nova, vega, maia, lyra, mira, luma, sera, rhea

# The actual init:
npx --yes shadcn@latest init --preset nova -y

# Manual edit (not a command): app/globals.css — fixed
# `--font-sans: var(--font-sans)` → `--font-sans: var(--font-geist-sans)`

# Verification:
nohup npm run dev > /tmp/nextdev4.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page.html
curl -s "http://localhost:3000/_next/static/chunks/<bundle>.css" -o /tmp/bundle.css
grep -o -- '--font-sans:[^;}]*' /tmp/bundle.css     # → --font-sans: var(--font-geist-sans)
pkill -f "next-server"; pkill -f "next dev"

npm run lint     # clean
npm run build    # production build succeeded
rm -rf .next     # clean up the build artifacts from this check
```

**How this moves the build forward:** every component built from here on (`SummaryCards`, `OrdersTable`, etc.) will pull shadcn primitives from `components/ui/` and use `cn()` from `lib/utils.ts` — this step is what makes that possible, and the token setup means restyling later (at the design checkpoint) is a matter of editing variables, not rewriting components.

## Step 3 — Install recharts and date-fns

**What was done:** Installed the two remaining runtime dependencies the plan calls for: `recharts` (charts) and `date-fns` (date formatting/range math). Both installed cleanly with no peer-dependency warnings — `recharts@3.10.1` (compatible with the installed React 19.2.8) and `date-fns@4.4.0`.

**Why this way:** Both are small, focused libraries rather than heavyweight frameworks — they do one job each and don't pull in unrelated functionality, so they don't work against the "no unnecessary dependencies" rule from the plan. The alternative (hand-rolling SVG chart rendering, or hand-rolling date-range math) is exactly the kind of code that's easy to get subtly wrong — timezone bugs, off-by-one errors on date boundaries, axis/scale math for charts — and not worth reinventing for a graded take-home where the point is demonstrating good judgment, not proving you can rebuild a charting library.

**Problem avoided:** Silent, hard-to-spot bugs from hand-written date arithmetic and chart math, and the wasted time that would cost against a 3-day runway.

**Verification:** `npm run lint` clean; `npm run build` completed a full production build with no errors after the install (build artifacts removed afterward).

**Commands run:**
```
npm install recharts date-fns
# → added 36 packages, 0 vulnerabilities
# recharts@3.10.1, date-fns@4.4.0 in package.json

npm run lint     # clean
npm run build    # production build succeeded
rm -rf .next     # clean up build artifacts from this check
```

**How this moves the build forward:** unblocks Phase 1 (date-fns for shaping the mock orders dataset across a 90-day window) and Phase 2 (recharts for `RevenueChart`/`OrdersChart`), and later the date-range filter in Phase 3.

## Step 4 — Create the folder structure

**What was done:** Created the planned skeleton: `components/{ui,dashboard,orders,shared}`, `lib/{api,types,data}`, `hooks/`. `components/ui` didn't exist yet either — shadcn's `init` only wrote config, not the folder itself, since no components have been added yet.

**Why this way:** Locking in the folder structure now, before any real code exists, means every later step has one obvious place to put a new file instead of that being decided file-by-file as the build goes. `lib/api` (service layer), `lib/types`, `lib/data` (mock JSON) map directly to the "keep API calls, types, and data transformation separate from UI components" requirement from the task PDF; `components/dashboard` vs `components/orders` groups by feature rather than dumping everything in one flat folder.

**A naming collision caught here:** the plan originally called for `lib/utils/format.ts`, but shadcn's `init` had already created `lib/utils.ts` — a *file* holding the `cn()` class-merging helper every shadcn component imports. Having a `lib/utils.ts` file and a `lib/utils/` directory side by side wouldn't actually break anything (Node/TypeScript module resolution always prefers a matching file over a same-named directory, so `@/lib/utils` would keep resolving to the `cn()` file regardless), but it's a confusing thing to look at in the tree for no real benefit. Simpler fix: skip creating `lib/utils/` entirely and put the formatting helpers at `lib/format.ts` instead — flat, sibling to `utils.ts`, zero ambiguity. Updated both `step.md` (step 13) and `plan.md` to match.

**Problem avoided:** A folder structure that looks intentional but actually has an unexplained, slightly confusing overlap in it — exactly the kind of thing that's awkward to defend if asked "why does this repo have both `lib/utils.ts` and `lib/utils/`?"

**Verification:** `find components lib hooks -maxdepth 2` confirmed the final tree matches what was intended, no leftover empty/misnamed directories.

**Commands run:**
```
mkdir -p components/ui components/dashboard components/orders components/shared lib/api lib/types lib/data lib/utils hooks
find components lib hooks -maxdepth 2 | sort
# → revealed lib/utils.ts already existed as a file

rmdir lib/utils   # removed the now-unneeded empty directory
find components lib hooks -maxdepth 2 | sort   # confirmed final structure
```

**How this moves the build forward:** Phase 1 (types, mock data, service layer) writes directly into `lib/api`, `lib/types`, `lib/data`, and `lib/format.ts` — all of it has a defined home before a single line of that code gets written.

## Step 5 — git init and initial commit

**What was done:** Initialized git in the repo and made one root commit covering everything from Phase 0 — the Next.js scaffold, shadcn/ui setup (with the font-variable fix), `recharts`/`date-fns`, the planned folder structure, and the existing planning docs (`plan.md`, `step.md`, `learn.md`, the task PDF).

**Why this way:** One commit for all of Phase 0 rather than one per step — the individual steps (scaffold, shadcn init, dependencies, folders) aren't independently meaningful checkpoints on their own; together they're "the project exists and is set up," which is the real unit of work worth a commit message. This matches the commit-point convention in `step.md`: suggested at the end of a phase, not after every step.

**Problem avoided:** Before committing, staged files were reviewed (`git status` after `git add -A`) to confirm nothing unexpected was going in — no `.env` files, no `node_modules`/`.next` build output (both already excluded by the generated `.gitignore`), nothing that looked like it could contain a secret.

**Worth noting, not a problem exactly:** the task PDF is now committed into what will eventually be a public repo. That's the employer's own assessment document — flagged for awareness rather than acted on unilaterally, since whether to keep it in a public repo is a call for whoever owns the submission, not something to decide silently either way.

**Verification:** `git log --oneline` shows the single root commit; `git status` reports a clean working tree afterward.

**Commands run:**
```
ls -la .git          # confirmed no existing repo
git status            # (fatal: not a git repository) — confirmed clean start

git init

git status            # reviewed untracked files before staging
git add -A
git status            # reviewed staged files before committing

git commit -m "Scaffold Next.js project and set up base tooling

- Next.js 16.3.5 (App Router, TS strict, Tailwind, ESLint, no src/) via create-next-app
- shadcn/ui initialized (Nova preset) with a Next.js font-variable bug fixed in globals.css
- recharts + date-fns installed for charts and date handling
- Planned folder structure created (components/, lib/api, lib/types, lib/data, hooks/)
- Planning docs (plan.md, step.md, learn.md) and task PDF included"

git log --oneline    # → 3aeb1e8 Scaffold Next.js project and set up base tooling
git status            # → nothing to commit, working tree clean
```

**How this moves the build forward:** there's now a real git history to build on — every subsequent phase adds its own commit at its own suggested commit point, and this baseline is a safe point to diff against or return to if something later goes wrong. No remote exists yet; that's created and pushed only with explicit confirmation, per the plan.

## Step 6 — Define the TypeScript types

**What was done:** Created `lib/types/{order,customer,activity,analytics}.ts` — `Order` (with `OrderStatus`, `OrderItem`, `OrderFilters`, `PaginatedOrders`), `Customer`, `Activity` (with `ActivityType`), and `AnalyticsSummary`/`RevenuePoint`. No runtime code yet — this step is purely the shared contracts everything else gets built against.

**Why this way:** Types come before the mock data or the service layer, not after, so the mock data has to conform to a defined shape rather than the types getting inferred backward from whatever the mock JSON happens to contain — that's what actually makes "keep API calls, types, and data transformation separate from UI components" (a requirement straight from the task PDF) hold up in practice. A few deliberate shape decisions, each with a reason:
- `Order.customerName` is denormalized onto the order itself (not just `customerId`) — mirrors what a real orders-list API would return, and avoids every list component having to join against the customers dataset just to show a name.
- `Order.total` is stored directly rather than derived from `items` — as if computed server-side, which is realistic and means totals are consistent everywhere without recomputation logic living in components.
- No separate "order timeline" type. Order details' timeline is just `Activity` records filtered by `relatedOrderId` — reusing one existing shape instead of inventing a second data structure that represents the same underlying idea (something happened to this order, at this time).
- `AnalyticsSummary` holds exactly the four fields the PDF asks for (revenue, orders, active customers, conversion rate) — the visitor count conversion rate gets computed from is an internal detail of the service layer (Phase 1, step 11), not something that needs to leak into the shared type.

**Problem avoided:** Types drifting from what the mock data and service layer actually produce, and a duplicated/parallel "timeline" concept that would need to be kept in sync with `Activity` by hand.

**A false alarm caught along the way:** `npx tsc --noEmit` initially failed with `Cannot find name 'LayoutProps'` in `app/layout.tsx` — looked alarming, but it's a Next.js-generated ambient type that only exists inside `.next/types/` after a build, and `.next` had been deleted as cleanup after the last build check. Not a real error; rebuilding first (which regenerates those ambient types) and then re-running the type check confirmed everything — including the new type files — is clean.

**Verification:** `npm run build` (regenerates Next.js's ambient types) → `npx tsc --noEmit` clean → `npm run lint` clean → `.next` removed again afterward.

**Commands run:**
```
npx tsc --noEmit
# → error TS2304: Cannot find name 'LayoutProps' (app/layout.tsx) — false alarm, see above

npm run build     # regenerates .next/types, which LayoutProps depends on
npx tsc --noEmit  # → clean, no errors
npm run lint      # clean
rm -rf .next      # clean up build artifacts from this check
```

**How this moves the build forward:** Phase 1's remaining steps (mock data generation, the service layer functions) now have exact contracts to satisfy instead of ad-hoc shapes, and every component built in Phase 2 onward imports these same types rather than each one inferring its own.

## Step 7 — Mock-data seed script (customers, orders, activity)

**What was done:** Wrote `scripts/generate-mock-data.mjs`, a standalone generator (not part of the Next.js app) that produces the three JSON datasets in `lib/data/`: ~50 customers, 200 orders spread over a 90-day window, and ~30 activity events. Wired it up as `npm run generate:mock-data`. Generation happens in a deliberate order — customers first (base info only), then orders (referencing real customer ids), then customer aggregates (`totalOrders`, `totalSpent`, `active`) are recomputed *from* the generated orders, then activity events are built by sampling real orders/customers so every `relatedOrderId` points at something that actually exists.

**Why this way:**
- **Plain JavaScript, not TypeScript.** This script is a one-off dev-time generator — its output (the JSON) is what actually gets type-checked later, by the service layer that imports it against the `lib/types/` contracts. Adding a TypeScript execution step here (a new dependency, or fiddling with Node's experimental type-stripping) wouldn't buy real safety, just ceremony.
- **A seeded RNG (`mulberry32`), not `Math.random()`.** Re-running the generator produces byte-identical output. This matters concretely: Phase 5 writes unit tests against `getOrders(filters)` using this exact dataset — if the data changed shape or size on every run, those tests would be flaky by construction.
- **Customer aggregates are derived from orders, not stored independently.** A customer's `totalOrders`/`totalSpent` are recomputed by scanning their actual orders after generation, rather than being invented separately — this is what guarantees they can never silently disagree with the order data itself, the same class of bug real apps get from denormalized counters drifting out of sync.
- **A named "spent" rule, decided once.** `totalSpent` (and later `totalRevenue` in the analytics service, step 11) counts `pending`/`processing`/`completed` orders but not `cancelled`/`refunded` ones — payment is treated as captured at order time. This is stated explicitly as a comment in the script specifically so the same rule gets reused rather than redecided (possibly differently) when the analytics service is built.
- **Activity events reference real orders/customers**, sampled from ones that are actually recent (within the last 14 days) or in the relevant status (`completed` for a "marked as completed" event, `refunded` for a refund event) — so the "recent activity" feed doesn't describe things that didn't happen.

**A real bug caught and fixed:** the first version anchored `NOW` to `new Date()` — the actual wall-clock time when the script runs. Every date in the dataset is computed relative to `NOW` (`daysAgo(90)`, etc.), so two runs just a few seconds apart produced *slightly different* timestamps throughout the whole dataset — the RNG was seeded correctly, but the anchor date wasn't, which defeated the entire point of seeding it. Caught by literally diffing two consecutive runs and finding every `createdAt` off by a few seconds. Fixed by pinning `NOW` to a fixed ISO timestamp instead of the live clock — confirmed after the fix that two runs produce byte-for-byte identical JSON files.

**A second issue, from lint rather than logic:** ESLint's `@typescript-eslint/no-require-imports` rule (part of `eslint-config-next`) applies project-wide, so the script's original `require("fs")`/`require("path")` calls failed lint even though the file is plain JavaScript, not TypeScript. Rather than special-casing an eslint override for one file, renamed the script to `.mjs` and switched to `import`/`import.meta.dirname` — matching the convention the project already uses for `postcss.config.mjs`, so there's one consistent way standalone scripts are authored in this repo, not two.

**Verification:**
- Ran the generator, then diffed two consecutive runs' output — byte-identical (confirms the seeded RNG + fixed anchor actually produce reproducible data).
- Wrote a throwaway consistency-check script (not committed): confirmed 50/200/29 records generated, zero orders with a `customerId` that doesn't exist, zero activity events with a `relatedOrderId` that doesn't exist, and that a sample customer's stored `totalOrders`/`totalSpent` exactly match an independent recomputation from their actual orders.
- `npm run lint` clean, `npm run build` succeeded, `npx tsc --noEmit` clean.

**Commands run:**
```
npm run generate:mock-data
# → Generated 50 customers, 200 orders, 29 activity events into lib/data

# Reproducibility check (before the NOW fix — caught the bug):
cp lib/data/mock-orders.json /tmp/first-run-orders.json
npm run generate:mock-data
diff /tmp/first-run-orders.json lib/data/mock-orders.json
# → every createdAt off by a few seconds — NOW was wall-clock time, not fixed

# (edited scripts/generate-mock-data.mjs: NOW pinned to a fixed ISO timestamp)

# Reproducibility check (after the fix):
npm run generate:mock-data
cp lib/data/mock-orders.json /tmp/run-a.json
npm run generate:mock-data
diff /tmp/run-a.json lib/data/mock-orders.json
# → no output: byte-identical

# Consistency checks (ad hoc, via node -e — not a committed script):
node -e '<inline script checking status distribution, orphan references,
         a sample customer aggregate recomputation, order date range,
         and activity sort order — see this entry for the exact checks>'

# Lint failure and fix:
npm run lint
# → 2 errors: @typescript-eslint/no-require-imports in generate-mock-data.js
mv scripts/generate-mock-data.js scripts/generate-mock-data.mjs
# (edited: require("fs")/require("path") → import fs from "node:fs" etc.,
#  __dirname → import.meta.dirname)
npm run lint     # clean

npm run build    # succeeded
npx tsc --noEmit # clean
rm -rf .next     # clean up build artifacts from this check
```

**How this moves the build forward:** the service layer (steps 8–12) now has real, internally-consistent data to read from instead of hand-written fixtures — and because it's reproducible, the Phase 5 tests that exercise `getOrders(filters)` against this exact dataset won't be flaky.

## Step 8 — mockFetch wrapper (lib/api/client.ts)

**What was done:** Built `mockFetch<T>(data, opts?)` — the function every service call in steps 9–12 will route through. It awaits an artificial delay (default 500ms, overridable), throws a custom `ApiError` at a configurable rate (default 0), and returns a `structuredClone` of whatever data it was given rather than the original reference.

**Why this way:**
- **`failRate` defaults to 0, not some small nonzero value.** The plan's own sketch in `plan.md` defaults it to 0, and `step.md`'s own verification phase (step 55) already describes "temporarily raise fail rate" as the way error states get exercised — meaning the intended workflow is a deliberate, temporary bump (passed explicitly via `opts.failRate`, or the constant edited for a manual test), not a background chance of failure on every normal page load. A nonzero default would make the app randomly flaky during grading for no real benefit.
- **`structuredClone` on the way out.** A real `fetch().json()` always hands back a fresh deserialized copy — never a live reference into server memory. Our mock data is plain JS arrays imported once and kept alive for the life of the server process; without cloning, a component that accidentally mutated returned data would corrupt the shared dataset for every subsequent request on that running server — a genuinely nasty, hard-to-trace class of bug in a long-running dev/demo process. Cloning here means the `getX()` functions built next don't need any defensive copying of their own — the guarantee is centralized in one place.
- **A dedicated `ApiError` class**, not a generic thrown `Error`. Gives error boundaries and tests something concrete to check (`error instanceof ApiError`) rather than string-matching a message.

**Problem avoided:** shared mutable state silently corrupting across requests (the clone), and a mock API that's flaky by default for no reason a grader would want (the failRate default).

**Verification:** `npm run build`, `npx tsc --noEmit`, and `npm run lint` all clean. Since Phase 5 (step 37) already plans proper Jest tests for this exact function, today's check was a lighter ad hoc behavioral script (via `npx tsx`, not installed as a project dependency) rather than duplicating that work early: confirmed the delay is real (~200ms measured for a 200ms request), `failRate: 1` reliably throws `ApiError`, `failRate: 0` never throws across 50 calls, and mutating a returned object does not affect the original source object (clone isolation actually holds, not just compiles).

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

# Ad hoc behavioral check (not committed — Phase 5 adds the real tests):
npx --yes tsx /tmp/.../verify-mockfetch.ts
# → delay ~200ms: true (201ms)
# → failRate=1 threw ApiError: true (Simulated API failure)
# → failRate=0, 50 calls, failures: 0 true
# → clone isolated: true (source still 1)
# → returned !== source (different reference): true

rm -f /tmp/.../verify-mockfetch.ts   # cleaned up the scratch script
rm -rf .next                          # cleaned up build artifacts
```

**How this moves the build forward:** steps 9–12 (`getCustomers`, `getOrders`, `getSummaryStats`/`getRevenueTimeseries`, `getRecentActivity`) now just wrap their data access in `mockFetch(...)` and inherit realistic delay/error/isolation behavior for free, without each one having to reimplement it.

## Step 9 — lib/api/customers.ts

**What was done:** Built `getCustomers()` (returns all 50 mock customers through `mockFetch`) and `getActiveCustomerCount()` (returns just the count of customers with `active: true`). This is the first service function to actually read the Step 7 mock data through the Step 8 `mockFetch` wrapper, so it's also the first real check that those two pieces genuinely fit together.

**Why this way:**
- **`getActiveCustomerCount()` filters the raw dataset directly** rather than calling `getCustomers()` internally and counting client-side. A real "active customer count" endpoint wouldn't ship every customer's full record just to answer a count question — and keeping it independent means `getSummaryStats()` (step 11) can fetch it as its own lightweight, separately-parallelizable call rather than pulling in customer data it doesn't need.
- **No filters or pagination on `getCustomers()`.** Nothing in the current plan calls for a customers page or list UI — the PDF only asks for an orders page. Adding filtering/pagination now would be speculative, so it stays a plain full-list fetch; extending it later is one function signature away if a real need shows up.
- **No explicit `as Customer[]` cast on the JSON import.** Tried it without one first — TypeScript's structural inference from the imported JSON (all primitive `string`/`number`/`boolean` fields, no string-literal unions) matched the `Customer` type directly, so a cast would have been unnecessary noise. (This won't hold for `orders.ts` in step 10, since `OrderStatus` is a string-literal union JSON can't infer — that one will need an explicit cast, decided per-file rather than applying it everywhere for "consistency.")

**Verification:** `npm run build` + `npx tsc --noEmit` clean (no cast needed), `npm run lint` clean. Behavioral check via a throwaway `tsx` script (not committed): `getCustomers()` returns exactly 50 records, `getActiveCustomerCount()` returns 34 — matching an independent recomputation straight from the JSON file — and mutating a customer object from one call does not leak into a second call (confirms `mockFetch`'s clone isolation from step 8 actually holds through a real consumer, not just in its own unit test).

**Commands run:**
```
npm run build      # succeeded — also regenerates Next.js's ambient types
npx tsc --noEmit   # clean, no cast needed
npm run lint       # clean

# Ad hoc behavioral check (not committed):
npx --yes tsx /tmp/.../verify-customers.ts
# → getCustomers() length: 50 true
# → getActiveCustomerCount(): 34 expected: 34 true
# → clone isolation holds: true (second call: Lucas Rodriguez)

rm -f /tmp/.../verify-customers.ts   # cleaned up scratch script
rm -rf .next                          # cleaned up build artifacts
```

**How this moves the build forward:** `getActiveCustomerCount()` is what `getSummaryStats()` (step 11) will call for the dashboard's "active customers" stat — that dependency is now real and verified, not just planned.

## Step 10 — lib/api/orders.ts

**What was done:** Built `getOrders(filters)` — search (order id or customer name, case-insensitive), status filter (with `"all"` as a pass-through), a `dateFrom`/`dateTo` range, sorting (most recent first), and pagination — plus `getOrderById(id)`, returning `Order | null`. This is the most logic-heavy service function so far, since it's the one thing directly backing the orders page's search/filter/pagination requirements from the PDF.

**Why this way:**
- **`dateTo` uses `date-fns`'s `endOfDay`, not a raw date comparison.** Comparing against a bare `dateTo` string would implicitly mean midnight (00:00:00) of that day, which would silently exclude every order actually placed *on* that day — not what a user picking "up to today" in a date-range filter would expect. Reusing `date-fns` here (already a dependency, installed back in step 3 specifically for this kind of date math) is exactly the tradeoff that step was justified on.
- **Sorting always happens on a spread copy (`[...filtered].sort(...)`), never on `filtered` directly.** If no filters are applied at all, `filtered` is still the *same array reference* as the module-level imported `orders` — sorting it in place would permanently reorder the shared in-memory dataset for every later request on that server process. This is the same mutation-safety concern from step 8's `mockFetch` cloning, but it applies *before* the data even reaches `mockFetch` — cloning the return value doesn't help if the source array was already corrupted by an in-place sort.
- **`getOrderById` returns `null` for a missing order, not a thrown error.** A nonexistent order id is an entirely normal outcome (someone navigates to a stale or mistyped URL), not an exceptional one — returning `null` lets the order-details page (step 31) call `notFound()` directly rather than wrapping a lookup in try/catch for something that isn't actually a failure.
- **Total is computed from the filtered set, before pagination slices it.** `PaginatedOrders.total` reflects how many orders match the filters, not how many are on the current page — this is what lets a `Pagination` component (step 27) compute total page count correctly.

**Problem avoided:** silent data corruption from in-place sorting on a shared array reference, and a date-range filter that technically "works" but quietly excludes same-day results — the kind of bug that would only show up when someone actually tried to filter by today's date.

**Verification:** `npm run build` + `npx tsc --noEmit` clean (TypeScript's narrowing on `filters.status !== "all"` worked without needing an extra cast), `npm run lint` clean. Behavioral check via a throwaway `tsx` script covering 17 assertions against the real generated dataset: default pagination (page 1, pageSize 10, total 200, sorted correctly), status filtering (count matches an independent recomputation, `"all"` bypasses the filter), search by both customer name and order id (case-insensitive), the `dateTo` end-of-day boundary (verified against an explicit `T23:59:59.999` comparison), non-overlapping pages, `getOrderById` for both an existing and a nonexistent id, and — the one most worth calling out — mutating a returned order object and then confirming a *subsequent* call still returns the original, unmutated data.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean, no extra casts needed
npm run lint       # clean

# Ad hoc behavioral check (not committed — Phase 5, step 38 adds the real tests):
npx --yes tsx /tmp/.../verify-orders.ts
# → 17/17 PASS, including:
#   default: total = 200, page = 1, pageSize = 10, sorted most-recent-first
#   status filter: completed count matches raw data (92)
#   search filter (case-insensitive, both customer name and order id)
#   dateTo filter is inclusive of the whole day
#   pagination: page1 and page2 don't overlap
#   getOrderById: finds existing order / returns null for missing id
#   mutating a returned order doesn't corrupt later calls

rm -f /tmp/.../verify-orders.ts   # cleaned up scratch script
rm -rf .next                       # cleaned up build artifacts
```

**How this moves the build forward:** the orders page (Phase 3) can now be built directly against a real, verified `getOrders(filters)` — filters parsed from the URL just need to be shaped into an `OrderFilters` object and handed straight to this function, no additional logic needed on the page side.

## Step 11 — lib/api/analytics.ts

**What was done:** Built `getSummaryStats()` (revenue, total orders, active customers, conversion rate) and `getRevenueTimeseries()` (a per-day series of revenue + order count spanning the mock data's actual date range). Before writing either, went back and amended the step 7 generator to add a `totalVisitors` figure to a new `mock-analytics.json` file — appended *after* customers/orders/activity generation so the RNG sequence that produced those (already verified in step 7) was undisturbed. Re-ran the generator and diffed the three existing files against their pre-change versions to confirm they came out byte-identical.

**Why the visitors figure needed adding at all:** conversion rate is orders ÷ visitors, and nothing in the mock data had a visitor count. The tempting shortcut — deriving a fake visitor number from `totalOrders` via a fixed ratio (e.g. `totalOrders / 0.05`) — would make `conversionRate` a disguised constant: it would always equal the same value no matter what the order data actually looked like, which is a stat that *looks* derived but isn't really telling you anything. Generating a real, independent, reproducible visitor figure through the same seeded RNG as everything else means conversion rate is an actual computed relationship between two real numbers, not restated input.

**Other decisions, each with a reason:**
- **`getSummaryStats()` doesn't wrap its own result in `mockFetch`.** It already awaits `getActiveCustomerCount()` (step 9), which has its own `mockFetch` delay — wrapping the combined result in a second `mockFetch` would stack two artificial delays (~1000ms) for what's supposed to be one stat. Skipping the outer wrap here is also still safe: the returned object is freshly constructed from primitive numbers, not a slice of any shared array, so there's nothing a caller could mutate that would corrupt state for a later request — the *reason* `mockFetch` clones (isolating shared references) doesn't apply to a brand-new object made of numbers.
- **`totalOrders` counts every order regardless of status** (200, not just the "spent" ones) — consistent with how `Customer.totalOrders` was defined back in the mock-data generator. `totalRevenue` and per-day `revenue`, by contrast, both use the same `SPENT_STATUSES` rule from step 7 (pending/processing/completed only) — the same underlying rule, stated once, reused wherever "revenue" is computed.
- **`conversionRate` is returned as a fraction** (e.g. `0.0348`), not a percentage. Converting to a percentage string is display work — that belongs in `lib/format.ts` (step 13), not baked into the numeric value the service layer returns.
- **`getRevenueTimeseries()` derives its date window from the order data itself** (earliest to latest `createdAt`), not from `new Date()` at request time. The mock data's dates are fixed relative to the generator's anchor date; if the chart's window were based on the live clock instead, viewing the deployed app any time after generation would show a chart trailing off into empty recent days for no reason a viewer could tell was intentional. Anchoring to the data's own span means the chart is always fully populated, regardless of when someone actually opens the app.
- **Every day in the range gets a point, including zero-order days** — via `date-fns`'s `eachDayOfInterval`, rather than only emitting points for days that happen to have orders. A chart with unevenly-spaced or missing x-axis values would misrepresent the data; a real gap (a slow day) needs to render as a real dip, not disappear.

**A worthwhile architectural note for later (Phase 7):** `plan.md` names "deriving chart-ready data from raw orders (grouping/summing by date)" as a real `useMemo` candidate. In this app's architecture, though, that exact transformation happens in `getRevenueTimeseries()` — a Server-Component-only service function — not in a Client Component from raw props. Server Components don't have hooks, so this specific computation was never actually a `useMemo` candidate here; the pre-shaped-data-from-the-server approach makes the memoization question moot for this particular case. Worth stating explicitly in the Performance Decisions section of the README later, since it's a real example of "why NOT used here" rather than an oversight.

**Verification:** generator diff confirmed the three pre-existing mock files are byte-identical after adding the visitors figure. `npm run build` + `npx tsc --noEmit` clean, `npm run lint` clean. Behavioral check via a throwaway `tsx` script, 13 assertions: `totalRevenue`/`totalOrders`/`activeCustomers`/`conversionRate` all match independent recomputations from the raw data; `getSummaryStats()` measured at 501ms (confirms the single-delay design — not ~1000ms from a stacked double-wrap); the revenue series spans 90 contiguous, non-duplicated days; the sum of daily revenue across the whole series exactly equals `totalRevenue`, and the sum of daily order counts exactly equals `totalOrders` (proves the per-day grouping partitions every order correctly — no double-counting, no silent drops); and mutating a returned timeseries point doesn't leak into a subsequent call.

**Commands run:**
```
# Amend the step 7 generator: add TOTAL_VISITORS after existing generation,
# write it to lib/data/mock-analytics.json.

cp lib/data/mock-orders.json /tmp/before-orders.json
cp lib/data/mock-customers.json /tmp/before-customers.json
cp lib/data/mock-activity.json /tmp/before-activity.json
npm run generate:mock-data
diff /tmp/before-orders.json lib/data/mock-orders.json       # → unchanged
diff /tmp/before-customers.json lib/data/mock-customers.json # → unchanged
diff /tmp/before-activity.json lib/data/mock-activity.json   # → unchanged
cat lib/data/mock-analytics.json   # → { "totalVisitors": 5746 }
rm -f /tmp/before-*.json

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

# Ad hoc behavioral check (not committed):
npx --yes tsx /tmp/.../verify-analytics.ts
# → 13/13 PASS, including:
#   totalRevenue matches independent recomputation (76341.21)
#   conversionRate = totalOrders / totalVisitors, as a fraction (0.0348)
#   getSummaryStats does not stack two mockFetch delays (elapsed=501ms)
#   sum of daily revenue across the series = totalRevenue
#   sum of daily order counts across the series = totalOrders
#   dates are contiguous, no gaps or duplicates
#   mutating a returned timeseries point doesn't leak into a later call

rm -f /tmp/.../verify-analytics.ts   # cleaned up scratch script
rm -rf .next                          # cleaned up build artifacts
```

**How this moves the build forward:** the dashboard's Server Component (step 14) can now parallel-fetch `getSummaryStats()` and `getRevenueTimeseries()` alongside recent orders/activity, with both already returning exactly the shapes `SummaryCards` and the chart components need — no client-side data transformation required for either.

## Step 12 — lib/api/activity.ts

**What was done:** Built `getRecentActivity(limit = 10)` — returns the N most recent activity events. The simplest of the four service files, since the mock-data generator (step 7) already sorted activity most-recent-first, so this is really just a bounded slice through `mockFetch`.

**Why this way:** Added an optional `limit` parameter (default 10) rather than always returning the full dataset and letting the dashboard component slice it down. If the component did the slicing, that would be exactly the "data transformation inside a UI component" the task PDF explicitly says not to do — keeping "give me the N most recent" as a service-layer concern means `RecentActivityFeed` (step 19) just renders whatever array it's handed.

**Problem avoided:** `ActivityType` is a string-literal union, so — same as `OrderStatus` in step 10 — the raw JSON import needed an explicit `as Activity[]` cast; without it TypeScript would only see `type: string`, not the literal union. This was predicted in step 9's notes and confirmed here.

**Verification:** `npm run build` + `npx tsc --noEmit` clean (cast was in fact required, as predicted), `npm run lint` clean. Behavioral check via a throwaway `tsx` script, 5 assertions: default call returns exactly 10 entries matching the 10 most-recent raw records in order, a custom limit is respected, requesting more than exist returns everything without erroring, and mutating a returned activity object doesn't leak into a subsequent call.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean (cast needed, as expected)
npm run lint       # clean

# Ad hoc behavioral check (not committed):
npx --yes tsx /tmp/.../verify-activity.ts
# → 5/5 PASS:
#   default limit returns 10, matching the 10 most-recent raw entries in order
#   custom limit returns 5
#   limit beyond dataset size returns everything (no crash)
#   mutating a returned activity doesn't leak into a later call

rm -f /tmp/.../verify-activity.ts   # cleaned up scratch script
rm -rf .next                         # cleaned up build artifacts
```

**How this moves the build forward:** all four `lib/api/*.ts` files now exist and are verified — the last piece of Phase 1 is `lib/format.ts` (step 13), then the dashboard (Phase 2) can be built entirely against real, working service functions instead of placeholders.

## Step 13 — lib/format.ts

**What was done:** Built five formatters, each tied to an actual planned component rather than a speculative "utilities" grab bag: `formatCurrency` (revenue/order totals), `formatPercent` (conversion rate — this is the display step deliberately deferred back in step 11, where the service layer returns a fraction like `0.0348` and formatting it into `"3.5%"` was left to this layer), `formatDate`/`formatDateTime` (order dates, with and without a time component), and `formatRelativeTime` (the activity feed — "2 hours ago" reads better in a recent-activity list than an absolute timestamp).

**Why this way:**
- **Currency and percent use native `Intl.NumberFormat`, not `date-fns` or manual string concatenation.** `Intl` is the correct, standard tool for locale-aware number/currency formatting — no dependency needed, and it handles rounding and the `%`/`$` symbols correctly rather than hand-building strings like `` `${(value * 100).toFixed(1)}%` ``.
- **Dates use `date-fns`**, already a project dependency and already used in the service layer (step 11) — one date library used consistently throughout, not native `Intl.DateTimeFormat` in one place and `date-fns` in another for no reason.
- **No generic `formatNumber` for plain integers.** Order counts and active-customer counts are small enough (in the hundreds, not thousands) that direct interpolation is perfectly readable — adding a wrapper function around `{count}` would be formatting code with nothing real to do.
- **Each formatter accepts `string | Date`**, not just `Date`. Every date field in the data (`Order.createdAt`, `Activity.timestamp`, `Customer.joinedAt`) is stored as an ISO string, so requiring callers to `new Date(...)` before calling would just be repeated boilerplate at every call site.

**A limitation named rather than "fixed":** `formatRelativeTime` compares against the actual system clock at render time, while the mock data's dates are fixed relative to a past anchor (step 7's `NOW = 2026-09-16`). Right now the two are close together, so "2 hours ago" reads naturally — but if this deployed app is viewed significantly later, the same fixed data will read as further in the past than the numbers were designed to feel. This is an inherent tension between frozen, reproducible mock data (the deliberate choice from step 7) and genuinely relative time display — not a bug to engineer around, since "fixing" it would mean regenerating dates relative to each page view, which breaks the reproducibility that step 7's tests depend on. Worth a one-line mention in the README's key-implementation-notes section later.

**Verification:** `npm run build` + `npx tsc --noEmit` clean, `npm run lint` clean. Behavioral check via a throwaway `tsx` script using real values pulled from the actual service layer (not hand-typed test data): `formatCurrency` on the real `totalRevenue` produced `"$76,341.21"`, `formatPercent` on the real `conversionRate` produced `"3.5%"`, `formatDate`/`formatDateTime` on a real order's `createdAt` produced `"Aug 14, 2026"` / `"Aug 14, 2026, 7:15 AM"`, and `formatRelativeTime` on real recent-activity timestamps produced `"about 20 hours ago"`, `"about 22 hours ago"`, `"2 days ago"` — all read naturally. Also checked `formatCurrency(0)` → `"$0.00"` (no odd formatting at the boundary) and that a plain `Date` object (not just a string) works.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

# Ad hoc behavioral check (not committed), against real service-layer output:
npx --yes tsx /tmp/.../verify-format.ts
# → formatCurrency(totalRevenue): $76,341.21
# → formatPercent(conversionRate): 3.5%
# → formatDate(order.createdAt): Aug 14, 2026
# → formatDateTime(order.createdAt): Aug 14, 2026, 7:15 AM
# → formatRelativeTime(...): about 20 hours ago / about 22 hours ago / 2 days ago
# → formatCurrency(0): $0.00
# → all regex/shape assertions PASS

rm -f /tmp/.../verify-format.ts   # cleaned up scratch script
rm -rf .next                       # cleaned up build artifacts
```

**How this moves the build forward:** Phase 1 is now fully complete — types, mock data, service layer, and display formatting all exist and are verified. Phase 2 (the dashboard) can be built entirely against real functions returning real, correctly-shaped, correctly-formattable data — no placeholders anywhere.

## Revision — Localize mock data to Bangladesh (BDT, Bangladeshi names)

**What was done:** After Phase 1 was complete, the user asked for the product to be reframed around Bangladesh rather than the US: currency, customer names, and pricing. This meant going back into the already-completed step 7 generator and step 13 formatter, not writing new code — the structure of both was already right, only their content needed to change.

**Scope decision:** whether the *product catalog itself* (mouse, keyboard, monitor, headphones, etc.) should change to a different category, or just get repriced in BDT, was genuinely ambiguous — asked the user directly rather than guessing. Answer: keep the electronics-accessories category, since it's a real, common segment of Bangladesh's e-commerce market (Daraz, Star Tech, Ryans Computers all sell exactly this), just reprice it.

**What changed:**
- `FIRST_NAMES`/`LAST_NAMES` in `scripts/generate-mock-data.mjs` — replaced with common Bangladeshi first names and surnames (email addresses still use `@example.com`, since that's the IANA-reserved non-resolving domain regardless of the customers' nationality — no reason to change something that was never US-specific).
- `PRODUCTS` prices — replaced with approximate real-world BDT retail figures for this product category, *not* a currency-converted version of the old USD prices. Local retail pricing doesn't track FX rates linearly (import duty, VAT, local market dynamics), so picking plausible local prices directly is more honest than multiplying the old numbers by an exchange rate.
- The two activity-message templates that interpolated `$${total.toFixed(2)}` directly — switched to a small `formatTaka()` helper in the generator, matching the same ৳-plus-Western-digits convention adopted in `lib/format.ts` (see below), so a pre-baked activity message and a live-formatted number look the same.
- `lib/format.ts`'s `formatCurrency` — this was the one genuinely interesting decision. Tried `Intl.NumberFormat` with `currency: "BDT"` under a few locales first rather than assuming: `en-BD` and `en-US` both fall back to printing the literal code `"BDT"` (no ৳ glyph in their ICU currency data), while `bn-BD` does have the glyph but also converts the digits themselves to Bengali numerals (`৭৬,৩৪১.২১৳`) — which would look inconsistent sitting next to the rest of an English-language UI. Real Bangladesh apps (bKash, Daraz BD) use ৳ with ordinary Western digits, so that's built directly: plain decimal formatting via `Intl.NumberFormat`, with `৳` prepended manually rather than left to `Intl`'s currency style.

**Why re-running the generator was safe:** the RNG consumption *sequence* — how many times `rng()` gets called, and in what order, while generating 50 customers then 200 orders then 30 activity events — depends only on the *counts* of the name/product pools (still 15 first names, 15 last names, 12 products), not their contents. Confirmed this empirically rather than just reasoning about it: the visitor count (step 11's addition) came out as exactly `5746` again, identical to before the localization — the clearest possible sign the RNG sequence wasn't disturbed, only the values drawn from each pool changed.

**Verification, redone in full rather than assumed to still hold:**
- Reproducibility: two consecutive runs produced byte-identical output (same check as step 7, redone).
- Consistency: zero orphan `customerId`/`relatedOrderId` references, a sample customer's `totalOrders`/`totalSpent` still exactly match independent recomputation from their real orders (same checks as step 7).
- `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean.
- Re-ran the behavioral test suites from steps 9–13 combined against the new data (13 assertions): `getCustomers`/`getActiveCustomerCount`, `getOrders` (status filter, and a search test now specifically for a lowercased Bangladeshi surname), `getOrderById`, `getSummaryStats`/`getRevenueTimeseries` (including the revenue-sum-matches-total consistency check from step 11), `getRecentActivity`, and `formatCurrency` all still hold against the localized data — plus new checks specific to this change: `formatCurrency` produces `৳4,559,700.00` (৳ symbol, Western digits, no `$` left anywhere), and no customer in the generated data has a leftover Western name.

**Commands run:**
```
# (edited scripts/generate-mock-data.mjs: Bangladeshi names, BDT prices,
#  formatTaka() helper for activity messages)
# (edited lib/format.ts: formatCurrency now prepends ৳ to plain decimal
#  formatting, instead of Intl's currency style)

node -e 'console.log(new Intl.NumberFormat("en-BD", {style:"currency",currency:"BDT"}).format(76341.21))'
# → "BDT 76,341.21" — no ৳ glyph available
node -e 'console.log(new Intl.NumberFormat("bn-BD", {style:"currency",currency:"BDT"}).format(76341.21))'
# → "৭৬,৩৪১.২১৳" — has the glyph, but Bengali numerals too

npm run generate:mock-data
# → Generated 50 customers, 200 orders, 29 activity events, 5746 visitors
#   (same visitor count as before localization — confirms the RNG
#   sequence wasn't disturbed, only pool contents changed)

cp lib/data/mock-orders.json /tmp/run-a.json
npm run generate:mock-data
diff /tmp/run-a.json lib/data/mock-orders.json   # → REPRODUCIBLE

# Consistency checks (ad hoc, via node -e): 0 orphan orders/activities,
# sample customer aggregate recomputation matches, total revenue ৳4,559,700

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

# Full regression check across all Phase 1 service functions + formatters:
npx --yes tsx /tmp/.../verify-localization.ts
# → 13/13 PASS

rm -f /tmp/.../verify-localization.ts   # cleaned up scratch script
rm -rf .next                             # cleaned up build artifacts
```

**How this moves the build forward:** Phase 2 onward is now built directly against Bangladesh-relevant data and formatting from the start, rather than needing a retrofit later — every dashboard number, table row, and chart tooltip will show ৳ figures and Bangladeshi names natively.

## Design checkpoint — visual direction confirmed ("Khata")

**What was done:** Before writing any Phase 2 component, ran the `interface-design` skill's process (domain exploration → proposed direction → user review) rather than defaulting to shadcn's unstyled Nova preset. Produced a working direction called "Khata" (খাতা — ledger/account book), published as a live specimen artifact rather than just described in prose, then iterated it once (added a live light/dark/system toggle and an explicit both-themes palette reference table) after the user asked to see both themes explicitly rather than relying on the artifact matching whatever theme their OS happened to be in. Saved the confirmed decisions to `.interface-design/system.md` so every component built from here on inherits them automatically instead of the direction living only in this conversation's memory.

**The domain work, condensed** (full reasoning is in the chat transcript, not duplicated into the specimen page itself — the skill is explicit that a rendered specimen shows the visual only, reasoning stays in prose): grounded the direction in Bangladesh e-commerce specifically — Cash-on-Delivery as the dominant payment mode, courier partners (Pathao, Sundarban, RedX, Steadfast) as the real operational anxiety point, mobile financial services (bKash/Nagad/Rocket) as the market's actual "trusted money" color language, and the lakh/crore digit-grouping convention. Rejected four defaults explicitly: cool blue/indigo SaaS accent, rounded pill/badge status chips, Western thousands-grouped currency, and Geist/generic-grotesk-with-no-personality.

**Two decisions worth calling out specifically:**
- **Lakh-style digit grouping** (`৳45,59,700`, not `৳4,559,700`) was verified empirically before being proposed — tested `Intl.NumberFormat` under `en-BD`, `bn-BD`, and `en-US` locales first (`node -e`) rather than assuming a locale string would produce the right output. Found that `en-BD`/`en-US` both fall back to the literal `"BDT"` code (no ৳ glyph in their ICU data) and `bn-BD` has the glyph but converts digits to Bengali numerals too — settled on `bn-BD` with `numberingSystem: "latn"` forced, which gives exactly the lakh-grouped-Western-digits convention real Bangladeshi apps use. This is now a planned change to `lib/format.ts`'s `formatCurrency` (currently Western-grouped from the earlier Bangladesh localization pass) — not yet applied to the actual codebase, only confirmed in the specimen; needs to land as part of an upcoming step.
- **Avoiding a recognized AI-slop cluster.** The light palette (warm aged-paper ground) sits close to a known pattern (cream + serif + terracotta accent) — deliberately broke two of the three legs to get clear of it: no serif anywhere (Hanken Grotesk throughout, chosen partly *because* a data-dense ops tool benefits from one consistent grotesk system rather than a display/body pairing), and the accent is rose/magenta, not terracotta (terracotta is demoted to just the "refunded" status color, one of five, not the brand identity).

**Problem avoided:** shipping the shadcn Nova preset's neutral, out-of-the-box tokens by default — which is precisely the "generic AI dashboard" look flagged as a risk before this checkpoint even started (see the earlier feedback memory on UI quality). Also avoided over-committing before review: nothing in `app/` was touched during this checkpoint — the entire direction lived in a disposable artifact until confirmed.

**A follow-up requested and completed within this checkpoint:** the user asked whether both themes could be shown explicitly rather than relying on the specimen matching whatever theme their system happened to be in. Added a live 3-state toggle (Light/Dark/System) to the specimen — which doubles as a rough prototype of the real `ThemeToggle` component that step 13.2 builds — plus a static side-by-side table listing every token's exact hex value in both themes, so the palette is readable without needing to toggle anything.

**Verification:** the specimen artifact renders and both themes were checked via the in-page toggle before presenting; `.interface-design/system.md` was written to match exactly what was shown and confirmed, not extended with anything not actually reviewed.

**How this moves the build forward:** every component from step 13.1 onward is built against a written, confirmed spec — colors, type, spacing, depth, and specific component patterns (status treatment, summary-card hero figures, currency formatting) are already decided, not improvised per-component.

**Follow-up, closed immediately rather than left as a dangling to-do:** switched `lib/format.ts`'s `formatCurrency` (and the generator's matching `formatTaka()` helper) from Western to lakh-style grouping — `Intl.NumberFormat("bn-BD", { numberingSystem: "latn" })` — to match the confirmed direction. Regenerated the mock data and confirmed via diff that `mock-orders.json`/`mock-customers.json` came out byte-identical (only the pre-baked activity-message *text* changed, since that's the only place currency gets formatted into stored strings); spot-checked real lakh-boundary amounts in the regenerated activity data (`৳1,13,000.00`, `৳1,18,000.00`) to confirm the grouping actually kicks in where it matters, not just at the specific value tested in isolation. `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean afterward.

## Step 13.1 — Apply the Khata design tokens to app/globals.css

**What was done:** Replaced shadcn's neutral Nova preset color tokens with the confirmed Khata palette, for both `:root` (light) and `.dark`, and swapped the loaded font from Geist to Hanken Grotesk in `app/layout.tsx` (dropped Geist Mono too — nothing in this app needs a monospace face; tabular number alignment comes from `font-variant-numeric: tabular-nums`, not a mono font). Also caught myself mid-edit: `app/layout.tsx`'s `metadata.title` briefly said "Khata" before I reverted it — that's a real product-naming decision the user hasn't confirmed yet (only the *visual* direction was confirmed, not the name), so the page title/description stay generic ("Production Analytics Dashboard") until that's actually settled, while "Khata" stays as the internal design-system name in `.interface-design/system.md`.

**Why this way — the token mapping, not just the values:** shadcn/ui components (`Button`, `Select`, every future `components/ui/*` primitive) read Tailwind utility classes like `bg-primary`, `text-muted-foreground`, `bg-accent` — not custom Khata-named variables. So this wasn't "invent new variable names for the palette," it was mapping each Khata concept onto shadcn's *existing* semantic slots: the Khata brand rose → `--primary` (shadcn's "main CTA/brand" slot), Khata's surface → `--card`, Khata's ink-muted → `--muted-foreground`, and so on. This is what "use what exists" (the `interface-design` skill's own rule, and the project's established "no unnecessary abstraction" principle) actually means in practice — every future shadcn component inherits the direction automatically, with zero extra work, because it's using the same variables it always would have.

**A naming collision worth being explicit about:** shadcn already has its own `--accent`/`--accent-foreground` tokens, conventionally used for a *subtle hover/highlight surface* (a dropdown item on hover, for instance) — a completely different concept from what this whole build has been calling "the Khata accent" (the brand rose). Mapping the brand rose onto shadcn's `--accent` slot would have been a real, easy-to-make mistake — it would silently repaint every hover state rose instead of using it for the "one accent used with intention" hero moments the direction actually calls for. The brand rose maps to `--primary` instead; shadcn's own `--accent` gets a proper subtle warm-neutral tint, doing the job it's actually meant for.

**Chart colors reuse the order-status palette, not a separate invented set.** `--chart-1` through `--chart-5` map to accent/success/warning/neutral/danger — the exact same five colors the ledger-stamp order-status treatment uses. One color language for "what state is this order in" across the table *and* the charts, rather than two unrelated palettes that happen to share a page.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Started the dev server and checked the actual rendered output rather than trusting the source alone: the `<html>` tag carries the Hanken Grotesk font-variable class, and the compiled CSS bundle was fetched directly and grepped — confirmed `--background: #f5f2ea` (light) / `#17130f` (dark) and `--primary: #a22a52` (light) / `#e0567f` (dark) both present and correct, plus `--font-sans: var(--font-hanken-grotesk)` resolving correctly. (The current page still shows `create-next-app`'s default boilerplate content — step 14 hasn't happened yet — so this check was necessarily about the tokens compiling and applying correctly, not about how the real dashboard looks yet.)

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev5.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page5.html
grep -o '<html[^>]*>' /tmp/page5.html
# → class="hanken_grotesk_...__variable h-full antialiased"

curl -s "http://localhost:3000/_next/static/chunks/<bundle>.css" -o /tmp/bundle5.css
grep -o -- '--background:[^;}]*' /tmp/bundle5.css   # → #f5f2ea, #17130f
grep -o -- '--primary:[^;}]*' /tmp/bundle5.css      # → #a22a52, #e0567f
grep -o -- '--font-sans:[^;}]*' /tmp/bundle5.css    # → var(--font-hanken-grotesk)

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page5.html /tmp/bundle5.css /tmp/nextdev5.log
rm -rf .next
```

**How this moves the build forward:** every component built from step 13.2 onward — the theme toggle, the nav shell, then the actual dashboard components — renders in the confirmed Khata palette automatically, in both themes, without needing per-component color decisions.

## Step 13.2 — Install next-themes, wire up ThemeProvider

**What was done:** Installed `next-themes` and wrapped `{children}` in `app/layout.tsx` with its `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`), matching the `.dark`-class convention already in `app/globals.css` from step 13.1. Added `suppressHydrationWarning` to `<html>`, which this specific setup requires.

**Why no wrapper component.** The commonly-documented shadcn pattern wraps `next-themes`'s `ThemeProvider` in a small local `"use client"` component before using it in the root layout. Checked whether that's actually necessary here: `next-themes` already ships its `ThemeProvider` from a client-marked entry point, so Next.js treats the boundary correctly without a wrapper — the pattern exists mainly for typing/reuse convenience across multiple use sites. This app has exactly one root layout and fixed provider props that never vary, so a wrapper would be indirection with nothing to justify it. Imported and used directly instead.

**Why `suppressHydrationWarning` is necessary, not just conventional:** `next-themes` sets the theme class on `<html>` via a small blocking script that runs *before* React hydrates — that's specifically what avoids a flash of the wrong theme on first paint (a light background flashing before dark mode kicks in, for instance). But it means the server-rendered HTML and the client's first real render can legitimately differ on that one class, which React would otherwise report as a hydration mismatch. `suppressHydrationWarning` on that one element tells React this specific, expected difference isn't a bug — it doesn't disable hydration warnings anywhere else in the tree.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Rather than trusting the config was applied correctly from the source alone, fetched the actual server-rendered HTML and found the compiled setup script's literal argument list — `("class","theme","system",null,["light","dark"],null,true,true)` — confirming `attribute="class"`, `storageKey="theme"`, `defaultTheme="system"`, the theme list, and `enableSystem` all compiled through exactly as configured. Didn't build a browser-driven click-test for the toggle interaction itself at this step — `next-themes` is a mature, extremely widely-used library and the setup mechanism (not custom logic) is what was being verified here; the actual clickable toggle doesn't exist as a UI element yet regardless (that's step 13.3).

**Commands run:**
```
npm install next-themes    # → next-themes@0.4.6, no peer-dependency warnings

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev6.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page6.html
grep -o '<html[^>]*>' /tmp/page6.html
grep -B2 -A2 "next-themes" /tmp/page6.html
# → found the compiled setup script:
#   ...})("class","theme","system",null,["light","dark"],null,true,true)

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page6.html /tmp/nextdev6.log
rm -rf .next
```

**How this moves the build forward:** the theme mechanism is fully wired and verified — step 13.3 just needs to build a UI control that calls `next-themes`'s `useTheme()` hook; no provider/setup plumbing left to figure out.

## Step 13.3 — Build ThemeToggle

**What was done:** Added shadcn's `ToggleGroup`/`Toggle` primitives (`components/ui/toggle-group.tsx`, `toggle.tsx`, via `npx shadcn add toggle-group`) rather than hand-rolling three `<button>` elements — per the `interface-design` skill's native→primitive→hand-roll hierarchy, a mutually-exclusive button group is exactly what this primitive exists for, and it already ships keyboard navigation and ARIA correctly. Built `components/shared/theme-toggle.tsx` on top of it: a 3-option (Light/Dark/System) segmented control wired to `next-themes`'s `useTheme()`, with the active segment styled to the confirmed direction (filled with `--primary`/`--primary-foreground` — the Khata brand rose — not shadcn's generic muted-background pressed state).

**A real API difference caught before writing broken code:** almost assumed shadcn's `ToggleGroup` followed Radix's familiar API (`type="single"`, scalar `value`/`onValueChange`) without checking — but this project's `components.json` uses Base UI, not Radix (a decision made back in step 2), and Base UI's `ToggleGroup` has a meaningfully different shape: `value`/`defaultValue`/`onValueChange` all work with *arrays* of pressed values (even in single-select mode, toggled via a `multiple` boolean rather than a `type` prop), and each item's identity comes from a `value` prop, not `type`. Checked the actual `.d.ts` files in `node_modules/@base-ui/react` before writing the component, rather than assuming API parity with the more commonly-documented Radix version.

**A second gotcha: `next-themes`'s hydration-safety requirement.** `useTheme()`'s `theme` value is `undefined` until after the component mounts on the client — the server genuinely cannot know a visitor's stored preference. Naively rendering the toggle's active state immediately risks either a hydration mismatch or a visible "pops from nothing-selected to the real value" flash right after load. The standard fix is a `mounted` boolean, but the obvious `useState` + `useEffect(() => setMounted(true), [])` implementation tripped a real lint rule: `react-hooks/set-state-in-effect` (`npm run lint` caught it, didn't just trust the pattern because it's commonly seen in tutorials) — calling `setState` synchronously inside an effect causes an avoidable extra render. This specific case is one of the few legitimate exceptions to that rule (delaying client-only rendering to dodge a hydration mismatch), but rather than silencing the lint rule with a disable comment, used the React-idiomatic primitive the rule's own message points at: `useSyncExternalStore`. Extracted this as `hooks/use-mounted.ts` — a genuinely reusable pattern (not specific to the theme toggle), placed in the `hooks/` folder that was set up back in Phase 0 specifically for cases like this, rather than inlined into one component.

**Problem avoided:** shipping a component that would have crashed at runtime (wrong Base UI prop shapes) if the Radix API had been assumed instead of checked, and a lint violation that would have needed silencing rather than a clean fix.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean (the lint failure above was caught and fixed *before* this passing state, not skipped). Full behavioral verification (does clicking it actually change the theme) deferred to step 13.4, where `ThemeToggle` gets permanently mounted in the real app shell — avoided a throwaway temporary mount now that would just need reverting.

**Commands run:**
```
npx --yes shadcn@latest add toggle-group -y
# → Created components/ui/toggle.tsx, components/ui/toggle-group.tsx

# Checked the actual Base UI API before writing the component:
find node_modules/@base-ui/react -iname "*.d.ts" -path "*toggle-group*"
cat node_modules/@base-ui/react/toggle-group/ToggleGroup.d.ts
cat node_modules/@base-ui/react/toggle/Toggle.d.ts
# → confirmed: value/onValueChange are arrays, items use a `value` prop

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint
# → 1 error: react-hooks/set-state-in-effect in theme-toggle.tsx

# (extracted hooks/use-mounted.ts using useSyncExternalStore instead of
#  useState+useEffect; updated theme-toggle.tsx to use it)

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean
```

**How this moves the build forward:** step 13.4 (the app shell) just needs to render `<ThemeToggle />` somewhere in the header — the component itself, its styling, and its wiring to `next-themes` are all done and verified.

## Step 13.4 — Build the app shell (header, nav, theme toggle)

**What was done:** Built `components/shared/app-header.tsx` (a Server Component — the header container, icon mark, layout) and `components/shared/nav-links.tsx` (a Client Component — Dashboard/Orders links with active-route styling), then mounted `<AppHeader />` above `{children}` in `app/layout.tsx`, wrapped in a `<main>` with consistent page padding.

**Why the nav links needed their own Client Component, not just inline in the header:** highlighting which nav link is "active" requires knowing the current route, and Next.js layouts don't receive the pathname as a prop — `usePathname()` is a client-only hook. Rather than making the whole header a Client Component for this one detail, only `NavLinks` carries `"use client"`; the header container, the icon mark, and the overall layout stay server-rendered. A concrete, real instance of the Server/Client split principle from `plan.md`, not just a description of it.

**The brand slot is icon-only, deliberately.** The actual product name ("Khata" vs. staying with the generic "Production Analytics Dashboard" framing from the task) is a decision the user hasn't made yet — flagged twice now (once when it came up during the design checkpoint, once again when `layout.tsx`'s metadata briefly said "Khata" before being caught and reverted in step 13.1). Committing a wordmark into the header now would be deciding that question silently a third time. Used a ledger-themed icon (`lucide-react`'s `NotebookText`) instead — visually on-direction without presuming the name, and it doubles as a home link (`href="/"`, `aria-label="Dashboard home"`) rather than being purely decorative.

**A currently-expected rough edge, not a bug:** the "Orders" nav link points at `/orders`, which doesn't exist yet — Phase 3 builds it. Clicking it right now 404s. Didn't build a stub page to paper over this; a placeholder route built just to avoid a temporary 404 during incremental development would be exactly the kind of code that looks meaningful but isn't actually doing anything.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Started the dev server and fetched the real rendered HTML rather than trusting the component source: confirmed the header/icon/nav structure is present, confirmed the *actual conditional logic* fired correctly — the Dashboard link (matching the current `/` route) rendered with `border-primary text-foreground`, the Orders link rendered with the inactive `text-muted-foreground` treatment — and confirmed all three `ThemeToggle` items render with correct `aria-label`s and the `data-[state=on]:bg-primary` override baked into their class list. Checked the dev server log for errors/warnings — none. Being precise about what this does and doesn't confirm: without browser automation available, actually clicking the toggle and watching the theme repaint live isn't something this checked directly — what's confirmed is that every piece it depends on (the `next-themes` script mechanism verified in step 13.2, the component wiring verified here) is individually correct, which is as far as static/server-rendered inspection can go.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev7.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page7.html

grep -o '<a [^>]*>' /tmp/page7.html
# → confirmed: logo link (aria-label="Dashboard home"), Dashboard link
#   with border-primary text-foreground (active), Orders link with
#   text-muted-foreground (inactive)

grep -o 'data-slot="toggle-group-item"[^>]*' /tmp/page7.html
# → confirmed: 3 items, aria-label="Light"/"Dark"/"System", each with
#   data-[state=on]:bg-primary data-[state=on]:text-primary-foreground

grep -i "error\|warn" /tmp/nextdev7.log   # → none

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page7.html /tmp/nextdev7.log
rm -rf .next
```

**How this moves the build forward:** Phase 2's app-shell prerequisite work is done. Every page built from here — the dashboard (step 14 onward), and later the orders page — renders inside this shell automatically, with working navigation and a working theme toggle already in place, rather than needing shell/chrome bolted on after the fact.
