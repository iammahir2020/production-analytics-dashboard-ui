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

## Step 14 — Build the dashboard page (Server Component)

**What was done:** Replaced `create-next-app`'s boilerplate `app/page.tsx` with the real dashboard: an async Server Component that fetches all four datasets in parallel (`getSummaryStats`, `getRevenueTimeseries`, `getOrders({ pageSize: 5 })`, `getRecentActivity(5)`) and renders them. Since `SummaryCards`, the charts, and the list components are steps 15–19, this step renders the data plainly — real values in semantic markup (`dl`/`dt`/`dd` for stats, `ul`/`li` for lists), with no card or chart styling yet, and deliberately no "coming soon" placeholder UI. Each following step swaps one section for its real component.

**The decision that actually matters here — `Promise.all`, not sequential awaits.** Every service call carries its own simulated ~500ms delay (and `getSummaryStats` internally awaits `getActiveCustomerCount`, which has one too). Awaiting them one after another would stack to roughly 2 seconds; overlapping them means the page waits for the slowest single call instead of the sum. This isn't theoretical — measured it: a warm request completes in **548ms**, right where parallel execution predicts, rather than the ~2s serial execution would produce. This is the concrete "avoid request waterfalls" decision the README's performance section will cite.

**`export const dynamic = "force-dynamic"`, and why it's not just a toggle.** Without it, Next.js statically prerenders this route at build time — the build output literally showed `○ (Static)` before this change. That would mean the simulated latency happens once at build time and the deployed app serves a pre-baked HTML snapshot, so the loading skeleton (step 20) and error boundary (step 21) would *never* appear in production — they'd only ever be visible in dev. Since the task PDF explicitly requires loading and error handling, states that only work in development would be a hollow implementation. Forcing dynamic rendering makes them real. Confirmed in the build output afterward: the route flipped to `ƒ (Dynamic) server-rendered on demand`. Worth revisiting at step 54 (Lighthouse) — a ~500ms server delay does cost TTFB, so if it materially hurts the performance score, the tradeoff to examine is the simulated delay's duration, not the rendering mode.

**A small thing that avoids decay:** the period label under the heading (`Jun 18, 2026 – Sep 15, 2026`) is derived from the first and last points of the actual revenue timeseries, not a hardcoded string or a "last 90 days" label computed against the wall clock. The mock data's dates are fixed; a clock-relative label would quietly become wrong the longer the deployed app sits, while a data-derived one stays accurate forever.

**One honest note on scope:** the revenue timeseries is fetched here because this step's definition calls for it, but right now it only drives that date-range label — the charts that actually consume it arrive in steps 16–17. Fetching it now is correct (it's part of the page's data requirements and belongs in the same parallel batch), it's just not fully used yet.

**Verification:** `npm run build` (confirmed the route is now `ƒ` Dynamic), `npx tsc --noEmit`, and `npm run lint` all clean. Ran the dev server and checked the real rendered output rather than assuming: timing measured at 548ms on a warm request (the parallelism claim, actually tested); heading and data-derived period range present; `৳45,59,700.00` rendering with correct lakh grouping; 200 orders / 34 active customers / 3.5% conversion all matching the service layer's verified numbers; five real recent orders (Bangladeshi names, real statuses, lakh-grouped amounts) and five real activity entries with relative timestamps.

**Commands run:**
```
npm run build
# → Route (app): ƒ /    (was ○ / before force-dynamic)
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev8.log 2>&1 & disown
curl -s -o /tmp/page8.html -w "total: %{time_total}s\n" http://localhost:3000
# → total: 0.824026s  (first request, includes dev compile)
curl -s -o /dev/null -w "total: %{time_total}s\n" http://localhost:3000
# → total: 0.547985s  (warm — confirms parallel, not ~2s serial)

grep -o '৳[0-9,]*\.[0-9][0-9]' /tmp/page8.html    # → ৳45,59,700.00, order totals
grep -oE '>(Rahim|Nusrat|Tanvir|Jannatul|Imran|...) [A-Z][a-z]+<' /tmp/page8.html
# → Imran Kabir, Arif Islam, Tasnim Ahmed, Nusrat Talukder

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page8.html /tmp/nextdev8.log
rm -rf .next
```

**How this moves the build forward:** the dashboard's data layer is wired end to end — every number the page needs is already fetched, typed, and rendering correctly. Steps 15–19 are now purely presentational work: replace each plain section with its designed component, with no data plumbing left to figure out.

### Step 14, revised — per-section Suspense instead of one page-level `Promise.all`

**What prompted it:** the user asked a sharp question about the implementation above — with `Promise.all`, if one of the four fetches fails, the whole page fails and shows nothing. Would `Promise.allSettled` be better?

**Why `allSettled` wasn't the answer.** It gets you the partial data, but it doesn't answer *what to render where a section failed*. A silently missing revenue figure reads as zero revenue, not as a failure — arguably worse than a clear error, because it's misleading rather than just unhelpful. Doing `allSettled` properly means building per-section error UI anyway, at which point you've done most of the work for a better option and gotten less from it: no streaming, and every section still waits on the slowest one.

**What replaced it:** each section is now an async Server Component fetching its own data, behind its own `Suspense` boundary. The page itself (`app/page.tsx`) fetches nothing and isn't even `async` anymore — it's a shell. This gives failure isolation *and* independent loading states *and* streaming, for about the same amount of code.

**A design principle that fell out of the change:** sections are drawn around **data dependencies**, not visual boxes. `RevenueChart` and `OrdersChart` both read a single `getRevenueTimeseries()` result — splitting them into separate sections would either duplicate that fetch or need `cache()` deduplication to avoid it. They share one section and one boundary instead, which is also semantically right: if that fetch fails, neither chart has anything to draw.

**The measured payoff — TTFB dropped from ~500ms to 38ms.** Under the old page-level `Promise.all`, nothing could be sent to the browser until all four fetches resolved, so time-to-first-byte was the full ~500ms. With per-section Suspense, the shell flushes immediately and sections stream in as they resolve: measured **TTFB 38ms, total 538ms** on a warm request. Same total time, but roughly a 13× improvement in how fast the browser gets *something* — which feeds directly into FCP/LCP, so it should show up again at the Lighthouse step.

**An honest finding from actually testing a failure, rather than assuming.** Temporarily made `SummaryCards` throw, then requested the page to see what really happens:
- The response was still **HTTP 200**, and Recent orders / Recent activity both rendered with their real data — so failure isolation genuinely works at the streaming level, even before any error boundary exists.
- But the failed section was left **stuck showing its "Loading…" fallback indefinitely** — it never resolves and never explains itself.

That last part matters: it's exactly the "confusing silent gap" failure mode used to argue against `allSettled`. So per-section error boundaries (step 21) aren't optional polish on top of this — they're what turns a perpetual skeleton into a clear, retryable error state. Reverted the test change immediately afterward and confirmed normal rendering was restored (`Overview` section and `৳45,59,700.00` both back).

**Docs updated alongside the code**, since this supersedes an architectural claim the README will cite: `plan.md`'s Server-vs-Client section now describes the shell + per-section boundaries pattern and records why the page-level `Promise.all` was revised (including why `allSettled` was rejected); `step.md` steps 14–21 were rewritten around the new structure, with an architecture note explaining the data-dependency grouping.

**Verification:** `npm run build` (route still `ƒ` Dynamic), `npx tsc --noEmit`, `npm run lint` all clean. All three sections render with correct data; the Suspense fallback appears in the streamed output, confirming the streaming path is actually live rather than inferred.

**Commands run:**
```
npm run build      # → ƒ /  (still dynamic)
npx tsc --noEmit   # clean
npm run lint       # clean

# Streaming check — TTFB vs total:
curl -s -o /tmp/page9.html -w "TTFB: %{time_starttransfer}s   total: %{time_total}s\n" http://localhost:3000
# → TTFB: 0.038432s   total: 0.537830s

grep -o 'Overview\|Recent orders\|Recent activity' /tmp/page9.html | sort -u   # all three
grep -c 'Loading…' /tmp/page9.html                                            # fallback streamed

# Failure-isolation test (temporary throw in SummaryCards):
curl -s http://localhost:3000 -o /tmp/fail.html -w "HTTP %{http_code}\n"
# → HTTP 200; Recent orders + Recent activity still rendered;
#   Overview absent, its "Loading…" fallback stuck permanently

cp /tmp/summary-backup.tsx components/dashboard/summary-cards.tsx   # reverted
# → confirmed Overview and ৳45,59,700.00 rendering normally again
```

**How this moves the build forward:** steps 15–19 now each own one section component that already fetches its own data — purely presentational work from here. Step 20's skeletons and step 21's error boundaries now have obvious, well-defined homes (one per section) instead of being page-level catch-alls.

## Step 15 — Design SummaryCards properly

**What was done:** Replaced the plain `dl`/`dt`/`dd` markup with the confirmed hero-figure treatment from `.interface-design/system.md`: an 11px/600/uppercase/tracked/muted label over a 26px/800/tabular-nums value, with the revenue figure specifically colored `text-primary` (the Khata brand rose) and the other three staying plain foreground — "one accent used with intention," not applied to all four cards uniformly. Added shadcn's `Card` primitive (`npx shadcn add card`) rather than hand-rolling the container div, since a bordered surface tile is a pattern that'll repeat (order details, empty states) — this is the "second real reuse" threshold the project's own conventions call for extracting a shared component at.

**A real mismatch caught between the confirmed spec and shadcn's default, fixed at the source rather than per-usage.** The freshly-added `Card` component defaulted to `ring-1 ring-foreground/10` and `rounded-xl` (11.2px, via the `--radius-xl` scale step) — but the specimen the user actually confirmed used a literal `border` on the dedicated `--border` token and an 8px radius (`--radius` directly, i.e. `rounded-lg` in our scale). Rather than overriding this with a `className` prop every time `Card` gets used, edited `components/ui/card.tsx` itself (`Card`, `CardHeader`, `CardFooter` — three spots using the `xl` radius scale) so every future card — not just this one — inherits the confirmed treatment automatically. Fixing the primitive once here is what makes "use what exists" actually pay off later instead of accumulating a `className` override at every call site.

**A small extraction, not a new file.** `StatCard` (label + value, repeated four times) is a local, unexported function inside `summary-cards.tsx` rather than its own file in `components/ui/` or `components/shared/` — it's specific to this one section's exact typographic treatment, not yet a generalized pattern anything else needs. If a second section ever wants the same stat-tile shape, that's the point to actually extract it somewhere shared, not before.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Rendered the real page and checked the compiled output directly rather than trusting the source: `data-slot="card"` markup shows `rounded-lg border border-border` (confirms the primitive fix took effect, not just compiled without error), the revenue value carries the `text-primary` class, and all four real values render correctly (`৳45,59,700.00`, `200`, `34`, `3.5%`). Fetched the compiled CSS bundle directly and confirmed `--border` resolves correctly in both themes (`#e6decf` light, `#f3ecdf1a` dark — the hex8 encoding of the `rgba(243,236,223,0.1)` from `system.md`) and that `.border-border { border-color: var(--border) }` and `font-variant-numeric` (tabular-nums) rules are both actually present in the shipped CSS, not just written in the component source.

**Commands run:**
```
npx --yes shadcn@latest add card -y
# → Created components/ui/card.tsx

# (edited card.tsx: ring-1 ring-foreground/10 → border border-border,
#  rounded-xl → rounded-lg, in Card/CardHeader/CardFooter)

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev10.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page10.html -w "HTTP %{http_code}\n"   # → 200

grep -o 'data-slot="card"[^>]*' /tmp/page10.html
# → rounded-lg border border-border ... (confirms the fix compiled through)
grep -o 'text-primary[^"]*' /tmp/page10.html          # → present on revenue value
grep -o '৳45,59,700\.00\|>200<\|>34<\|>3\.5%<' /tmp/page10.html
# → all four real values present

curl -s "http://localhost:3000/_next/static/chunks/<bundle>.css" -o /tmp/bundle10.css
grep -o -- '--border:[^;}]*' /tmp/bundle10.css
# → --border: #e6decf   (light)
# → --border: #f3ecdf1a (dark — hex8 form of rgba(243,236,223,.1))
python3 -c "... find 'border-border' in the CSS ..."
# → .border-border { border-color: var(--border); }  — present

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page10.html /tmp/bundle10.css /tmp/nextdev10.log
rm -rf .next
```

**How this moves the build forward:** the `Card` primitive is now correctly aligned to the confirmed direction at the source, so `RevenueChart`/`OrdersChart` (step 16–17), `RecentOrdersList` (step 18), and any future card-shaped UI (order details, step 33) get the right border/radius treatment automatically, with zero repeated overrides.

## Step 16 — ChartsSection + RevenueChart

**What was done:** Added shadcn's `chart.tsx` (`ChartContainer`/`ChartTooltip`/`ChartTooltipContent`) — the standard Recharts+Tailwind+dark-mode integration wrapper — rather than hand-building CSS-variable theming for SVG elements myself. Built `ChartsSection` (async Server Component, fetches `getRevenueTimeseries()` once — both `RevenueChart` and step 17's `OrdersChart` will read this same result, one fetch and one Suspense boundary for both) and `RevenueChart` (Client Component): an area chart with a faint horizontal grid, a gradient fill fading to transparent, thinned x-axis date labels, a currency-formatted tooltip, and an emphasized dot on the most recent day — each a direct translation of a specific line in `.interface-design/system.md` ("an area fill, a faint grid, an emphasized endpoint"), not a generic Recharts default.

**A near-miss avoided: `npx shadcn add chart` almost silently reverted the Step 15 fix.** Adding the chart component triggered a prompt to overwrite `card.tsx` (it's a dependency of `chart`) — which would have reset the border/radius fix from step 15 back to shadcn's defaults (`ring-foreground/10`, `rounded-xl`) without any error or warning, since a "file already exists, overwrite?" prompt reads as routine, not as "this will undo a deliberate customization." Declined it (`echo "n" | npx shadcn add chart -y`) and confirmed afterward that `card.tsx` still had the fix intact. Worth remembering for every future `shadcn add`: check what it's about to touch, not just what it's adding.

**How the chart is actually themed, and why it needed checking rather than assuming.** Recharts renders raw SVG, and `fill`/`stroke` as literal attributes don't reliably resolve `var(--primary)` the same way an HTML element's CSS `background-color` would — this is a real, non-obvious cross-browser-compatibility question, not something to guess at. Read `components/ui/chart.tsx` before writing the chart to see how it actually solves this: `ChartConfig` colors get injected into a scoped `<style>` tag as `--color-{key}` custom properties, switched by a `.dark [data-chart=id] { ... }` selector — real CSS custom-property declarations inside a real `<style>` element, which sidesteps the SVG-attribute question entirely. Since `--primary` is already theme-aware (both `:root` and `.dark` define it), the chart config just points at `var(--primary)` directly rather than needing its own separate light/dark pair.

**A subtlety in `ChartTooltipContent`'s API caught by reading the source, not by trial and error:** its `formatter` prop doesn't format just the value — it replaces the *entire* row (indicator dot, label, and value together). A naive one-line `formatter={(v) => formatCurrency(v)}` would have silently dropped the "Revenue" label and the colored indicator dot from every tooltip. Wrote a formatter that reproduces the full row (dot + label + `formatCurrency`-formatted value) instead of just the number.

**The tooltip's default styling also violated the confirmed depth rule.** `ChartTooltipContent` ships `shadow-xl` by default — but `system.md` explicitly names "dramatic drop shadows" as something to avoid, only allowing "a single restrained ring" for floating elements like tooltips. Fixed this the same way as step 15's `Card` fix: edited `chart.tsx` itself (swapped `shadow-xl` + `border-border/50` for a plain `border-border`, no shadow) rather than passing a `className="shadow-none"` override at the one call site that exists today — so `OrdersChart` (step 17) and any future chart inherit the correct tooltip treatment for free.

**One invalid prop caught by the type checker, not assumed correct:** initially added `isFront` to `ReferenceDot` (recalled from an older Recharts API) to make sure the emphasized endpoint dot painted above the area fill. `tsc` rejected it — not a valid prop on this version's `ReferenceDot`. Removed it: SVG paints in document order, and `ReferenceDot` is already the last child in the JSX, so it renders on top without needing an explicit prop for it.

**A motion decision reconsidered mid-build:** first wrote `isAnimationActive={false}` on the `Area`, on the general principle from `system.md` about not animating high-frequency actions. Caught this was the wrong rule to apply — a chart's one-time entrance animation on page load isn't a repeated user action (like a keyboard shortcut or command palette), it's exactly the "rare/first-run moment" the same guidance says delight is fine for. Removed the override, keeping Recharts' default entrance animation.

**A real limitation, stated plainly rather than glossed over:** Recharts' `ResponsiveContainer` needs the browser to measure its actual rendered width (via `ResizeObserver`) before it draws real chart content — so the server-rendered HTML fetched via `curl` doesn't contain the actual SVG path/dots/axis-ticks, only the container shell. This is the same class of limitation as the theme toggle in step 13.3/13.4: no browser automation is available in this environment (confirmed again here — searched for one, found none), so the actual rendered chart pixels, hover tooltip, and dark-mode color swap aren't something this session can directly observe. What *is* verified: clean build/lint/types, no runtime errors in the dev server log, and the theme-color injection actually compiling through correctly (`--color-revenue: var(--primary)` present in both the light and dark style blocks in the real server-rendered output).

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean (after fixing the `isFront` type error). Confirmed via the rendered HTML that `ChartStyle`'s theme-injection mechanism is actually working — `--color-revenue: var(--primary)` present for both theme blocks, not just present in the component source. Confirmed `card.tsx`'s step-15 fix survived the `chart` component's dependency-overwrite prompt.

**Commands run:**
```
npx --yes shadcn@latest add chart -y
# → prompted to overwrite card.tsx (a dependency) — would have reverted
#   step 15's fix

echo "n" | npx --yes shadcn@latest add chart -y
# → Created components/ui/chart.tsx; Skipped card.tsx (declined overwrite)
grep -c "rounded-lg border border-border" components/ui/card.tsx   # → 1, fix intact

# (built revenue-chart.tsx, charts-section.tsx; wired ChartsSection into
#  app/page.tsx behind its own Suspense boundary)
# (edited chart.tsx: shadow-xl + border-border/50 → border-border, no shadow)

npm run build
# → error TS2322: Property 'isFront' does not exist on ReferenceDot props
# (removed isFront — SVG paints in document order, unnecessary)

npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev11.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page11.html -w "HTTP %{http_code}\n"   # → 200
grep -o '\-\-color-revenue: [^;]*' /tmp/page11.html
# → --color-revenue: var(--primary)  (both theme blocks)
grep -i "error\|warn" /tmp/nextdev11.log   # → none

# Confirmed no browser automation tool is available in this environment
# (searched via ToolSearch — WebFetch explicitly excludes localhost and
# only extracts text, not screenshots)

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page11.html /tmp/nextdev11.log
rm -rf .next
```

**How this moves the build forward:** the Recharts+Tailwind+dark-mode theming pattern is now established and verified once — step 17's `OrdersChart` reuses the exact same `ChartContainer`/`ChartConfig` approach with a different color, no new integration work needed. The tooltip and card primitives are both correctly aligned to the confirmed direction at the source, not per-usage.

## Step 17 — OrdersChart, same section, same fetch

**What was done:** Added `OrdersChart` — a bar chart of daily order counts — reading the same `getRevenueTimeseries()` result `ChartsSection` already fetched for `RevenueChart`. Restructured `ChartsSection` into two labeled sub-blocks ("Revenue", "Orders") stacked vertically, sharing one fetch and one `Suspense` boundary.

**Why a bar chart, not another area chart.** Revenue is a continuous quantity that flows naturally as a smooth trend; order count is a discrete daily tally — a bar chart is the more honest visual fit for "how many things happened this day," and it also means the two charts don't just look like the same shape recolored. This is the "infinite expression" principle in practice: differentiating what's actually different about the two metrics, not applying one template twice.

**Why `--chart-2`, not a new color or revenue's own `--primary`.** Reusing `--primary` for both charts would make them visually blur together at a glance. Inventing a new, unrelated hue for "orders" would work but adds a color to the palette with no other role in the app. `--chart-2` already exists and already means something — it's the same green the order-status legend uses for "completed" — so orders volume borrows a color that's already semantically tied to "orders going well," rather than a decorative pick.

**Why vertical stacking, not side-by-side.** Both charts share the same x-axis (calendar dates). Stacking them vertically means a given date sits at the same horizontal position in both charts, so the eye can trace straight down to compare "was this a big revenue day because of one large order, or many small ones?" — a side-by-side layout would force that comparison to jump across a gap instead.

**A simpler tooltip than `RevenueChart` needed, and knowing why.** `RevenueChart` required a custom `formatter` to inject `৳`-formatted currency into the tooltip row. `OrdersChart`'s values are just small integers — `ChartTooltipContent`'s *default* row rendering already calls `item.value.toLocaleString()`, which is exactly right for a plain count. No custom formatter needed here; recognizing that the default was already correct, rather than reflexively copying the pattern from the previous component, kept this one simpler.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Rendered the real page and confirmed both charts' scoped color injection is present and non-colliding — `--color-revenue: var(--primary)` and `--color-orders: var(--chart-2)` both compiled through, each chart carrying its own distinct `data-chart` id (so the two `ChartConfig`s can't leak into each other's scope even though they're rendered on the same page). Both section headings ("Revenue", "Orders") present. No errors in the dev server log.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev12.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page12.html -w "HTTP %{http_code}\n"   # → 200

grep -o 'data-slot="chart"[^>]*data-chart="[^"]*"' /tmp/page12.html
# → two distinct chart ids, confirming no color-scope collision
grep -o '\-\-color-revenue: [^;]*\|--color-orders: [^;]*' /tmp/page12.html | sort -u
# → --color-orders: var(--chart-2)
# → --color-revenue: var(--primary)
grep -o '>Revenue<\|>Orders<' /tmp/page12.html   # both present
grep -i "error\|warn" /tmp/nextdev12.log         # → none

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page12.html /tmp/nextdev12.log
rm -rf .next
```

**How this moves the build forward:** the dashboard's full data-and-charts layer (Overview, Revenue, Orders) is now complete and visually differentiated. Steps 18–19 (`RecentOrdersList`, `RecentActivityFeed`) are the last two dashboard sections left to design before the shell moves to loading/error states.

## Step 18 — Design RecentOrdersList (ledger-stamp status)

**What was done:** Extracted the order-status treatment from `system.md` into a shared `components/orders/order-status.tsx` — `ORDER_STATUS_STYLES` (a full status→style lookup) and `OrderStatusIndicator` (the dot + colored text). Extracted now, not left for Phase 3, because this exact 5-way status mapping is already known to be needed again very soon (`OrdersTable`/`OrderRow`) — a known second use, not speculative abstraction. Redesigned `RecentOrdersList` on top of it: each row gets a 3px colored left border (no pill/badge), wrapped in the `Card` primitive with its default padding zeroed out (`py-0`) so the rows own their own spacing instead of Card's padding doubling up with the rows' own.

**A real, non-obvious constraint that shaped the implementation:** Tailwind's build-time scanner only detects *literal* class-name strings in source — a dynamically assembled `` `border-l-${colorName}` `` would produce a string Tailwind never sees while scanning, so no CSS rule would ever be generated for it, and the class would silently do nothing at runtime. `ORDER_STATUS_STYLES` therefore writes out each status's full class strings (`"border-l-chart-3"`, not a color name to be interpolated later) — confirmed this actually worked by fetching the compiled CSS bundle afterward and checking `.border-l-chart-3`, `.border-l-primary`, `.border-l-chart-2`, `.border-l-chart-4`, and `.border-l-destructive` were all genuinely present as real rules, not just written in the component source.

**A real bug caught only by inspecting the actual rendered className, not by trusting a clean build.** After confirming the CSS rules existed, checked the *rendered HTML* — and found 4 of 5 order rows were missing their status border-color class entirely; only the last row (which has no bottom divider) kept it. Root cause: the divider was written as `"border-b border-border"` — but `border-border` (no directional prefix) sets `border-color` on *all four sides*, not just the bottom. `tailwind-merge` (inside the project's `cn()` helper) correctly recognized this as a genuine conflict with the row's own `border-l-chart-*` color and dropped the earlier class — which is the *right* behavior, because leaving both in would have produced exactly this bug in real, uncomposed CSS too (a later all-sides rule silently overriding an earlier left-only one). The actual fix was in the component, not the merge tool: `border-b-border` (the bottom-specific color utility) instead of the all-sides `border-border`. Re-verified afterward that all 5 rows carry the correct class, and that `.border-b-border { border-bottom-color: var(--border) }` compiled correctly.

**Why this matters beyond this one component:** it's a real, generalizable trap — any time a *directional* border/outline utility (`border-l-*`, `border-t-*`, etc.) needs to coexist with an *undirected* one (`border-border`, `border`) on the same element, reach for the directional variant on both sides of the split, not just one. Worth remembering for `OrderRow` in Phase 3, which will need the identical pattern.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean, both before and after the fix. Confirmed via the real compiled CSS bundle that all five `border-l-*` status-color utilities and `border-b-border` are genuinely generated (not just assumed from source). Confirmed via the real rendered HTML — not just the component code — that all 5 order rows carry the correct status border color after the fix, and that `OrderStatusIndicator`'s dot and text pick up the matching color classes (`bg-chart-2`/`text-chart-2` for completed, `bg-chart-4`/`text-chart-4` for cancelled, seen on the real 5 most-recent orders).

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev13.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page13.html -w "HTTP %{http_code}\n"   # → 200

curl -s "http://localhost:3000/_next/static/chunks/<bundle>.css" -o /tmp/bundle13.css
# checked .border-l-chart-3/.border-l-primary/.border-l-chart-2/
# .border-l-chart-4/.border-l-destructive — all present

python3 -c "... extract each <li class=\"...\"> from page13.html ..."
# → BUG: 4 of 5 rows missing their border-l-chart-* class entirely;
#   only the last row (no border-b) kept it

# (fixed recent-orders-list.tsx: border-border → border-b-border)

curl -s http://localhost:3000 -o /tmp/page13b.html -w "HTTP %{http_code}\n"
python3 -c "... re-extract <li class> ..."
# → all 5 rows now carry the correct border-l-chart-* class

curl -s "http://localhost:3000/_next/static/chunks/<bundle>.css" -o /tmp/bundle13b.css
# → .border-b-border { border-bottom-color: var(--border); }  — confirmed

grep -o '<span class="size-1.5[^>]*>' /tmp/page13b.html   # dot present
grep -oE 'text-chart-[0-9]|text-primary|text-destructive' /tmp/page13b.html | sort -u
# → text-chart-2, text-chart-4, text-primary all present

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page13*.html /tmp/bundle13*.css /tmp/nextdev13.log
rm -rf .next

npm run build && npx tsc --noEmit && npm run lint   # final re-check, all clean
```

**How this moves the build forward:** `OrderStatusIndicator`/`ORDER_STATUS_STYLES` are done, verified, and ready to reuse directly in Phase 3's `OrderRow` — including the directional-border lesson, which won't need rediscovering there. Step 19 (`RecentActivityFeed`) is the last dashboard section left to design.

## Steps 20 & 21 — Per-section skeletons and error boundaries (combined, at the user's request)

**What was done:** Added shadcn's `Button` and `Skeleton` primitives. Built a skeleton for each of the four dashboard sections, colocated in the same file as the real component (`SummaryCardsSkeleton`, `ChartsSectionSkeleton`, `RecentOrdersListSkeleton`, `RecentActivityFeedSkeleton`), replacing the temporary `SectionFallback` from step 14. Built `components/shared/error-boundary.tsx` (a minimal hand-rolled class component — React's error-boundary lifecycle methods, `getDerivedStateFromError`/`componentDidCatch`, only exist on class components, so this is one of the few legitimate uses of one in this codebase) and `components/shared/section-boundary.tsx` (wraps it with a retry button, `router.refresh()`, and a `key`-remount to force a clean re-mount rather than trying to time a manual state reset against `refresh()`'s async completion). Wired both into `app/page.tsx` around all four sections, and added `app/loading.tsx` (composes the same four skeletons, for route-level navigation) and `app/error.tsx` (the route-level safety net for anything outside a `SectionBoundary`).

**A deliberate decision made explicit before writing code: hand-roll the error boundary, not add `react-error-boundary`.** Considered the library — it exists for exactly this. But the reset strategy chosen (`key`-remount) bypasses its actual differentiator (`resetKeys`/`onReset`), and React's error-boundary API isn't something that's easy to get subtly wrong the way `next-themes`' SSR hydration script was — it's two lifecycle methods with a well-documented contract. No new dependency where the project's own "no dependency without a real reason" standard wasn't clearly met.

**A real, worth-naming architectural limitation, stated in the code itself, not discovered by accident:** `SectionBoundary`'s retry can't re-run just the failed section — it's a Server Component, and the only public API to re-invoke one is `router.refresh()`, which re-executes the *entire* page's Server Component tree. Clicking retry on one broken section re-fetches every section's data, not only the failed one. Documented this directly in the component's own comment, since it's a real cost of the per-section-boundary architecture worth being able to explain, not something to discover only when asked.

**A heading-placement question resolved by keeping the existing structure, not restructuring four files.** Each section's `<h2>` lives inside the async Server Component itself, gated behind the same Suspense boundary as its data — so a truly faithful skeleton needs the identical heading shown immediately. Considered lifting headings into the static shell (`app/page.tsx`) so they'd never be gated on data at all, but `ChartsSection` has *two* sub-headings under one boundary, which doesn't map cleanly onto "one heading per section" in a lifted structure. Chose the simpler, uniform rule instead: every skeleton duplicates its real component's exact heading markup. A small, explainable duplication (one string, one JSX line, four times) rather than a bigger structural change with an awkward edge case.

**Three real things found during verification — not assumed correct from a clean build:**

1. **Streaming genuinely proven, not just assumed.** Fetching the fully-resolved page via `curl` unexpectedly still contained skeleton markup (`animate-pulse`) *and* `<template>` tags — at first this looked like a bug, until recognizing it as direct evidence of how React's streaming SSR actually works: the Suspense fallback is sent first in the stream, then the real content arrives in a later chunk with a swap script. Rather than noise, this was confirmation that the skeleton is genuinely what gets streamed as the initial fallback, not just correct in isolation from its own source code.

2. **A real methodology gap caught: testing error boundaries against the dev server doesn't reflect production.** The first attempt to verify `SectionBoundary` (the same temporary-throw technique from steps 14/18) found the RSC payload contained a Next.js dev-mode-specific message: *"Switched to client rendering because the server rendering errored."* Dev mode intercepts a Server Component error for its own error-overlay tooling, bypassing the custom `ErrorBoundary` entirely — a behavior that doesn't exist the same way in production. Recognized this as a real gap in the test, not a reason to conclude the boundary was broken, and rebuilt + ran an actual production server (`npm run build && npm run start`) to re-test properly.

3. **A `curl`-based false read, caught by checking for real values specifically, not just structural markup.** Against the production build, the response still appeared to show `SummaryCards`' card markup successfully — until checking for the *actual formatted values* (`45,59,700`, `>200<`) specifically, which were absent; what was present was `SummaryCardsSkeleton`'s markup, which also wraps the real `Card` component and so produces near-identical `data-slot="card"` structure. Traced the deeper reason to the same category of limitation hit with the theme toggle and Recharts in earlier steps: resolving a Server Component error into a rendered `ErrorBoundary` fallback happens via a script tag that requires the *browser* to execute JavaScript during hydration — `curl` can only ever capture the initially-streamed skeleton, identically for both the loading and error cases, since both start from the same fallback. This isn't a bug; it's a fourth instance of the same disclosed browser-automation gap, now specifically located to "post-error client-side resolution."

**What was still verified, despite that gap:** the error is genuinely thrown and logged server-side (confirmed in both dev and production server logs); in production, no error message or stack trace leaks into the client response — only a digest hash — which is correct, secure default Next.js behavior, not something this build had to implement; and, most importantly, the other three (non-failing) sections in the *same* response resolved with real, correct content (real order statuses, real Bangladeshi customer names, real Recharts SVG output) while `SummaryCards` was failing — direct proof that failure isolation holds at the framework level, independent of whatever the failed section's own final rendered state turns out to be once a browser processes it.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean, both before and after the temporary throw was applied and reverted. Confirmed via a real production build+start (not just dev) that: normal operation renders all real data correctly with zero trace of the test change afterward; the thrown error is logged server-side; production error responses are properly sanitized (digest-only, no leaked message/stack); and sibling sections resolve independently of a failing one.

**Commands run:**
```
echo "n" | npx --yes shadcn@latest add button skeleton -y
# → Created components/ui/button.tsx, components/ui/skeleton.tsx
grep -c "rounded-lg border border-border" components/ui/card.tsx    # → 1, still intact
grep -n "shadow-xl" components/ui/chart.tsx
# → only in my own explanatory comment, not reintroduced as a class

# (built error-boundary.tsx, section-boundary.tsx, 4 skeletons, wired
#  into app/page.tsx, built app/loading.tsx and app/error.tsx)

npm run build && npx tsc --noEmit && npm run lint    # all clean

nohup npm run dev > /tmp/nextdev15.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/normal.html -w "HTTP %{http_code}\n"   # → 200
grep -o 'animate-pulse[^"]*' /tmp/normal.html | head -3
grep -o '\$S1\|<template' /tmp/normal.html | head -3
# → confirms skeleton genuinely streams as the initial fallback

cp components/dashboard/summary-cards.tsx /tmp/summary-backup2.tsx
sed -i 's|const summary = await getSummaryStats();|...throw new Error(...)|' \
  components/dashboard/summary-cards.tsx
curl -s http://localhost:3000 -o /tmp/fail3.html -w "HTTP %{http_code}\n"
# → RSC payload contains "Switched to client rendering because the
#   server rendering errored" — a dev-mode-only behavior

pkill -f "next-server"; pkill -f "next dev"
npm run build      # succeeded (force-dynamic ⇒ no build-time execution)
nohup npm run start > /tmp/nextstart.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/prodfail.html -w "HTTP %{http_code}\n"
grep -i "error" /tmp/nextstart.log   # → ⨯ Error: TEMP failure test (logged)
python3 -c "... check for real values vs skeleton-only markup ..."
# → no real values present; only skeleton markup — client-side error
#   resolution isn't observable via curl (same class of gap as the
#   theme toggle / Recharts rendering)
python3 -c "... check other sections for real content in same response ..."
# → real order statuses, real Bangladeshi names, real Recharts SVG all
#   present — isolation confirmed at the framework level

pkill -f "next-server"; pkill -f "npm run start"
cp /tmp/summary-backup2.tsx components/dashboard/summary-cards.tsx   # reverted
grep -c "TEMP failure" components/dashboard/summary-cards.tsx   # → 0, confirmed clean

rm -rf .next && npm run build && npx tsc --noEmit && npm run lint   # final re-check, clean
nohup npm run start > /tmp/nextstart2.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/final.html -w "HTTP %{http_code}\n"
python3 -c "... confirm real revenue/order values present, no TEMP leftover ..."
# → all real data correct, zero trace of the test

pkill -f "next-server"; pkill -f "npm run start"
rm -rf .next; rm -f /tmp/*.html /tmp/summary-backup2.tsx /tmp/next*.log
```

**How this moves the build forward:** Phase 2 (the dashboard) is now fully complete — every section is designed, has a matching skeleton, and has independent error handling with a documented, honest account of what retry actually does and doesn't isolate. The methodology lesson (dev-mode error interception differs from production) applies directly to Phase 3's `OrdersTable`/`OrderRow` error states too, and won't need rediscovering there.

## Step 19 — Design RecentActivityFeed properly

**What was done:** Redesigned `RecentActivityFeed` with a small neutral icon per activity type (`PackagePlus`/`RefreshCw`/`UserPlus`/`Undo2` from `lucide-react`, in a muted circle) instead of the plain timestamp-then-text line it had before, wrapped in the same `Card`-with-zeroed-padding-and-divided-rows structure as `RecentOrdersList` from step 18.

**Why the icons are deliberately neutral, not color-coded like order status.** `system.md` doesn't specify a pattern for this component at all — this was a genuine design decision, not a lookup. The obvious move would've been to reuse the same left-border-color treatment from order status, but that would apply the *same visual device* to two different kinds of data for no real reason: order status is a genuine state with 5 distinct values worth distinguishing at a glance, while activity is a chronological log where "what kind of event was this" is much lower-stakes information. Doing it anyway would dilute what the color-coding *means* everywhere else on the page — "one accent used with intention" only holds if color isn't spent on things that don't need it. Neutral icons in a circle give the feed real visual structure (per the artifact-design skill's "encode state in form as well as number") without competing with the status color language.

**Applied a step-18 lesson before it caused the same bug again.** Wrote the row divider as `border-b border-b-border` from the start, not `border-border` — even though `RecentActivityFeed`'s rows don't have a competing directional border class the way order rows do (no left-border here), so this specific instance wouldn't have actually broken anything either way. Used the correct form anyway, since it's the generally-correct pattern regardless of whether this particular case would have exposed the bug.

**A real external change noticed and left alone, not silently reverted.** While verifying this step, `RecentOrdersList`'s `RECENT_LIMIT` had changed from `5` to `15` outside this session (the harness flagged it as changed on disk). Left it as-is rather than reverting — per the standing instruction to treat unexplained file changes as probably deliberate and worth surfacing, not overwriting. Confirmed it doesn't affect `RecentActivityFeed`, which has its own separate `RECENT_LIMIT` constant.

**Verification:** `npm run build` + `npx tsc --noEmit` + `npm run lint` all clean. Rendered the real page: confirmed exactly 5 icon-circle elements (matching `RECENT_LIMIT`), confirmed all 5 rows carry the correct divider treatment (4 with `border-b border-b-border`, the last without — the step-18 pattern generalized cleanly here with no repeat of that bug), and confirmed the real activity messages and Bangladeshi names render correctly ("New order ord_0166 placed by Imran Kabir", "New customer Rahim Bhuiyan registered", etc.). One false alarm caught and resolved during verification: an initial `grep -c` on the icon-circle class returned `10`, not the expected `5` — traced this to `grep -c` counting matching *lines*, not occurrences, on HTML that's largely emitted as very few long lines; switching to an occurrence count (and a more specific selector matching the actual `<span>` element) confirmed the real count was `5` all along, with the `10` explained by Next's RSC hydration payload duplicating the class string alongside the rendered HTML — not an actual double-render.

**Commands run:**
```
npm run build      # succeeded
npx tsc --noEmit   # clean
npm run lint       # clean

nohup npm run dev > /tmp/nextdev14.log 2>&1 & disown
curl -s http://localhost:3000 -o /tmp/page14.html -w "HTTP %{http_code}\n"   # → 200

grep -c 'bg-muted text-muted-foreground' /tmp/page14.html    # → 2 (misleading: line count)
grep -o 'bg-muted text-muted-foreground' /tmp/page14.html | wc -l   # → 10 (occurrence count, still not 5)
grep -o '<span class="flex size-7[^"]*"' /tmp/page14.html | wc -l  # → 5 (the actual real element count)
# → traced the discrepancy to grep -c counting lines, and the raw
#   occurrence count including the RSC hydration payload's duplicate
#   copy of the class string — not a real bug

python3 -c "... extract <li> classes preceding the icon span ..."
# → 4 rows with 'border-b border-b-border', 1 without (the last) — correct

grep -oE 'New order .*|Order .* marked as .*|New customer .* registered|Refund issued .*' /tmp/page14.html | head -6
# → 5 real activity messages with real Bangladeshi names, correct

grep -i "error\|warn" /tmp/nextdev14.log   # → none

pkill -f "next-server"; pkill -f "next dev"
rm -f /tmp/page14.html /tmp/nextdev14.log
rm -rf .next
```

**How this moves the build forward:** all five dashboard sections (Overview, Revenue, Orders chart, Recent orders, Recent activity) are now fully designed to the confirmed direction, verified against real rendered output. Phase 2's remaining work is loading skeletons (step 20) and per-section error boundaries (step 21) — the polish that completes the Suspense architecture from step 14's revision, not new features.

## Phase 2b (steps 21.1–21.8) — Dashboard density & composition pass

**Why this phase exists at all.** After Phase 2 was reviewed on a real screen (not just in code), the dashboard read as flat despite every individual piece matching the confirmed Khata spec. Two rendered specimen artifacts drove the diagnosis before any code changed: https://claude.ai/artifact/8YpmauiFaGuMrMNTfsoYcG (original direction) and https://claude.ai/artifact/R8K26YFZEYLehT8QvZh2jA (the density study that led to this phase). Research into shipped dashboards (Linear, Stripe, Vercel teardowns) converged on the same diagnosis unprompted — one source described the canonical "AI-generated dashboard" as "a left sidebar, a top bar, four stat cards in a row, one line chart, and a table," which matched our page on four of five counts. The root cause wasn't color — it was landing-page spacing and uniform hierarchy applied to a data surface that needed to function like an instrument panel.

**A retraction, recorded because it matters for how this gets read.** An earlier recommendation (mid-conversation, before any Phase 2b code) was to widen the light/dark surface-elevation step in `globals.css`. That was **retracted** once measured against Linear's actual published values (`#08090a`/`#0f1011`/`#23252a` — a surface step of about the same size ours already had). No color token from the original confirmation changed in this phase. The one new token (`--grid-line`, step 21.5) is additive, not a revision of an existing value — it exists because panels finally have distinct shapes for a second, subtler rule to differentiate itself from.

**What was built, step by step:**

- **21.5 (built first, since 21.1/21.2/21.4 depend on it) — `--grid-line` token.** Added to `globals.css` in both themes, lighter than `--border` (`rgba(36,29,22,.06)` light / `rgba(243,236,223,.06)` dark vs. border's `.10`–`.16`). `--border` still marks a panel's outer edge; `--grid-line` marks a rule *inside* one — chart gridlines, ledger row dividers. Mapped through `@theme inline` so Tailwind generates `border-grid-line`/`stroke-grid-line` utilities automatically, same mechanism as every other semantic token already in the file.

- **21.1 — 12-column grid in `app/page.tsx`.** KPI strip (hero revenue 6/12 + three compact tiles 2/12 each), charts row (revenue 8/12, orders 4/12), content row (recent orders 7/12, recent activity 5/12). Section gaps went from `gap-8` (32px) to `gap-3` (12px); grid gutters are `gap-2` (8px). The two-Suspense-boundary content row (`RecentOrdersList` + `RecentActivityFeed`) stays two independent Suspense/`SectionBoundary` pairs — they're just laid out as grid siblings now instead of stacked divs; nothing about the Phase 2 streaming/error-isolation architecture changed, only the CSS arrangement around it. All four skeletons (`SummaryCardsSkeleton`, `ChartsSectionSkeleton`, `RecentOrdersListSkeleton`, `RecentActivityFeedSkeleton`) were rewritten in the same commit-worthy unit of work as their real counterparts — a skeleton that doesn't match its real layout causes a visible jump when the real content streams in, which would be a regression, not neutral.

- **21.2 — Charts housed, Y axis added.** Both `RevenueChart` and `OrdersChart` gained a `YAxis` (revenue's lakh-scaled via a new `formatCurrencyCompact()` in `lib/format.ts` — `৳1.5L`, not a raw number; orders' left as plain integer counts via `allowDecimals={false}`). Before this, the charts showed *shape* with no *magnitude* — a spike with no way to tell if it was ৳50,000 or ৳5,00,000. Both charts also gained a `className` prop (default `h-32`, compact) so the same component can render taller inside the new expand dialog without a second component.

- **21.3 — Type pass.** Removed `font-extrabold` (800) from every hero and compact figure in `SummaryCards`; new weight band is 400–600 (500 on figures). Explicit tracking values replace ad hoc ones: `-0.018em` on the hero figure, `-0.012em` on compact figures. The page's `<h1>Dashboard</h1>` is now `sr-only` rather than a visible heading — the nav bar already marks the active page visually, so a second same-weight label right above the KPI strip was competing with it for no benefit; kept (not deleted) for screen readers, since no other landmark states page identity.

- **21.4 — Ledger treatment for `RecentOrdersList`.** Rewritten from a `<ul>` of flex rows into a real `<table>`: date / particulars (order id + customer name) / status / amount columns. The 3px status-color "stamp" moved from the row's left border (not expressible on a `<tr>` under `border-collapse`) to the date cell's left border — same visual device, correct element. Cancelled/refunded orders render red-ink with parenthesised amounts (`(৳14,600.00)`, real double-entry-bookkeeping convention) via a local `NEGATIVE_STATUSES` set that mirrors — but doesn't import — `getSummaryStats()`'s private `SPENT_STATUSES`, since importing would couple a display decision to an unexported implementation detail. A `<tfoot>` row sums the visible rows as "Net · 8 shown" under a `border-double` rule — a real double ruled total, not a decorative border-width trick (`border-style: double` genuinely renders as two parallel hairlines). Row count went from 5 to 8. `RECENT_LIMIT` in `RecentActivityFeed` was deliberately left at 5 — not asked for, and there was no reason for the two lists to move in lockstep.

- **21.6 — `ExpandableChart` + the corner expand control.** New `components/shared/expandable-chart.tsx` wraps shadcn's `Dialog` (added via `shadcn add dialog`; its `DialogContent`/`DialogFooter` had the exact same `ring-1 ring-foreground/10` + `rounded-xl` drift `card.tsx` (step 15) and `chart.tsx` (step 16) had — fixed at the source the same way, third time this exact pattern has shown up in a shadcn primitive). The expand button is always visible, not hover-gated (hover-only would be undiscoverable on a dashboard and dead on touch), sized via the button primitive's existing `icon-xs` variant. Both charts' `margin.right` went from 8 to 20 so the button never sits on top of the last date label — a small, permanent, unconditional reservation rather than logic that only applies "when a button is present."

  **A real bug found only by running the actual server, not by tsc/lint/build.** The first version of `ExpandableChart` took a `renderExpanded: () => ReactNode` render-prop, matching the pattern used in the throwaway browser-only mockup artifact. `ChartsSection` (a Server Component) passing that closure into `ExpandableChart` (`"use client"`) built cleanly, typechecked cleanly, and linted cleanly — then threw at request time in production: *"Functions cannot be passed directly to Client Components... Or maybe you meant to call this function rather than return it."* Functions aren't serializable across the RSC boundary; only rendered elements are (the same reason `children` works from Server to Client Components at all). Fixed by changing the prop to `expanded: ReactNode` — the Server Component constructs both the compact and expanded chart elements directly and passes both down as ordinary props. This is the kind of gap the project's established verification discipline (curl/production testing beyond just `next build`) exists to catch, and did.

- **21.7 — Real period deltas, sequenced last.** `getSummaryStats()` now returns `revenueDelta`, `ordersDelta` (a new `PeriodDelta` type — signed fraction + up/down/flat direction), and `revenueSparkline` (last 30 days of daily revenue). The comparison window is trailing-30-days vs. the prior 30, anchored on the *latest order's own timestamp* rather than `Date.now()` — the mock dataset is a fixed ~90-day window, so anchoring on real wall-clock time would silently drift the window away from where the data actually is as real time passes. `bucketByDay()` was extracted as a shared helper so `getSummaryStats()`'s 30-day sparkline bucketing and `getRevenueTimeseries()`'s full-range bucketing aren't two copies of the same loop. **Deliberately incomplete, on purpose:** `.interface-design/system.md` already had a standing rule against fabricating trend data, and it was honored literally — Active Customers and Conversion Rate get **no** delta, because the mock dataset has no per-period join tracking (`Customer.active` is a point-in-time boolean, not a per-period signal) and no per-period visitor counts (`mock-analytics.json`'s `totalVisitors` is a single all-time figure). Two of four KPI tiles show a real, computed trend; two don't, and the code comments say why rather than leaving it looking like an oversight.

- **21.8 — `.interface-design/system.md` brought back in sync.** Added a dated revision note at the top rather than silently rewriting the original spec (the original numbers are still visible as "what changed and why," not erased); updated the spacing/type-scale tables to the numbers actually in the code now; documented the summary-card restructure, the real-deltas-with-explicit-exceptions rule, the housed/scaled charts, and the ledger treatment; added `--grid-line` to the color table with a one-line explanation of how it differs from `--border`.

**Verification.** `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean on the first pass — none of them caught the RSC function-prop bug above, which only surfaced running `npm run start` against a real request. After the fix: rebuilt, ran the production server, and independently recomputed the period deltas in a standalone Node script directly against `mock-orders.json` (not trusting the UI's own math) — got 36.8% (revenue) and 3.1% (orders), which matched the rendered HTML exactly. Confirmed via raw HTML inspection: the real revenue figure (`৳45,59,700`), both expand-button `aria-label`s (absent before the fix, present after), the ledger's `Net · 8 shown` total, four parenthesised red-ink amounts among the 8 rendered rows, both `border-grid-line`/`stroke-grid-line` utilities compiled into the production CSS bundle resolving to the correct per-theme values, zero remaining `font-extrabold` in any dashboard component, and the `sr-only` `<h1>` present for accessibility. One known, disclosed verification boundary, consistent with every prior step: whether the dialog visually opens, the chart genuinely re-renders larger inside it, and the expanded axis shows more resolution are all client-side-only behaviors `curl` cannot observe — confirmed instead that `DialogContent` correctly does *not* appear in server HTML while closed (consistent with expected portal/mount behavior, not a bug), which is as far as this environment's tooling can verify without a browser.

**Commands run:**
```
npx shadcn@latest add dialog -y   # (piped "n" to any overwrite prompt) → dialog.tsx added, button.tsx skipped (identical)

npx tsc --noEmit    # clean
npm run lint        # clean
npm run build       # succeeded

# first production run — surfaced the real bug:
npm run start > /tmp/dashboard-prod.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/dashboard.html
cat /tmp/dashboard-prod.log
# → "Error: Functions cannot be passed directly to Client Components..." x2 (Revenue + Orders panels)

# fixed ExpandableChart's renderExpanded closure → expanded ReactNode prop, updated call sites

kill -9 <lingering next-server pid>   # a prior server hadn't exited cleanly
npm run build                          # succeeded
npm run start > /tmp/dashboard-prod2.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/dashboard2.html
cat /tmp/dashboard-prod2.log           # → clean, no errors

grep -o 'aria-label=.\{0,40\}' /tmp/dashboard2.html | grep -i expand
  # → aria-label="Expand Revenue chart", aria-label="Expand Orders chart"
grep -oE '[0-9]+\.[0-9]%' /tmp/dashboard2.html | sort -u   # → 3.1%, 3.5%, 36.8%
grep -o 'Net.\{0,25\}' /tmp/dashboard2.html                 # → "Net · 8 shown"
grep -o '(৳[0-9,]*\.[0-9]*)' /tmp/dashboard2.html | sort -u # → 4 parenthesised red-ink amounts
grep -o '<h1[^>]*>Dashboard</h1>' /tmp/dashboard2.html      # → class="sr-only", present

node -e "... independently recompute revenueDelta/ordersDelta straight from mock-orders.json ..."
  # → 36.8% / 3.1%, matching the rendered page exactly — confirms periodDelta() math, not just its presence

grep -o '\.border-grid-line{[^}]*}' .next/static/chunks/*.css   # → resolves to var(--grid-line)
grep -o '\.stroke-grid-line{[^}]*}' .next/static/chunks/*.css  # → resolves to var(--grid-line)
grep -o '\-\-grid-line:[^;]*' .next/static/chunks/*.css        # → #241d160f (light), #f3ecdf0f (dark) — both = alpha .06
grep -rn "font-extrabold" components/dashboard/                # → none (only an explanatory comment)
grep -o 'data-slot=.dialog-content.' /tmp/dashboard2.html       # → none while closed, as expected

pkill -9 -f "next-server"; pkill -9 -f "npm run start"
```

**How this moves the build forward:** the dashboard's composition, density, type, and its one real signature (the ledger) are now aligned with how the direction was always meant to read, not just how each token was individually specified. The RSC render-prop lesson (functions can't cross Server→Client boundaries; pass rendered elements instead) applies directly to any future component that needs to hand a Client Component "what to show under some condition" — worth remembering before Phase 3's `FiltersBar`/`OrdersTable` split, which will have a similar Server-shell-feeds-Client-component shape. Phase 3 (orders page) is next; step 49b (revisiting the per-section Suspense architecture) still explicitly waits for the Phase 7 performance pass, unaffected by this phase's changes.

### Follow-up fixes (same session, after review on a real screen)

The user reviewed the phase on an actual desktop screenshot (with the revenue chart expanded) and asked two things: whether the mobile layout actually holds up, and to fix a visible dialog problem. Both led to real, confirmed bugs — none of which `tsc`/`lint`/`build` had any way to catch, since they're either purely visual (the dialog collision was visible in the screenshot itself) or breakpoint-conditional (only apply below `lg`, which the build doesn't render at any particular width).

- **`HeroStat` had no mobile column span.** `className="lg:col-span-6"` only applies at `lg`+ — below that, a grid item with no span class defaults to spanning 1, so on the mobile `grid-cols-2` grid the revenue tile rendered at the *same half-width* as "Total orders" beside it. The one figure meant to lead collapsed to parity with everything else exactly on the viewport where hierarchy matters most, since there's no side-by-side chart/table context to lean on there. Same bug existed in `SummaryCardsSkeleton`'s hero card — fixed both together so they still match.

- **Three compact tiles don't divide evenly into a 2-column mobile grid.** Fixing the above surfaced a second issue: with the hero now correctly full-width, the three compact tiles (Total orders / Active customers / Conversion rate) were sitting in a `grid-cols-2` grid — two filled a row, the third sat alone with an empty cell beside it. Switched the mobile grid to `grid-cols-3` (hero `col-span-3`, full row; each compact tile `col-span-1`, filling the row beneath evenly) rather than `grid-cols-2`. This is a case where fixing a reported bug immediately revealed an adjacent one the report didn't mention — worth checking neighboring code for the same class of mistake, not just the exact line pointed at.

- **Dialog close button overlapping the meta text (visible directly in the user's screenshot).** shadcn's `DialogContent` renders its close button `absolute top-2 right-2`. `ExpandableChart`'s modal header put the meta string (`"daily · ৳ lakh"`) flush right via `justify-between`, landing directly under that button. Fixed with `pr-9` on the header row — enough clearance for the button's footprint (`icon-sm`, 28px, offset 8px from the edge) without touching the shared `dialog.tsx` primitive, since this collision is specific to how *this* header composes content edge-to-edge, not a defect in the primitive itself.

- **Dialog width capped at 768px regardless of screen size.** The user asked for it to grow on larger screens — the entire point of the expanded view is more resolution, and a fixed cap left most of a desktop monitor unused (visible in the screenshot: the modal occupied roughly 60% of the visible width). Changed to `sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl`, scaling from 672px up to 1024px as viewport grows.

**Verification.** `tsc`, `lint`, and `build` clean. Ran the production server again and confirmed via raw HTML/CSS inspection: `col-span-3 lg:col-span-6` present on the hero card, both `SummaryCards` and `SummaryCardsSkeleton` using `grid-cols-3`, `pr-9` compiled to real CSS, and all three responsive dialog-width utilities (`sm:max-w-2xl`, `lg:max-w-4xl`, `xl:max-w-5xl`) present in the production CSS bundle under their correctly-escaped selectors. The same limitation as before applies to the collision fix specifically: confirming the button and text no longer visually overlap needs an actual rendered viewport, which this environment doesn't have — the fix is dimensionally sound (computed against the button's actual size and offset, not guessed) but not eyeballed against a live render.

**Commands run:**
```
npx tsc --noEmit && npm run lint    # clean
rm -rf .next && npm run build       # succeeded

kill -9 <stale next-server pid>     # a previous run's server hadn't exited
npm run start > /tmp/dashboard-prod4.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/dashboard4.html
cat /tmp/dashboard-prod4.log        # clean, no errors

grep -o 'class="[^"]*col-span-3 lg:col-span-6[^"]*"' /tmp/dashboard4.html   # → hero card confirmed
grep -o 'grid grid-cols-3[^"]*' /tmp/dashboard4.html                        # → both real + skeleton grids
grep -o '\.pr-9{[^}]*}' .next/static/chunks/*.css                           # → padding-right compiled
grep -o '\.sm\\:max-w-2xl{[^}]*}\|\.lg\\:max-w-4xl{[^}]*}\|\.xl\\:max-w-5xl{[^}]*}' .next/static/chunks/*.css
  # → all three present, resolving to --container-2xl/4xl/5xl
grep -o 'aria-label="Expand[^"]*"' /tmp/dashboard4.html                      # → both still present

pkill -9 -f "next-server"; pkill -9 -f "npm run start"
rm -rf .next; rm -f /tmp/dashboard*.html /tmp/dashboard-prod*.log
```

**How this moves the build forward:** confirms a real-screen review still catches things a clean build/lint/tsc pass can't — worth doing at the end of every visual phase, not just when something looks obviously wrong. No changes to Phase 3's plan; still next.

## Phase 2c (steps 21.9–21.14) — Dashboard richness (Tier A)

**Why this phase exists.** Before starting the orders page, the user asked what more the dashboard could meaningfully show — an explicit research request ("run a check and let me know"), not a build request. That led to a plan-mode audit of every field already sitting in `mock-orders.json`/`mock-customers.json` but never surfaced, checked against real aggregation (not just "the field exists" — a throwaway Node script confirmed each candidate produces a non-degenerate distribution before it made the menu). The full menu, split into Tier A (zero new mock data) and Tier B (would need a new field — payment method, courier, region, all grounded in `.interface-design/system.md`'s own stated Bangladesh e-commerce direction but never actually captured on `Order`), is recorded in `plan.md`'s "Dashboard metrics" section. The user picked Tier A core: order status breakdown, top products by revenue, average order value, cancellation/refund rate — deliberately not all seven Tier A candidates, weighed against the Stripe/Linear "four KPI cards, nothing else competing" research from before the Phase 2b density pass. Tier B stays documented, not built.

**What was built:**

- **Types** (`lib/types/analytics.ts`): `StatusBreakdownPoint` (`{status, count}`), `TopProduct` (`{productName, revenue, unitsSold}`), and `averageOrderValue` added to `AnalyticsSummary`.
- **Service layer** (`lib/api/analytics.ts`): `getOrderStatusBreakdown()` counts all 5 statuses explicitly (via a local `ALL_STATUSES` array, not derived from the data) so a status with zero current orders still appears at count 0 rather than silently vanishing from the breakdown. `getTopProducts(limit)` aggregates every spent-status order's `items[]` by product name, summing `quantity × unitPrice` and units sold — data that's been fetched on every order since step 7 and never once aggregated anywhere until now. `getSummaryStats()` gained `averageOrderValue`, computed as `totalRevenue ÷ spentOrders.length`, **not** `÷ orders.length` — roughly a quarter of orders are cancelled/refunded and contribute nothing to revenue, so dividing by all 200 would understate what a completed sale actually averages. This is exactly the kind of metric-definition reasoning the "AI-assisted development quality" criterion wants visible, not just the resulting number.
- **Shared status→color** (`components/orders/order-status.tsx`): added `ORDER_STATUS_COLOR_VAR` (raw `var(--chart-3)` etc.) alongside the existing Tailwind-class `ORDER_STATUS_STYLES` — Recharts' `<Cell fill>` needs an actual color value, not a class name, so this is a second *form* the mapping has to exist in, not a second decision about what it should be; both stay hand-in-sync by construction since they're defined in the same file. Also promoted `NEGATIVE_ORDER_STATUSES` (cancelled/refunded) from a locally-duplicated set in `recent-orders-list.tsx` to a shared export here, since the status-breakdown's cancellation-rate figure is the exact same domain rule at a second real call site — the point where local duplication stopped being the more honest choice. `recent-orders-list.tsx` now imports it instead of re-declaring it.
- **`StatusDonut`** (`components/dashboard/status-donut.tsx`, Client Component): a minimal Recharts `PieChart`/`Pie`/`Cell` donut with no tooltip — the adjacent legend already shows exact counts, so a hover tooltip would just repeat it. Passes an empty `{}` as `ChartContainer`'s config since nothing here uses the tooltip/legend theming machinery that prop exists for.
- **`OrderStatusBreakdown`** (`components/dashboard/order-status-breakdown.tsx`, Server Component): fetches the breakdown once, renders the donut plus a legend list (dot + label + count per status, reusing `ORDER_STATUS_STYLES`), and derives the cancellation/refund rate from that same array rather than a second fetch or a second service-layer call.
- **`TopProducts`** (`components/dashboard/top-products.tsx`, Server Component): a **ranked list, not a chart** — five items read faster as ranked rows than as a bar chart, and this reuses the ledger's own row/rule/`tabular-nums` conventions from Phase 2b rather than inventing a third numeric-display pattern.
- **Layout**: a new insights row in `app/page.tsx` between the charts row and the recent-orders/activity row — `OrderStatusBreakdown` (5/12) + `TopProducts` (7/12), each its own `Suspense`/`SectionBoundary` pair. This is a genuinely new data dependency (order aggregation, not the revenue timeseries `ChartsSection` already owns), so per the project's own "sections follow data dependencies, not visual boxes" rule it's a new section, not folded into an existing one. `SummaryCards`' KPI strip resized from 4 tiles to 5 to fit AOV: hero `lg:col-span-4` (was 6) + four compacts `lg:col-span-2` each; mobile `grid-cols-4` (was 3), hero `col-span-4` (an *explicit* base-breakpoint span, not just an `lg:` one — directly applying the lesson written into `step.md`'s standing rules after last session's bug) + compacts `col-span-1` each, filling the row beneath exactly. `app/loading.tsx` got the matching skeleton row in the same step, not after.

**A small thing caught and fixed while writing it, not after:** the first draft of `HeroStat`'s className was `"col-span-4 lg:col-span-4"` — a redundant `lg:` override repeating the same value the base breakpoint already set. Simplified to plain `col-span-4` once noticed, since 4/4 on the mobile grid and 4/12 on desktop are both correctly expressed by the same literal with no override needed. Caught the identical redundancy in the skeleton's matching Card a moment later and fixed that too, before either shipped.

**Verification.** `tsc`, `lint` (one pre-existing, unrelated warning — see below), and `build` all clean. Production server run with no errors. Every number was independently recomputed in a standalone Node script directly against `mock-orders.json` — not trusting the UI's own math, same discipline as Phase 2b's delta check:

- AOV: script → ৳31,446.21; rendered page → ৳31,446.21 (exact match)
- Top 5 products by revenue: script → 27-inch Monitor ৳11,22,000 (51 sold), Standing Desk Converter ৳10,23,000 (66 sold), Noise-Canceling Headphones ৳6,88,500 (81 sold), Portable SSD 1TB ৳6,05,200 (68 sold), Mechanical Keyboard ৳2,52,000 (56 sold) — every figure found verbatim in the rendered HTML
- Status counts: script → pending 19, processing 34, completed 92, cancelled 30, refunded 25; all five found exactly in the rendered legend
- Cancellation/refund rate: script → 27.5%; rendered page → 27.5%

One thing worth naming: none of this was fabricated to look precise — the service-layer functions and the verification script use completely independent code paths (one in the app, one a throwaway script reading the same JSON directly), so an exact match across roughly a dozen numbers is real confirmation, not coincidence.

**Noticed, not touched:** `lib/api/client.ts` has changed outside this session — `mockFetch` now defaults to a random 1–2000ms delay (`generateRandomDelay()`) instead of the fixed 500ms `DEFAULT_DELAY_MS`, which is now dead code (a lint warning, not an error). Per the standing rule on unexplained external changes, this wasn't silently reverted or "fixed" — flagged to the user instead, since it's a real behavioral change (section loading times are now inconsistent instead of predictable) that wasn't part of this phase's scope.

**Commands run:**
```
npx tsc --noEmit    # clean
npm run lint        # 1 pre-existing warning (lib/api/client.ts, unrelated to this phase), 0 errors
rm -rf .next && npm run build   # succeeded

kill -9 <stale next-server pid>
npm run start > /tmp/dashboard-2c.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/dashboard-2c.html -w "HTTP %{http_code}, %{time_total}s\n"
  # → HTTP 200, ~1.95s (consistent with the new random 1-2000ms delay range)
cat /tmp/dashboard-2c.log   # clean, no errors

grep -o 'Avg\. order value...' /tmp/dashboard-2c.html          # → ৳31,446.21
grep -o 'grid grid-cols-4[^"]*' /tmp/dashboard-2c.html          # → both real + skeleton grids
grep -o "Order status\|Top products" /tmp/dashboard-2c.html     # → both headings present
grep -oE "৳[0-9,]+\.[0-9]{2}" /tmp/dashboard-2c.html | sort -u  # → all 5 top-product revenue figures present
grep -o '.\{0,15\}sold.\{0,15\}' /tmp/dashboard-2c.html         # → 51/66/81/68/56 sold (split across RSC text nodes)
grep -oE '"font-medium tabular-nums\\?">[0-9]+' /tmp/dashboard-2c.html | grep -oE '[0-9]+$' | sort -n | uniq -c
  # → 19, 25, 30, 34, 92 — all 5 status counts, exactly once each
grep -o '27\.5%' /tmp/dashboard-2c.html                          # → present

node -e "... independently recompute AOV, top 5 products, status counts, cancellation rate directly from mock-orders.json ..."
  # → every figure matched the rendered page exactly

pkill -9 -f "next-server"; pkill -9 -f "npm run start"
rm -rf .next; rm -f /tmp/dashboard-2c.html /tmp/dashboard-2c.log
```

**How this moves the build forward:** the dashboard now surfaces status health, what's actually selling, and a real per-sale average — real ops content, not just volume/count figures — while staying inside the same "four cards, nothing competing" discipline the research argued for. Tier B (payment method, courier, region) stays documented and deliberately unbuilt in `plan.md`, available to revisit without re-deriving the reasoning. Phase 3 (the orders page) is next.

## Density recalibration (post-Phase-2c, on a real screenshot)

**Why this happened.** The user sent an actual full-browser screenshot of the dashboard at 100% zoom on a wide monitor and asked for a look — not a build request yet, an "examine and tell me what you think" request. Checking every explicit size value in the codebase (not just eyeballing) confirmed the observation was real: nearly the entire page sat in a 10–14px range — KPI labels at 10px, every section heading at 12px, table headers at 10px, chart tick labels at 10–11px — with only the two hero KPI figures breaking that range. The container was also capped at `max-w-6xl` (1152px), leaving real dead margin on a genuinely wide window.

**Root cause, named honestly.** This is a direct, traceable consequence of the Phase 2b density research, not a fresh mistake. That pass correctly diagnosed a real problem (landing-page spacing on a data surface) using Linear as a reference point — but Linear is calibrated for power users who live in a tool 8 hours a day and tolerate extreme density as a deliberate tradeoff. This dashboard's actual audience — a grader reviewing it, or a shop owner checking in periodically — is closer to Stripe's audience: wants it to look sharp and be legible *at a glance*, not optimized for maximum data-per-screen over a long session. The whole scale got calibrated against the wrong reference point.

**What was changed — the recalibration table, agreed with the user before any code changed:**

| Element | Before | After |
|---|---|---|
| Page container | 1152px (`max-w-6xl`) | 1280px (`max-w-7xl`) |
| Section headings | 12px | 13px |
| KPI labels | 10px | 11px |
| Hero KPI value | 28px | 34px |
| Compact KPI value | 20px | 24px |
| Delta badge | 11px | 12px |
| Table headers, chart panel labels | 10px | 11px |
| Chart tick labels | 10–11px | 11–12px |
| Chart height | 128px | 160px |
| Donut | 128px | 160px (was already bumped once this session, 96→128, for the restructure two turns earlier) |
| Card padding (KPI tiles, order status) | 12px (`size="sm"`) | 16px (Card's own default — dropped the `sm` prop rather than hand-tuning a new value) |
| Ledger/list row padding | 12/8px | 16/10px |

Deliberately **not** reverted to Phase 2b's original pre-density-pass spacing (32px gaps, etc.) — that would reintroduce the exact flatness problem Phase 2b fixed. This is a middle point: still tight, still not landing-page-spacious, just recalibrated against a more accurate reference for who's actually looking at it.

**A real bug found and fixed along the way, not just a size bump.** `app-header.tsx` had its own independent `max-w-6xl` on the header's inner container — separate from `app/layout.tsx`'s `<main>`. Widening only the page container would have left the header narrower than the content below it, visibly misaligning the two. Caught before it shipped, not after.

**A real consolidation, done because this pass made it worth it.** The uppercase section heading (`<h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">`) was identical, literal, duplicated markup across 5 files (order status, top products, recent orders, recent activity — real + skeleton version of each). Bumping its size meant editing that same string in all of them regardless, so this was the moment to extract `components/shared/section-heading.tsx` — a `<SectionHeading>` component — rather than editing eight near-identical strings and leaving the duplication for the next person to rediscover. This is exactly the downside of Phase 2b's "explicit px value + comment" approach that was named out loud when proposing this recalibration: no single place to adjust a shared value. One extraction doesn't fix that structurally for every value (KPI figure sizes, chart tick sizes etc. are still separate per-file literals, deliberately — they're not actually identical across contexts the way the heading was), but it fixes the one case that genuinely was the same thing repeated.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning from `lib/api/client.ts`), and `build` all clean. Production server run with no errors. Confirmed via raw HTML/CSS inspection: `max-w-7xl` present, `max-w-6xl` completely gone (both `layout.tsx` and the header), all the new literal size classes (13px headings, 34px hero, 24px compact, 40-unit chart/donut heights) compiled and landed on the right elements — and, importantly, the actual data values (`৳45,59,700.00`, `৳31,446.21`) are untouched and still correct, confirming the type-scale edits didn't accidentally disturb any of the number formatting or computation logic they sit next to.

**Commands run:**
```
npx tsc --noEmit    # clean
npm run lint        # 1 pre-existing warning (lib/api/client.ts, unrelated), 0 errors
rm -rf .next && npm run build   # succeeded

npm run start > /tmp/dashboard-scale.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/dashboard-scale.html -w "HTTP %{http_code}\n"   # → 200
cat /tmp/dashboard-scale.log   # clean, no errors

grep -o "max-w-7xl" /tmp/dashboard-scale.html | sort -u   # → present
grep -c "max-w-6xl" /tmp/dashboard-scale.html              # → 0, fully removed
grep -o 'text-\[13px\][^"]*uppercase' /tmp/dashboard-scale.html | sort -u   # → section headings
grep -o 'text-\[34px\][^"]*' /tmp/dashboard-scale.html      # → hero value
grep -o 'text-\[24px\][^"]*' /tmp/dashboard-scale.html      # → compact value
grep -c "h-40" /tmp/dashboard-scale.html                    # → 4 (both charts + skeleton + donut)
grep -o "h-40 w-40 shrink-0" /tmp/dashboard-scale.html       # → donut confirmed
grep -o "৳45,59,700.00" /tmp/dashboard-scale.html            # → revenue figure untouched
grep -o "৳31,446.21" /tmp/dashboard-scale.html               # → AOV figure untouched

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/dashboard-scale.html /tmp/dashboard-scale.log
```

**How this moves the build forward:** no architectural or data changes — purely a visual recalibration prompted by seeing the real thing on a real screen, which is exactly the kind of gap `tsc`/`lint`/`build` alone can never catch and this project has repeatedly needed a live look to find. Nothing in `step.md` needed a new checkbox for this — it's a refinement within the already-completed Phase 2b/2c scope, not new planned work. Phase 3 is still next.

## Step 22 — Build the orders page shell (Server Component, searchParams)

**What was done:** `app/orders/page.tsx` — an async Server Component reading `searchParams`, parsing them into the existing `OrderFilters` type, and calling `getOrders(filters)` server-side. Renders the result plainly (semantic markup, no styling) — the same precedent Step 14 set for the dashboard shell, where later steps swap plain rendering for designed components. `FiltersBar`, the real `OrdersTable`, and `Pagination` are steps 23–27; this step only has to prove the URL → filtered fetch path genuinely works.

**Why this page is a single Server Component, not a shell with per-section Suspense like the dashboard.** The dashboard needed multiple independent boundaries because it has four genuinely separate data dependencies that can succeed or fail on their own. The orders page has exactly one — the filtered order list — so per the project's own "sections follow data dependencies" rule, one dependency gets one boundary: `app/orders/loading.tsx`/`error.tsx` (steps 28–29) will cover it at the route level, the same role `app/loading.tsx`/`error.tsx` already play for the dashboard shell. `export const dynamic = "force-dynamic"` for the same reason as the dashboard — `getOrders()` goes through the simulated `mockFetch` delay, and a searchParams-driven route can't be meaningfully static-prerendered regardless.

**The one real validation decision.** `status` is checked against the closed `OrderStatus` enum before being handed to `getOrders()` — an arbitrary or mistyped query string falls back to `"all"` rather than silently producing a filter that matches zero orders. Date params (`from`/`to`) are passed through unvalidated on purpose: step 23's date picker doesn't exist yet, so there's no real source of malformed values to guard against, and validating a problem that can't currently occur would be exactly the "code that looks meaningful but isn't doing real work" the project's standing rule warns against.

**A real, if minor, TypeScript gap worth remembering.** `tsc --noEmit` run standalone right after creating the file failed with `Type '"/orders"' does not satisfy the constraint '"/"'` — Next only regenerates its ambient route types (`.next/types/routes.d.ts`, which is what makes `PageProps<'/orders'>` resolve) during an actual `dev`/`build` run, not on a bare `tsc` invocation. Running `npm run build` once (which regenerates those types as a side effect) resolved it, and the route correctly showed as `ƒ /orders` (Dynamic) in the build output. Worth remembering for any future new route: build once before trusting a standalone `tsc` failure about a brand-new route's prop types.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning), and `build` all clean, `/orders` confirmed `ƒ` Dynamic. Production server run, four real requests against real query strings — not just "the page returns 200":
- `/orders` → "Showing 1–10 of 200 orders", first order `ord_0166`
- `/orders?status=pending` → "Showing 1–10 of **19** orders" (all 10 visible rows genuinely `pending`) — the 19 matches the pending count independently verified back in Phase 2c, confirming the filter is real, not decorative
- `/orders?page=2` → "Showing 11–20 of 200 orders", first order `ord_0040` — a genuinely different row than page 1's `ord_0166`, confirming pagination changes the actual data, not just the displayed range text
- `/orders?status=bogus` → identical to the unfiltered default (same count, same first order) — confirms the fallback-to-`"all"` validation works exactly as intended, rather than either crashing or silently matching nothing

**Commands run:**
```
mkdir -p app/orders

rm -rf .next && npm run build   # first attempt: standalone tsc had failed on PageProps<'/orders'>
# → build itself succeeded, regenerating .next/types; Route (app): ƒ /orders (Dynamic)

npx tsc --noEmit    # now clean, route types present
npm run lint        # 1 pre-existing warning (lib/api/client.ts, unrelated), 0 errors

npm run start > /tmp/orders-page.log 2>&1 &
curl -s http://localhost:3000/orders -o /tmp/orders-default.html -w "HTTP %{http_code}\n"              # → 200
curl -s "http://localhost:3000/orders?status=pending" -o /tmp/orders-pending.html -w "HTTP %{http_code}\n"  # → 200
curl -s "http://localhost:3000/orders?page=2" -o /tmp/orders-page2.html -w "HTTP %{http_code}\n"        # → 200
curl -s "http://localhost:3000/orders?status=bogus" -o /tmp/orders-bogus.html -w "HTTP %{http_code}\n"  # → 200
cat /tmp/orders-page.log   # clean, no errors

python3 -c "... extract the raw 'Showing N-N of N' text + first order id per response ..."
# → default: 1-10 of 200, ord_0166
# → pending: 1-10 of 19, ord_0130 (10/10 visible rows are 'pending')
# → page=2:  11-20 of 200, ord_0040 (different row than page 1)
# → bogus:   1-10 of 200, ord_0166 (identical to default — fallback confirmed)

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/orders-*.html /tmp/orders-page.log
```

**How this moves the build forward:** the orders page's entire data path — URL to filters to fetch to rendered rows — is proven correct end to end before any of the interactive UI exists to drive it. Steps 23–27 are now purely component work (`FiltersBar`, `OrdersTable`, `OrderRow`, `Pagination`) wiring into a foundation that's already been tested against real query strings, not something to figure out alongside the new components.

## Steps 23–30 — Finish Phase 3: FiltersBar, OrdersTable, Pagination, loading/error, EmptyState

**What was done, by piece:**

- **`hooks/use-debounced-value.ts`** — a generic `useDebouncedValue<T>(value, delayMs)`. Debounces the *value*, not the event handler, so the input stays fully responsive to every keystroke; only the returned value lags behind.
- **`hooks/use-order-filters.ts`** — `useOrderFiltersUrl()`, the single owner of reading/writing the orders page's URL filter state (`q`/`status`/`from`/`to`). Two real call sites from the start: `FiltersBar` (the inputs) and `OrdersTable`'s empty state (the "Clear filters" button) — built as a shared hook because both needed it, not spec­ulatively. Uses `router.replace` (not `push`, so a filter tweak doesn't add a browser-history entry the back button has to walk through) with `scroll: false` (so a filter change doesn't jump the page to the top).
- **`components/orders/filters-bar.tsx`** — search input (debounced), status `Select`, two native `<input type="date">` for the range, a "Clear" button shown only when a filter is active. **Native date inputs, not a calendar/Popover picker** — a real dependency-vs-simplicity tradeoff: shadcn's date-range UI needs `react-day-picker` on top of Popover+Calendar, and two native date inputs are zero new dependencies, keyboard-operable, and use the OS's own picker on mobile (arguably better UX there, not just simpler). Consistent with the project's standing "no dependency without a real reason" rule.
- **`components/shared/pagination.tsx`** — deliberately reusable beyond orders: reads/writes only the `page` param via its own `usePathname()`, no dependency on `useOrderFiltersUrl`. Renders "Page X of Y" + Prev/Next rather than numbered page buttons — with up to 20 pages (200 orders ÷ 10/page), numbered buttons would need ellipsis handling for little real benefit over knowing where you are and moving one step. Returns `null` when there's only one page, so a filtered-down result set doesn't show dead pagination controls.
- **`components/shared/empty-state.tsx`** — generic on purpose (`components/shared/`, not `components/orders/`): takes a plain `onAction` callback rather than reaching into any filter hook itself, so `OrdersTable`'s empty state isn't the only thing this component can ever be used for.
- **`components/orders/order-row.tsx`** — `OrderRow`, wrapped in `React.memo` per the step. Reuses the ledger's exact date/status-stamp/amount conventions from Phase 2b (`ORDER_STATUS_STYLES`, `NEGATIVE_ORDER_STATUSES`, red-ink parenthesised negatives) — that component's own comments already promised this would carry into the Phase 3 table. No callback prop yet (row → `/orders/[id]` linking is Phase 4's step 34), so no `useCallback` was added speculatively; the memo comment says explicitly what it's waiting to pair with.
- **`components/orders/orders-table.tsx`** — `OrdersTable`, rendering `OrderRow`s or `EmptyState` when `orders.length === 0`. Order id and customer get **separate** columns here, unlike the dashboard ledger's combined "particulars" column — a deliberate difference, not an inconsistency: this is the primary data-browsing surface, not a compact widget, so a dedicated customer column has real scanning value it didn't have on the dashboard.
- **`app/orders/loading.tsx` / `error.tsx`** — mirror the dashboard's route-level files exactly (same reasoning: this route has no per-section boundaries to fall back to first, since it's one Server Component with one data dependency). `FiltersBarSkeleton`/`OrdersTableSkeleton` exported alongside their real components, same convention as every other skeleton in this codebase, even though — unlike the dashboard — nothing here uses them as a Suspense fallback; keeping the pattern uniform mattered more than the small file-organization "cost" of an unused-elsewhere export.
- **Two consolidations made mid-step, not after:** `ORDER_STATUSES` (all 5 statuses as an array) was duplicated locally in `lib/api/analytics.ts` and the old step-22 shell — a third real need (validating the filter's `status` param, and populating the `Select`'s options) crossed the point where that stopped making sense, so it's now one export from `lib/types/order.ts`, imported everywhere. Same for `formatSignedCurrency` (parenthesised negative amounts) — was a private function in `recent-orders-list.tsx`; `OrderRow` needing the identical logic was the second real call site, so it moved to `lib/format.ts`.

**Two real bugs found by actually running the server, not by `tsc`/`lint`/`build`:**

1. **`react-hooks/set-state-in-effect` on the search-input resync.** The first version of `FiltersBar` used a `useEffect(() => setSearchText(filters.q), [filters.q])` to resync the input when the URL's `q` changed for a reason other than the component's own debounced push (Clear filters, browser back/forward). ESLint's `set-state-in-effect` rule caught this as the same class of anti-pattern that hit `hooks/use-mounted.ts` earlier in this project — calling a React state setter synchronously inside an effect body, rather than deriving/adjusting it during render. Fixed with React's own documented pattern for "reset state when a prop changes": a `prevUrlSearch` value compared and updated **during render**, not in an effect. The debounced-push effect (`useEffect(() => setFilter(...), [debouncedSearch])`) stayed as an effect correctly — `router.replace` is a genuine external-system side effect, which effects exist for; only the plain React `setState` call was the actual anti-pattern.
2. **`SelectValue` rendered the raw value, not the label.** After wiring the status filter, curl'd the page and found the trigger showing literal `all`/`pending` instead of "All statuses"/"Pending". Checked Base UI's `Select.Value` type directly rather than guessing: it renders the raw value by default and needs an explicit `children` function (`(value) => label`) to map it — its own documented API, just not the assumption I'd made. Fixed by passing that mapping function, using the same `STATUS_OPTIONS` array the dropdown's own items are built from, so the trigger and the options can't drift out of sync with each other.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning), and `build` all clean; `/orders` still `ƒ` Dynamic. Production server run against six real query-string combinations, every count independently recomputed against `mock-orders.json` directly (not trusted from the UI):
- `/orders` → "Page 1 of 20" (200 ÷ 10)
- `?status=pending` → "Page 1 of 2" (19 pending — matches the count independently verified back in Phase 2c), 10 real `Pending` rows on the page plus the filter dropdown's own "Pending" option (11 total matches, correctly accounted for, not a duplicate row)
- `?q=Imran` → "Page 1 of 2" (20 matches, independently recomputed against `id`/`customerName`)
- `?from=2026-09-01&to=2026-09-15` → "Page 1 of 4" (31 matches, independently recomputed)
- `?page=2` → "Page 2 of 20"
- `?q=zzzznomatch` → the real `EmptyState` (title, description, "Clear filters" button all present) and **zero** pagination controls rendered (confirms the `totalPages <= 1` guard)

Also confirmed after the `SelectValue` fix: default trigger reads "All statuses", `?status=pending` reads "Pending" — both via the actual rendered `data-slot="select-value"` span, not the CSS class string that looks similar and caused a wasted first check.

**Commands run:**
```
echo "n" | npx shadcn@latest add select input -y   # both added clean, no overwrite conflicts

# select.tsx: same ring-1 ring-foreground/10 + shadow-md drift as
# card.tsx/chart.tsx/dialog.tsx before it — fixed at the source (4th time
# this exact pattern has shown up in a shadcn primitive)

find node_modules/@base-ui/react/select -iname "*.d.ts" -path "*root*"
# → confirmed value/onValueChange are plain strings for single-select
#   (multiple defaults to false), unlike ToggleGroup's array quirk

npx tsc --noEmit
# → error: Select's onValueChange value can be `string | null`
# → fixed: setFilter("status", value ?? "all")

npm run lint
# → error: react-hooks/set-state-in-effect on the resync effect
# → fixed: adjust state during render instead (see bug #1 above)
npx tsc --noEmit && npm run lint   # both clean

rm -rf .next && npm run build   # succeeded, /orders still ƒ Dynamic

npm run start > /tmp/orders3-server.log 2>&1 &
curl -s http://localhost:3000/orders -o /tmp/o3-default.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?status=pending" -o /tmp/o3-pending.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?q=Imran" -o /tmp/o3-search.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?from=2026-09-01&to=2026-09-15" -o /tmp/o3-daterange.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?q=zzzznomatch" -o /tmp/o3-empty.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?page=2" -o /tmp/o3-page2.html -w "HTTP %{http_code}\n"
# → all HTTP 200, log clean, no errors

node -e "... independently recompute pending/Imran/date-range counts directly from mock-orders.json ..."
# → pending: 19, Imran matches: 20, date range: 31 — all three matched
#   the rendered "Page X of Y" text exactly

python3 -c "... extract 'Page X of Y' text (split across RSC text nodes) per response ..."
grep -o "No orders match your filters" /tmp/o3-empty.html   # present
grep -o "Clear filters" /tmp/o3-empty.html                  # present
grep -c "Page.\{0,10\}of" /tmp/o3-empty.html                # → 0, Pagination correctly hidden

# SelectValue bug found + fixed, then re-verified on a fresh rebuild:
python3 -c "... locate the real data-slot=\"select-value\" span (not the CSS class string) ..."
# → default: "All statuses", ?status=pending: "Pending" — both correct

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/o3*.html /tmp/orders3*.log
```

**How this moves the build forward:** Phase 3 is complete — the orders page has real filtering, real pagination, and real loading/error/empty states, all verified against actual query strings and independently recomputed counts, not just "it builds." Phase 4 (order details) is next: `OrderRow`'s `React.memo` is already sitting ready for the `useCallback`-paired click handler that step 34 will add, and the ledger column conventions it reuses will carry forward again into the order details view.

## Post-Phase-3 fix — "the filter feels clunky and slow" + show the full date

**The report.** The user asked for the table to show the date (a date-range filter already existed, but the date column read as easy to miss) and separately flagged filter interactions as "clunky and slow."

**The real cause of "clunky," found by re-reading the page's own structure, not by guessing at CSS.** `app/orders/page.tsx` was a single async Server Component: `FiltersBar` sat inside the same component that awaited `getOrders()`. With no Suspense boundary narrower than the whole route, `app/orders/loading.tsx`'s fallback was the only fallback available for *every* client-side searchParams navigation — including a debounced search push, a status pick, or a pagination click. That fallback replaces the entire page tree. So every filter interaction unmounted the real, focused input the user was typing into, flashed a skeleton over the whole page, then remounted a fresh `FiltersBar` once the fetch resolved. That's a structural bug, not a tuning issue — no debounce delay or loading-spinner tweak would have fixed it, since the actual controls were being torn down and rebuilt underneath the user's cursor.

**The fix — narrow the Suspense boundary to the actual data dependency.** New `components/orders/orders-results.tsx` (`OrdersResults` + `OrdersResultsSkeleton`) holds the `getOrders()` fetch, `OrdersTable`, and `Pagination` — the three things that actually depend on the fetched data. `app/orders/page.tsx` is now a thin shell: `FiltersBar` renders outside the `<Suspense>` boundary and stays permanently mounted; only `OrdersResults` suspends. This is the same "sections follow data dependencies" principle already used for the dashboard and Phase 2c — the earlier "single Server Component, no internal Suspense" decision for this page wasn't wrong about *how many* data dependencies exist (still just one, the order list), it was wrong about *what counts as depending on it* — `FiltersBar` doesn't, and got caught in the blast radius anyway because nothing separated it. `error.tsx` needed no change: an error thrown inside `OrdersResults` still propagates to the nearest route-level error boundary regardless of the Suspense boundary sitting between them. `loading.tsx` also needed no change — it still correctly covers the *first* navigation into `/orders`, before `FiltersBar` exists to protect.

**A second, real factor named but deliberately not touched.** `lib/api/client.ts`'s `mockFetch` now uses a random 1–2000ms delay (an external change from earlier in this session, not something built here) instead of a fixed 500ms. Even with the remount bug fixed, this means a filter interaction can still take up to two real seconds before the table updates. Flagged clearly to the user rather than silently changed — it's an external edit, and the standing rule on those is to note them, not revert them without asking.

**The date fix.** `OrderRow`'s date cell switched from `formatShortDate` ("Sep 15", no year — the dashboard ledger's convention, built for a "recent 8" snippet where the year is never in question) to `formatDate` ("Sep 15, 2026"), and dropped `text-muted-foreground` — now that the table has a real date-range filter tied to it, the date is something users scan and filter by, not just secondary metadata the way it was treated as a compact dashboard widget. `OrdersTableSkeleton`'s date placeholder width bumped from `w-12` to `w-24` to match, so the skeleton doesn't visibly narrow-then-widen once real content streams in.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning), and `build` all clean; `/orders` still `ƒ` Dynamic. Production server run confirmed: full dates with year render on all 10 visible rows (`Sep 12, 2026`, `Sep 13, 2026`, `Sep 15, 2026`, …), `FiltersBar` still renders correctly, and a filtered request (`?status=pending`) still resolves correctly through the new nested-Suspense path ("Page 1 of 2", matching the already-verified 19-pending count). **One honest limitation, same category as before:** `curl` performs a fresh full page load every time, so it cannot observe a client-side navigation's remount behavior directly — I can confirm the *structure* is now correct (the Suspense boundary is scoped to exactly the data-dependent part, which is what drives the fix), but not eyeball the before/after "does the input visibly flicker" behavior itself without a real browser.

**Commands run:**
```
npx tsc --noEmit && npm run lint   # clean (same 1 pre-existing warning)
rm -rf .next && npm run build      # succeeded, /orders still ƒ Dynamic

npm run start > /tmp/orders-fix.log 2>&1 &
curl -s http://localhost:3000/orders -o /tmp/orders-fix.html -w "HTTP %{http_code}\n"   # → 200
grep -oE "Sep [0-9]+, 2026" /tmp/orders-fix.html | sort -u   # → Sep 12/13/15, 2026 present
python3 -c "... count full-date matches ..."                 # → 10, matches 10 visible rows
grep -o "Search order id or customer" /tmp/orders-fix.html   # → FiltersBar still renders

curl -s "http://localhost:3000/orders?status=pending" -o /tmp/orders-fix-pending.html -w "HTTP %{http_code}\n"
# → 200, "Page 1 of 2" (still correct), FiltersBar still present

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/orders-fix*.html /tmp/orders-fix.log
```

**How this moves the build forward:** the orders page now has the correct Suspense granularity — interactive, data-independent UI stays mounted; only what genuinely depends on the fetch suspends. Worth remembering for Phase 4 and beyond: "how many data dependencies does this page have" isn't the only question — "what UI must never be part of the blast radius when that dependency refetches" is a second, separate question, and this page's first answer missed it.

## Orders table — order id first column, sticky on horizontal scroll

**What was done.** Reordered `OrdersTable`'s columns from Date/Order/Customer/Status/Amount to **Order/Date/Customer/Status/Amount**, and made the Order id column `sticky left-0` so it stays visible while the table scrolls horizontally on narrow viewports (`overflow-x-auto` was already there from Phase 3; nothing was sticky within it before). The status-color stamp (the 3px `border-l`) moved with the id column, since the ledger convention was always "the leftmost edge carries the stamp" — now that Order id is leftmost, the stamp follows it, which also means the status color itself stays visible through a horizontal scroll, not just the id. No breakpoint gating: sticky positioning is a no-op wherever the container isn't actually scrolling (desktop, where the table already fits), so applying it unconditionally is simpler than a responsive on/off switch and has no visible cost where it doesn't apply.

**A real bug caught before it shipped, not after — the same tailwind-merge conflict as the Phase 2b ledger bug, recognized on sight this time.** The sticky column needs an opaque background (`bg-card`, so scrolling content behind it doesn't show through) and a right-edge border marking where the frozen column ends. The first draft used the all-sides `border-border` utility for that right edge, sitting in the same class string as the status's directional `border-l-{color}` override. That's exactly the conflict already found and fixed once in the dashboard ledger (Phase 2b, step 18) — `tailwind-merge` treats an all-sides `border-{color}` utility as conflicting with a directional one and drops it *entirely*, not just the shared side, leaving the other sides with no real color at all. Caught this from the standing rule already written into `step.md` after the first occurrence, rather than re-discovering it from a rendered bug report — fixed with `border-r-border` (side-specific) instead of `border-border`, verified directly in the compiled CSS that both `border-right-color: var(--border)` and the status's `border-left-color` survive together in the same class list.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning), and `build` all clean. Production server run: header order confirmed `["Order", "Date", "Customer", "Status", "Amount"]`; `sticky left-0 z-10` present on both the header cell and every row's leading cell; `.border-r-border{border-right-color:var(--border)}` and all three `.border-l-chart-N{border-left-color:...}` rules confirmed compiled and both present together on real rows (not one dropping the other); order ids and full dates (`Sep 12, 2026`, etc.) still rendering correctly after the reorder — the column shuffle didn't disturb the underlying data. Same disclosed limitation as always: `curl` can confirm the CSS and markup are structurally correct, not that the sticky behavior visually holds together while actually scrolling — that needs a real viewport.

**Commands run:**
```
npx tsc --noEmit && npm run lint   # clean (same 1 pre-existing warning)
rm -rf .next && npm run build      # succeeded

npm run start > /tmp/orders-sticky.log 2>&1 &
curl -s http://localhost:3000/orders -o /tmp/orders-sticky.html -w "HTTP %{http_code}\n"   # → 200

python3 -c "... extract <thead> header text in document order ..."
# → ['Order', 'Date', 'Customer', 'Status', 'Amount']
grep -o 'sticky left-0 z-10[^"]*' /tmp/orders-sticky.html | head -3
# → present on the header th and multiple row tds, each with its own
#   border-l-chart-N status color alongside border-r-border — both survive

grep -o '\.border-r-border{[^}]*}' .next/static/chunks/*.css
# → .border-r-border{border-right-color:var(--border)}
grep -o '\.border-l-chart-[0-9]{[^}]*}' .next/static/chunks/*.css | sort -u
# → chart-2/3/4 all present, each with their own border-left-color

grep -oE "ord_[0-9]{4}" /tmp/orders-sticky.html | sort -u | head -5   # ids intact
grep -oE "Sep [0-9]+, 2026" /tmp/orders-sticky.html | sort -u        # dates intact

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/orders-sticky.html /tmp/orders-sticky.log
```

**How this moves the build forward:** the `border-{color}` vs `border-{side}-{color}` conflict is now a written standing rule (`step.md`), not just a comment living in one file that has to be remembered — this is the second time it's come up and the first time it was caught before shipping rather than after. Worth checking for on sight in any future row/cell styling that combines a directional accent with any other bordered edge.

## Shared sticky ledger cell — fix the accent, extend to the dashboard's table too

**The report.** Two things: the sticky column's status-color bar wasn't reliably visible across different scroll positions (screenshots showed it rendering fully in one and barely at all in another), and a request to apply the same sticky-leading-column treatment to `RecentOrdersList` on the dashboard — as one shared component, not two separate implementations.

**The real cause of the flaky color bar — a genuine, documented browser behavior, not a missing class.** `position: sticky` cells inside a `border-collapse: collapse` table have a real quirk (worst in Chrome): a `border` on the sticky cell doesn't reliably repaint at its current scrolled position, because collapsed borders are technically painted by the table as a whole, not the individual cell, and that painting doesn't always keep up with a cell being repositioned by `sticky`. This wasn't guessable from the code alone — the two screenshots showing inconsistent results *between scroll positions on the same table* were the actual signal pointing at a scroll-position-dependent rendering bug rather than a plain styling mistake.

**The fix — `box-shadow` instead of `border` for the accent.** A `box-shadow` isn't part of the CSS border model at all and isn't affected by `border-collapse`, so it stays correctly attached to the sticky cell regardless of scroll position. New `components/orders/sticky-ledger-cell.tsx` (`StickyLedgerCell`) renders the accent as one combined declaration — `inset 3px 0 0 0 {status color}, inset -1px 0 0 0 var(--border)` — the status stripe and the frozen-column's right-edge separator in a single `box-shadow`, using the existing `ORDER_STATUS_COLOR_VAR` map (already built for the status donut's `Cell fill` in Phase 2c, so this is its second real use, not a new color mapping).

**The shared component, used by both tables with real per-use differences.** `StickyLedgerCell` takes `as` (`"td" | "th"`), an optional `status` (headers have none), and `className` for whatever typography each table's leading column needs — it owns only the truly identical mechanics (sticky positioning, z-index, opaque background, the box-shadow accent), not an attempt to unify the two tables' entire structure. `OrderRow` (orders page) uses it for the order-id cell; `RecentOrdersList` (dashboard) uses it for the date cell — different content, same component, exactly the "conditional for each use case" the user asked for. The two tables' actual column *sets* stay different on purpose (order id/customer as separate columns on the primary browsing surface vs. a combined "particulars" column on the compact dashboard widget) — that was a deliberate Phase 3 decision with its own stated reasoning, and unifying the accent mechanic doesn't require unifying that too.

**A real cleanup that fell out of this.** `ORDER_STATUS_STYLES`'s `border` field (`"border-l-chart-3"` etc.) became fully dead once both of its only two call sites switched to the shared component's box-shadow — removed from the type and the object rather than left as unused dead code.

**Verification.** `tsc`, `lint` (same one pre-existing unrelated warning), and `build` all clean. Production server run against both pages: confirmed the combined `box-shadow` (`inset 3px 0 0 0 var(--chart-N), inset -1px 0 0 0 var(--border)`) renders correctly on both the dashboard ledger and the orders table, with every distinct status color present on each (`--chart-2`, `--chart-3` on the orders page only since a "pending" order wasn't in the dashboard's 8-row sample, `--chart-4`, `--destructive`) — confirming `ORDER_STATUS_COLOR_VAR`'s mapping carried over correctly with no color drift from the old Tailwind-class version. Confirmed the sticky header cell's box-shadow (`inset -1px 0 0 0 var(--border)`, no status stripe since headers aren't row-specific) on both tables too. Data untouched: revenue figure and order ids still correct after the refactor.

**Commands run:**
```
npx tsc --noEmit && npm run lint   # clean (same 1 pre-existing warning)
rm -rf .next && npm run build      # succeeded

npm run start > /tmp/sticky-shared.log 2>&1 &
curl -s http://localhost:3000/ -o /tmp/sticky-dashboard.html -w "HTTP %{http_code}\n"       # → 200
curl -s http://localhost:3000/orders -o /tmp/sticky-orders.html -w "HTTP %{http_code}\n"    # → 200

python3 -c "... locate sticky left-0 header cells in both responses ..."
# → both show style="box-shadow:inset -1px 0 0 0 var(--border)" on the header

python3 -c "... locate body-row boxShadow declarations ..."
# → both show "inset 3px 0 0 0 var(--chart-N), inset -1px 0 0 0 var(--border)"

grep -oE "inset 3px 0 0 0 var\(--[a-z0-9-]+\)" /tmp/sticky-dashboard.html | sort -u
  # → chart-2, chart-4, destructive (this 8-row sample had no pending order)
grep -oE "inset 3px 0 0 0 var\(--[a-z0-9-]+\)" /tmp/sticky-orders.html | sort -u
  # → chart-2, chart-3, chart-4, destructive — all four non-primary statuses present

grep -o "৳45,59,700.00" /tmp/sticky-dashboard.html            # revenue figure intact
grep -oE "ord_[0-9]{4}" /tmp/sticky-orders.html | sort -u     # order ids intact

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/sticky-*.html /tmp/sticky-shared.log
```

**How this moves the build forward:** the sticky+border-collapse quirk (and its box-shadow workaround) is a real CSS lesson worth remembering for any future table in this app, not just these two — and the shared `StickyLedgerCell` means the next ledger-style table (if one comes up) has a component to reach for instead of a third copy of the same mechanics.

## Removed the "Net · N shown" footer from the dashboard's recent-orders table

Small, requested removal: the double-ruled `<tfoot>` total row is gone from `RecentOrdersList`. Removed alongside it: the `netTotal()` helper and the `net`/`netNegative` variables that only existed to feed that row, and the now-unused `Order` type import that only `netTotal`'s signature needed — rather than leaving dead code behind. `NEGATIVE_ORDER_STATUSES` and `formatSignedCurrency` both stay imported; per-row red-ink amounts (cancelled/refunded) are unaffected, only the summary row is gone. `RecentOrdersListSkeleton` already had no footer placeholder, so no skeleton change was needed to keep the two in sync.

**Verification.** `tsc`/`lint`/`build` all clean (same one pre-existing unrelated warning). Production server confirmed `Net ·` and `<tfoot` both return zero matches in the rendered page, while real order ids and the dashboard's revenue figure are still present and correct — the removal didn't disturb anything else in the table.

## Orders table: rows-per-page control + capped, internally-scrolling table

**What was asked.** A 10/20/50 rows-per-page dropdown for the orders table, and a height cap so a large page size doesn't grow the page indefinitely — the table should scroll within itself instead.

**Page size, wired the same way every other orders filter is — through the URL.** `ORDER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const` in `lib/types/order.ts` is the one source of truth for the offered choices, used both to populate the `<Select>` and to validate an incoming `pageSize` URL param server-side — the same pattern `ORDER_STATUSES` already established, so a hand-edited URL can't request some arbitrary page size the UI never offered (falls back to the default 10, verified: `?pageSize=999` produced identical output to no param at all). Picking a new size resets `page` to 1, for the same reason changing any other filter does — staying on page 5 of a 10-per-page view after switching to 50-per-page could land past the end of the new, shorter page count.

**Where the control lives, and why it didn't need the same Suspense-boundary treatment as the search box.** The size selector was added to the existing `Pagination` component rather than pulled out into its own always-mounted piece next to `FiltersBar`. That's a real, deliberate call, not an oversight: the "clunky" bug fixed a session ago was specifically about a *focused, actively-typed-into* input losing its characters and cursor mid-keystroke when the whole results area suspended. A `<Select>` closes the instant an option is picked, and Prev/Next are single clicks — neither has an "in-progress" state to lose the way a debounced search box does, so `Pagination` (rows selector included) staying inside `OrdersResults`'s Suspense boundary is an acceptable, understood tradeoff rather than a repeat of the earlier mistake. `Pagination` itself stays self-contained and genuinely reusable — `pageSizeOptions` is an optional prop, so a future caller that only needs page navigation (no size choice) isn't forced to opt out of anything.

**The scroll cap needed a real design decision: freeze the header row too, not just cap the height.** A plain `max-h-[65vh] overflow-auto` alone would let up to 50 rows scroll past the column headers, losing track of which column is which. `StickyLedgerCell` (built two sessions ago for the horizontal-scroll leading column) was redesigned around a `sticky: "left" | "top" | "corner"` prop instead of always assuming "left": `"top"` freezes a header cell vertically, `"left"` freezes the leading column horizontally (its original job, now explicit rather than implicit), and `"corner"` — the one cell that's both the leading column's header *and* row 1 — does both at once with a higher z-index (20 vs. 10) so it stays above whichever of the other two sticky layers scrolls underneath it. The `sticky` prop is required, not defaulted: three meaningfully different roles with no sensible universal default, so every call site has to say which one it actually needs. `RecentOrdersList` (dashboard) only needed its existing usages updated to `sticky="left"` to keep compiling — its 8-row table never needed the header freeze or height cap, so that table's behavior is otherwise completely unchanged.

**The header/corner box-shadow follows the same rule discovered for the leading column** (a `border` on a `position: sticky` cell inside a `border-collapse` table doesn't reliably repaint at its scrolled position) — extended to the vertical axis: `sticky="top"` cells get `inset 0 -1px 0 0 var(--border)` (a bottom separator, box-shadow not border, same reasoning), and the corner combines both insets in one declaration. Verified directly in the rendered output, not assumed: the corner header's box-shadow is `inset -1px 0 0 0 var(--border), inset 0 -1px 0 0 var(--border)` (both edges), the other four headers show only the bottom inset, and a body row's leading cell still shows its original `inset 3px 0 0 0 var(--chart-N), inset -1px 0 0 0 var(--border)` unchanged.

**The skeleton got more accurate, not just consistent.** `OrdersTableSkeleton` now takes a `rowCount` prop instead of a hardcoded 8 — the requested page size is already known from the URL before the fetch resolves (`parseFilters` runs synchronously), so `app/orders/page.tsx` threads it straight into the `Suspense` fallback. A 50-row real result no longer jumps in height against an 8-row skeleton that preceded it.

**Verification — every claim checked against real requests, not assumed from the code.** `tsc`, `lint` (same one pre-existing unrelated warning), `build` all clean. Production server run against six real query-string combinations:
- Default, `?pageSize=20`, `?pageSize=50` → 10/20/50 unique order ids actually present on each page (counted, not inferred from the param), with "Page 1 of 20/10/4" matching `200 ÷ pageSize` exactly
- `?pageSize=999` (invalid) → identical output to the default (10 rows, "Page 1 of 20") — the validation fallback confirmed, not just present in the code
- `?status=pending&pageSize=50` (a filtered result smaller than the page size) → the rows-per-page selector still renders and correctly shows "50," while "Page X of Y"/Prev/Next correctly don't render at all (single page) — confirms the control doesn't disappear just because the current result happens to be small
- The Select's displayed value matched the URL in every case (`10`/`20`/`50`/`50`) — checked against the actual second `data-slot="select-value"` element in each response (the first is the status filter's), not assumed from position
- `max-h-[65vh] overflow-auto` present on the scroll container; a body row's sticky-left box-shadow unchanged and still correct on the 50-row page

**One disclosed limitation, same category as before.** `curl` always returns the fully-streamed response (Next's swap script replaces the Suspense fallback before the connection closes), so the *skeleton's* row count during an actual in-flight request can't be directly observed this way — confirmed the logic is correct (the prop threading, the type check) but not eyeballed against a real loading frame. Same gap disclosed for every other skeleton/streaming claim this session.

**Commands run:**
```
npx tsc --noEmit
# → error: Select's onValueChange value can be string | null (same pattern
#   as the earlier status Select fix)
# → fixed: onValueChange={(value) => value && changePageSize(value)}
npx tsc --noEmit && npm run lint   # both clean (1 pre-existing warning)
rm -rf .next && npm run build      # succeeded

npm run start > /tmp/orders-pgsize.log 2>&1 &
curl -s http://localhost:3000/orders -o /tmp/o-default.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?pageSize=20" -o /tmp/o-20.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?pageSize=50" -o /tmp/o-50.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?pageSize=999" -o /tmp/o-invalid.html -w "HTTP %{http_code}\n"
curl -s "http://localhost:3000/orders?status=pending&pageSize=50" -o /tmp/o-edge.html -w "HTTP %{http_code}\n"
# → all HTTP 200, log clean

python3 -c "... count unique ord_#### ids + extract 'Page X of Y' per response ..."
# → 10/20/50/10 rows respectively; "Page 1 of 20/10/4/20" — all exact

python3 -c "... locate the SECOND select-value element (first is status) ..."
# → 10 / 20 / 50 / 50 — matches each request's pageSize exactly

grep -o "max-h-\[65vh\] overflow-auto" /tmp/o-50.html            # present
python3 -c "... extract all box-shadow declarations inside <thead> ..."
# → corner: both insets; other 4 headers: bottom inset only
python3 -c "... extract first tbody box-shadow ..."
# → inset 3px 0 0 0 var(--chart-2), inset -1px 0 0 0 var(--border) — unchanged

pkill -9 -f "next-server"
rm -rf .next; rm -f /tmp/o-*.html /tmp/orders-pgsize.log
```

**How this moves the build forward:** the sticky-cell abstraction now correctly models "which edge(s) does this cell freeze against" as its own explicit concept rather than assuming "leading column" was the only kind of sticky cell that would ever exist — worth remembering if a future table needs the same pattern. The rows-per-page control and the Suspense-boundary tradeoff reasoning (discrete click vs. continuous typing) are both documented here and in the code, not just shipped silently.

## Phase 4 — Order Details (steps 31–34, built in one pass)

**What was asked.** The whole phase in one go: a dedicated `/orders/[id]` route (already locked into `plan.md` as a route, not a modal), its loading state, a presentational `OrderDetailsView` (customer info, line items, status, timeline), and a link from each orders-table row into it.

**What the route actually fetches, and why it's three calls, not one.** `Order` (`lib/types/order.ts`) only ever carried `customerId`/`customerName` — no email, join date, or lifetime spend, all of which "customer info" needs. So `app/orders/[id]/page.tsx` fetches the order first (`getOrderById`, already existed from Phase 1 but never called from any route until now), then — once the order confirms the customer id is real — fetches the customer (`getCustomerById`, new) and that order's activity log entries (`getActivityForOrder`, new) **in parallel** via `Promise.all`, since neither depends on the other, only on the order that already resolved. Both new functions are general-purpose lookups with nullable/empty return shapes (`Customer | null`, `Activity[]`), not hardcoded to "the id will definitely exist" — checked directly against the generated JSON that every `order.customerId` does resolve to a real customer (0 orphans across all 200 orders) and every line-item's `quantity × unitPrice` sums to exactly `order.total` (0 mismatches), so nothing here is invented to cover a gap that doesn't actually exist in the data — but the code still narrows the nullable customer explicitly (`if (!customer) notFound()`) rather than asserting past a type that says it can be null.

**The timeline is built from what the mock data actually logged, not synthesized to look complete.** The generator only ever wrote **29** activity entries total, covering **25** of the 200 orders (max 2 each: `order_created` + one `order_status_changed`/`refund_issued`). Building a timeline entirely from `getActivityForOrder()` would leave 175 of 200 orders with an empty, broken-looking feature. Instead, the timeline always opens with **"Order placed"** at `order.createdAt` — a real fact every single order carries, not fabricated — followed by whatever real, timestamped activity entries exist for that order, sorted chronologically (oldest first, the reverse of the dashboard feed's newest-first convention, because a timeline reads top-to-bottom as "what happened, in order"). For an order with no further logged event, that's a valid one-entry timeline, not a bug: inventing a matching "marked as completed" event with a made-up timestamp for the other 175 orders would be exactly the fabricated-data problem this project has avoided everywhere else (the AOV denominator, the deltas that don't exist for `activeCustomers`/`conversionRate`). Verified against three real orders spanning all three shapes: `ord_0023` (completed, zero activity → one-entry timeline), `ord_0071` (completed, zero activity, 3 line items), `ord_0127` (refunded, one real `refund_issued` entry → two-entry timeline, correctly ordered after "Order placed" since its timestamp is later).

**Linking each row: a real `<Link>`, not a hand-rolled clickable `<div>`, plus a mouse-friendly whole-row click.** A `<tr>` can't itself be an `<a>` around `<td>`s — that's invalid table structure — so `OrderRow` (`components/orders/order-row.tsx`) uses the two-part pattern real tables actually use: the order id itself is wrapped in a genuine `next/link` `<Link>` (keyboard-focusable, works with middle-click/open-in-new-tab, has a real `href` a screen reader announces), and the whole `<tr>` also gets an `onClick` (`router.push`) plus `cursor-pointer`/`hover:bg-muted/40` so clicking anywhere in the row navigates, the way Linear/Stripe-style tables behave. The click handler guards against the redundant double-navigation this creates (`if (event.target.closest("a")) return`) when the click actually landed on the Link, since the Link's own handler already navigates. `OrderRow` picked up `"use client"` for this (it needed `useRouter`) — it was already always bundled as client code via `OrdersTable`'s own `"use client"` boundary, but the file didn't say so itself before this; now it does, matching every other hook-using file in the project. The sticky leading cell's `bg-card` (needed so scrolled-under content doesn't show through it) meant the row's hover background wouldn't reach that column on its own — fixed by adding `group`/`group-hover:bg-muted/40` so the sticky column visually participates in the same hover state as the rest of the row, since that's exactly the column that stays visible during a horizontal scroll on mobile.

**Real, documented platform limitation found and left honestly in place: `notFound()` doesn't reliably return an HTTP 404.** Checked directly, not assumed: `curl -D -` against `/orders/ord_9999` (an id that doesn't exist) returns `200 OK` with the not-found UI correctly rendered in the body — confirmed both with and without `app/orders/[id]/loading.tsx` present (temporarily removed it, rebuilt, re-tested, then restored it), ruling out "the loading.tsx Suspense wrapper is doing this" as the cause. It's simply how the App Router's streaming model works by default, per Next's own bundled docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`): "Next.js will return a `200` HTTP status code for streamed responses, and `404` for non-streamed responses" — and a real 404 status would require checking for existence *before* any byte streams, via `proxy` (an experimental Cache Components pattern), which is out of scope for a route that's supposed to stay a plain Server Component fetch. `notFound()` is still correct to use here: it renders the right UI and injects a `noindex` meta tag, which is what actually matters for a client-rendered dashboard route. Documented as a standing lesson in `step.md` rather than silently shipped past, since it's exactly the kind of platform nuance AGENTS.md's "this Next.js has breaking changes, read the docs" warning is there for.

**Verification — real production server, real ids, values checked against independent Node computation, not the UI's own math.**
- `tsc --noEmit` (via `next build`, since `PageProps<"/orders/[id]">` doesn't exist until a build/dev run generates it) and `next lint` both clean (same one pre-existing, already-flagged `client.ts` warning)
- `next build`: `/orders/[id]` registers as a dynamic (`ƒ`) route alongside `/` and `/orders`
- Independently computed in Node against the raw JSON before checking the rendered page: confirmed 0 of 200 orders have an orphaned `customerId`, 0 of 200 have an `items[]` sum that doesn't exactly equal `order.total`, and picked three real orders spanning every shape worth checking — multi-item (`ord_0071`, 3 distinct products), a duplicate-product-name order (`ord_0127`, two separate "Wireless Mouse" line items at different quantities — confirmed the row `key` including `index` doesn't collide), and a zero-activity order (`ord_0023`)
- Production server (`npm run start`) + `curl`, RSC-comment-stripped and checked for real formatted values, not just structural markup: order id, customer name, email, lifetime spend (`৳1,53,600.00`, lakh-grouped), lifetime order count, Active/Inactive label, every line item's product name/qty/unit price/subtotal, the order total, and the placed date — all matched the independently computed figures exactly, for all three orders
- Confirmed the refund's negative total renders in the same `text-destructive` class as the parenthesized amount (`(৳37,200.00)`) — checked the class and the value are on the *same* element, not just both present somewhere in the page
- Confirmed the orders-table rows now render real `href="/orders/ord_####"` anchors (grepped `/orders`'s own rendered output), and that the sticky leading cell's existing box-shadow status stripe + hover classes still coexist correctly with the new `<Link>` inside it

**One disclosed limitation, same category as every other `curl`-based check this project has done.** `curl` can't observe hover states, hydration-time behavior, or a genuinely in-flight loading frame — the row's mouse-hover background and the loading skeleton's actual appearance mid-fetch are confirmed correct by reading the code/class logic, not by eyeballing a real browser paint.

**Commands run:**
```
npx tsc --noEmit          # fails: PageProps<"/orders/[id]"> doesn't exist
                           # yet — expected, same as Phase 3's OrdersPage;
                           # types generate on a build/dev run
npm run build              # → Compiled successfully, TypeScript clean,
                           # /orders/[id] listed as a dynamic (ƒ) route
npm run lint                # clean (1 pre-existing unrelated warning)

node -e '... independently confirm 0/200 orphaned customerId,
         0/200 items-sum ≠ total mismatches, pick sample order ids ...'

mv "app/orders/[id]/loading.tsx" /tmp/loading-backup.tsx
npm run build                                 # still builds clean
npm run start &                                # background
curl -s -D - http://localhost:3000/orders/ord_9999 | head -2
# → HTTP/1.1 200 OK (not-found UI in body) — same with loading.tsx absent
mv /tmp/loading-backup.tsx "app/orders/[id]/loading.tsx"   # restored
npm run build && npm run start &               # rebuilt with it back

curl -s http://localhost:3000/orders/ord_0071 -o /tmp/ord_0071.html -w "HTTP:%{http_code}\n"
curl -s http://localhost:3000/orders/ord_0127 -o /tmp/ord_0127.html -w "HTTP:%{http_code}\n"
curl -s http://localhost:3000/orders/ord_0023 -o /tmp/ord_0023.html -w "HTTP:%{http_code}\n"
# → all HTTP 200

python3 -c "... strip RSC <!-- --> markers, check every independently
             computed value is actually present in each response ..."
# → all OK: order id, customer name/email/spend/orders/active-label,
#   every line item, order total, placed date, timeline label

grep -o '.\{80\}text-destructive.\{80\}' /tmp/ord_0127.html | grep "37,200"
# → confirms class + value on the same <td>

curl -s http://localhost:3000/orders -o /tmp/orders_list.html
grep -o 'href="/orders/ord_[0-9]*"' /tmp/orders_list.html | sort -u
# → real per-row hrefs present
python3 -c "... extract first sticky-left <td>, confirm the <a> and the
             existing box-shadow/hover classes both survived ..."

pkill -9 -f "next-server"
rm -f /tmp/ord_*.html /tmp/orders_list.html /tmp/*.log
```

**How this moves the build forward:** Phase 4 — the last data-driven page in `plan.md`'s scope — is complete; every route in the app (`/`, `/orders`, `/orders/[id]`) now has real data, loading, error, and (where relevant) empty states. The `notFound()`/streaming-status finding and the customer-lookup/timeline reasoning are both written into `step.md`'s standing-lessons list so they're available before Phase 5 (testing) rather than rediscovered. One deliberate scope boundary, not acted on unprompted: the dashboard's own `RecentOrdersList` rows weren't linked to `/orders/[id]` the way the orders-page table's `OrderRow` was — step 34 named `OrderRow` specifically. Flagged rather than decided silently either way — addressed immediately after, below.

## Dashboard's Recent orders rows made clickable too, same as the orders-page table

**What was asked.** The `RecentOrdersList` rows (dashboard) should link to `/orders/[id]` the same way `OrderRow` (orders page) now does — the inconsistency flagged at the end of Phase 4.

**Why this couldn't just be "copy OrderRow's onClick into the existing `.map()`."** `RecentOrdersList` is an `async` Server Component that maps straight to `<tr>` JSX inline — no per-row component, no `"use client"`. A hook (`useRouter`, needed for the whole-row click) can't be called inside a `.map()` callback, and can't be called from a Server Component at all. So making these rows clickable meant extracting each row into its own Client Component first — `RecentOrderRow` (`components/dashboard/recent-order-row.tsx`) — the same structural reason `OrderRow` already existed as its own component rather than being inlined in `OrdersTable`.

**The click-navigation logic itself was extracted, not copy-pasted a second time.** With two real call sites now needing the identical href-plus-click-guard behavior, duplicating `OrderRow`'s `handleRowClick` verbatim into the new component would have been exactly the kind of "no single place to adjust" duplication this project has extracted away every other time it's shown up (`StickyLedgerCell`, `SectionHeading`, `Pagination`). Pulled into `hooks/use-order-row-link.ts` — a small hook, not a rendering component, since the two rows' JSX differs (5 plain columns vs. a sticky-date ledger row) and only the navigation logic, not the markup, was actually duplicated. `OrderRow` was refactored to use it too, so the guard-against-double-navigation logic now has exactly one implementation instead of two that could drift.

**Where the real `<Link>` goes differs between the two tables, correctly.** In `OrdersTable`, the order id is the sticky leading column, so the `<Link>` lives there. In `RecentOrdersList`, the sticky leading column is *Date* — order id isn't the row's visually-leading cell here, it's the mono span inside the "Particulars" cell alongside the customer name. So `RecentOrderRow` wraps the whole Particulars cell content (`ord_#### · Customer Name`) in one `<Link>`, not the sticky Date cell — the link goes on the cell that actually identifies the order in each table, not mechanically on "whichever column happens to be sticky."

**The sticky-column hover-sync fix (`group`/`group-hover:bg-muted/40`, from `OrderRow`) was carried over identically** — `RecentOrderRow`'s Date cell has the same `bg-card` opacity problem StickyLedgerCell always has, for the same reason.

**Verification.** `tsc`/`build`/`lint` all clean (build still lists `/`, `/orders`, `/orders/[id]` correctly; same one pre-existing unrelated warning). Production server + `curl` against `/`: exactly 8 unique `href="/orders/ord_####"` links present, matching `RECENT_LIMIT`; confirmed one row's actual markup end to end — the sticky Date cell's box-shadow (`inset 3px 0 0 0 var(--chart-2), inset -1px 0 0 0 var(--border)`) and `group-hover:bg-muted/40` both intact, with a real `<a href="/orders/ord_0166">` wrapping `ord_0166 Imran Kabir` in the Particulars cell; followed that link's target (`/orders/ord_0008`) and confirmed it resolves with `HTTP 200`.

**Commands run:**
```
npm run build && npm run lint     # both clean (1 pre-existing warning)
npm run start &
curl -s http://localhost:3000/ -o /tmp/dash.html -w "HTTP:%{http_code}\n"
grep -o 'href="/orders/ord_[0-9]*"' /tmp/dash.html | sort -u   # 8 unique
python3 -c "... extract the sticky <td> + its following Particulars <td>,
             confirm box-shadow/hover/link all present together ..."
curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/orders/ord_0008
pkill -9 -f "next-server"
```

**How this moves the build forward:** the dashboard and the orders page now share one consistent row-click affordance everywhere an order appears, and the navigation logic behind it lives in exactly one place (`useOrderRowLink`) rather than two copies that could quietly diverge.

## Phase 5 — Basic Testing (steps 35–40, built in one pass)

**What was asked.** The whole phase in one go: install and configure Jest + React Testing Library via `next/jest`, then the six tests `step.md`/`plan.md` name — `lib/format.ts` formatters, `lib/api/client.ts`'s `mockFetch`, `lib/api/orders.ts`'s `getOrders(filters)`, and two component tests (`SummaryCards`, `EmptyState`). `plan.md`'s own testing section is explicit that this is "basic, not exhaustive" — the highest-value, easiest-to-assert logic, not blanket coverage — so scope decisions below follow that stated philosophy rather than second-guessing it.

**Setup: `next/jest`, jsdom, colocated `*.test.ts(x)` files, no `ts-node`.** Followed Next's own bundled docs (`node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`) rather than assuming a config from training data, per `AGENTS.md`'s standing "this Next.js has breaking changes, read the docs" instruction. One deliberate deviation from the doc's exact example: `jest.config.mjs` (real ESM, `import`/`export default`) instead of the docs' `jest.config.ts`, which needs `ts-node` as an extra devDependency just to let Jest load the config file itself before any test transform even runs — `.mjs` needs nothing extra since Node runs ESM natively and `next/jest`'s own transform never touches this file. Tests are colocated next to what they test (`lib/format.test.ts`, not a parallel `__tests__/` tree) — Jest's default `testMatch` already picks up `*.test.ts(x)` anywhere, so this needed no config, and it keeps each test next to the file it exists for.

**Three real, non-obvious problems found getting from "npm test" to green — none of them guessable from the docs alone, all confirmed by actually running the suite and reading what broke:**

1. **`next/jest`'s alias resolution doesn't cover `jest.mock()`.** A plain `import x from "@/lib/api/client"` resolved with zero config — `next/jest`'s SWC transform handles the `@/*` alias for ordinary imports. But `jest.mock("@/lib/data/mock-orders.json", factory)` in the exact same file threw `Cannot find module`. Confirmed the cause directly rather than guessing: `npx jest --showConfig` printed the actual `moduleNameMapper` array, and there was no `@/` entry in it at all — that alias simply isn't a Jest-level concept here, only a compile-time one the transform applies to import statements it can see and rewrite; `jest.mock()`'s first argument is just a runtime string, invisible to that transform. Fixed with one manual `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }` entry (exactly what the docs' own "Optional: Handling Absolute Imports" section shows — the "optional" framing is what led to skipping it initially, but it's only optional for plain imports).

2. **`jest.mock()` calls are hoisted above every other top-level statement, including a `const` sitting physically above them in the source.** First draft of the `getOrders` test and the `SummaryCards` test both declared a fixture object as an outer `const`, then referenced it inside `jest.mock(path, () => fixture)`. Both threw `Cannot access 'fixture' before initialization` — Jest's hoisting (via SWC under `next/jest`, the same mechanism `babel-plugin-jest-hoist` provides under Babel) moves `jest.mock()` calls to the very top of the compiled file, ahead of the `const`'s own initialization, so by the time the factory runs, the `const` is in its temporal dead zone. This is a known Jest gotcha, not a bug in this project's setup — the usual escape hatch (prefixing the variable name with `mock`) is a Babel-specific allowlist check, not a structural fix, and didn't apply here since `next/jest` uses SWC. The actual fix is structural: for `getOrders`'s fixture, the array literal now lives directly inside the `jest.mock()` factory, not in an outer const; for `SummaryCards`'s fixture, the mock factory returns a bare `jest.fn()` with no implementation, and the real fixture value gets wired in via `jest.mocked(getSummaryStats).mockResolvedValue(summaryFixture)` inside `beforeEach` — which runs during the test phase, safely after the module has fully evaluated and the const exists.

3. **`jest-environment-jsdom`'s global scope doesn't include `structuredClone`.** `mockFetch`'s own real implementation (not mocked, in `client.test.ts` specifically, which tests it directly) throws `ReferenceError: structuredClone is not defined` under jsdom — confirmed this is a jsdom-environment gap, not a real bug, by checking Node itself: `node -e 'console.log(typeof structuredClone)'` prints `"function"` in a normal Node process (Node 18+). The one subtlety worth documenting: `jest.setup.ts` itself runs *inside* the same jsdom-provided global scope as the tests (that's the whole point of `setupFilesAfterEnv` — verified this by trying `globalThis.structuredClone = structuredClone` in the setup file first, which threw the identical `ReferenceError` from inside the setup file itself, since a bare `structuredClone` reference there resolves against the same missing jsdom global, not the outer Node process). So there was no way to just "borrow the real one" by reference from that file. Polyfilled instead with a JSON round-trip (`JSON.parse(JSON.stringify(value))`) — not a general `structuredClone` replacement (fails on Dates, Maps, circular references), but a faithful one here specifically because every value `mockFetch` ever clones in this app is already plain JSON, parsed straight out of `lib/data/*.json`.

**A fourth, smaller thing worth naming even though it didn't block anything: `date-fns`'s `format()` renders in the local timezone.** A date-formatter test's expected string would silently depend on whichever timezone happens to run the suite otherwise. Fixed at the `npm test`/`npm run test:watch` script level (`TZ=UTC jest`, in `package.json`) rather than inside a test file — pins every test run to the same timezone regardless of the machine or CI runner, closer to the root of the problem than repeating a `TZ` override per test.

**`SummaryCards`' test needed a real adaptation, not just an implementation — the step's own wording didn't match the actual component.** `step.md`'s step 39 said "renders the correct values from props," but `SummaryCards` (built in Phase 2b) is an `async` Server Component that fetches its own data via `getSummaryStats()` and takes zero props — same self-contained-fetch pattern as every other dashboard section. Two real constraints collided here: Jest doesn't support rendering an `async` Server Component the normal way at all (Next's own docs, quoted in full: "Since `async` Server Components are new to the React ecosystem, Jest currently does not support them... we recommend using E2E tests for `async` components"), and this project has no E2E tooling (deliberately — `plan.md` scopes testing to Jest + RTL only). The resolution: mock `getSummaryStats` to return a known fixture, then call `SummaryCards()` directly as a plain function and `await` the JSX it returns — `render(await SummaryCards())` — instead of writing `<SummaryCards />` and letting RTL try to render it. By the time `render()` receives it, it's already a fully-resolved, ordinary synchronous React element tree, which is all `render()` ever actually needed; the `async`-ness never has to survive into React's render cycle. `step.md` updated to note this adaptation rather than silently diverging from what it said.

**`getOrders` tests use a small hand-built 5-order fixture, not the real 200-order generated dataset.** Deliberate, and directly informed by the discussion two turns ago about *not* expanding the mock activity dataset: `lib/data/mock-orders.json` is meant to be regenerated (`scripts/generate-mock-data.mjs` is seeded for reproducibility, but its output isn't a frozen contract), so a unit test asserting on `getOrders()`'s filtering/sorting/pagination *logic* needs input that won't shift out from under it if the generator or its seed ever changes. `jest.mock("@/lib/data/mock-orders.json", ...)` intercepts the exact specifier `getOrders()` itself imports, so this is still a real test of the actual function, not a parallel reimplementation of its logic. Covers exactly what step 38 names — status filter, search filter (both the order-id and customer-name branches, including a case-insensitivity check), inclusive date-range filter, and pagination slicing (including the newest-first sort order and the default-page-size path) — plus two small `getOrderById` tests (found / not-found), which wasn't named in step 38 but is the same file, same fixture, and a two-line addition for a function two other phases (Phase 4's order-details route) actually depend on.

**Deliberate scope cuts in `lib/format.test.ts`, stated rather than silent.** Tests `formatCurrency`, `formatSignedCurrency`, `formatCurrencyCompact` (currency, all three with real branch logic — rounding, sign, lakh-vs-not) and `formatDate`/`formatShortDate`/`formatDateTime` (date) — exactly `step.md`'s named scope. Left out on purpose: `formatPercent` (a one-line `Intl` passthrough with no branch to get wrong) and `formatRelativeTime` (reads the real wall clock via `formatDistanceToNow` — testable, but only by faking `Date.now()` for an assertion that wouldn't be testing anything specific to this codebase). Both omissions are named in the test file's own top comment, not just left implicit.

**Verification.** `npm test`: 5 suites, 29 tests, all passing. `npm run lint`: clean (same one pre-existing, already-flagged `client.ts` warning — nothing new introduced). `npm run build`: compiles clean, TypeScript clean (test files are included by `tsconfig.json`'s `**/*.ts`/`**/*.tsx` and type-checked as part of the same build), and the route table is unaffected (`/`, `/orders`, `/orders/[id]` — test files don't become routes or otherwise affect the production bundle).

**Commands run:**
```
npm install -D jest jest-environment-jsdom @testing-library/react \
  @testing-library/dom @testing-library/jest-dom @types/jest
# → added cleanly, 0 vulnerabilities

npm test
# → first real run: 3 suites failed
#   - "Cannot find module '@/lib/data/mock-orders.json'" /
#     "Cannot find module '@/lib/api/analytics'" (jest.mock() with an
#     aliased path — see problem 1 above)
# fixed: added moduleNameMapper to jest.config.mjs

npm test
# → "Cannot access 'fixtureOrders'/'summaryFixture' before initialization"
#   (jest.mock() hoisting — see problem 2 above)
# fixed: inlined the getOrders fixture into its factory; switched
#   SummaryCards' fixture to jest.mocked(...).mockResolvedValue() in beforeEach

npm test
# → "ReferenceError: structuredClone is not defined" (jsdom env gap —
#   see problem 3 above), everywhere mockFetch's real implementation ran
# fixed: JSON-round-trip polyfill in jest.setup.ts

npm test
# → 1 remaining failure: "throws an ApiError when the fail rate triggers"
#   — an unhandled-rejection race between advancing the fake timer and
#   attaching the .rejects handler
# fixed: create the expect(...).rejects/.resolves chain before advancing
#   the timer, not after (applied to all four timer-advancing assertions
#   in client.test.ts for consistency, not just the one that failed)

npm test          # → 5 suites, 29 tests, all passing
npm run lint       # → clean (1 pre-existing unrelated warning)
npm run build      # → compiled clean, TypeScript clean, routes unchanged
```

**How this moves the build forward:** the service layer (`mockFetch`, `getOrders`) and the two highest-value/easiest-to-assert UI pieces now have a real, fast (~1–2s), deterministic regression net — useful the moment any later phase (README, deploy prep, or any further UI pass) touches this code again. The four real Jest/`next/jest`/jsdom gotchas found along the way are written into `step.md`'s standing-lessons list, not just fixed silently, since none of them were guessable in advance and all four would reproduce identically for any later test file in this project.

## Phase 6 — Responsive Pass (steps 41–43)

**What was asked.** The three items `step.md` names: dashboard breakpoints (summary cards, chart sizing) across mobile/tablet/desktop, orders table/page mobile responsiveness, and the filters bar stacking on mobile.

**Method — no browser screenshot tool is available in this environment, so instead of guessing, actually did the pixel math against this app's real container padding, real breakpoints, and real component sizes (fixed pixel widths, `shrink-0` flags), then confirmed the resulting classes against a production server's rendered HTML.** `app/layout.tsx`'s `<main>` sets `px-4 sm:px-6` — so a 375px phone has 343px of usable width, a real, specific number the rest of this audit is anchored to rather than a vague "does it look okay" guess.

**Found real, concrete bugs, not just theoretical ones — worth stating why each one is real:**

1. **`FiltersBar` had no intentional mobile treatment at all** — just `flex flex-wrap items-center gap-2` at every breakpoint, meaning exactly where each control wrapped onto its own line was whatever the summed fixed widths happened to produce, not a deliberate choice. Summed desktop widths (search `min-w-50`=200px + status `w-40`=160px + two `w-37.5` date inputs=300px + gaps) come to roughly 800px — nowhere near fitting a 343px phone screen, so *something* was always going to wrap, just not predictably or cleanly.
2. **`OrderStatusBreakdown`'s donut is a fixed 160px and explicitly `shrink-0`** (`StatusDonut`, `h-40 w-40 shrink-0`) — sitting beside a legend in a plain `flex items-center gap-4` row with no responsive treatment at all. At this section's actual mobile width (343px page width → 311px inside the Card's own padding), that leaves only 311 − 160 − 16(gap) = **135px** for the legend — and one legend row reads "Cancelled / refunded" plus a percentage value on the same line, which doesn't fit in 135px. This is exactly the kind of bug the project's own standing rule ("do a real-screen review, not just a clean build") exists to catch — `tsc`/`lint`/`build` all pass on this either way, since nothing here is a type or syntax error, only a real layout constraint violated at a specific width.

**A third candidate considered and deliberately not done: moving the two-column dashboard sections (charts, insights row, recent-orders/activity row) from their `lg:` (1024px) split to `md:` (768px), so tablets get a genuine side-by-side layout instead of inheriting the mobile single-column stack.** Worked through the actual math before deciding against it: if the outer grid splits to 2-up at 768px, `OrderStatusBreakdown` only gets its 4/12 share of the row (≈236px column width) at exactly the width range (768–1023px) where a plain `sm:` (640px) breakpoint on its internal donut/legend split would *already* have switched to row mode — reintroducing the same cramping bug, just at tablet width instead of phone width, and harder to reason about since it depends on two nested breakpoints agreeing. Fixing that properly would need a real container query (`@container`/`@sm:`, which this codebase already uses once, in `CardHeader`) rather than a viewport media query, since the donut needs to react to its own column's rendered width, not the viewport's. Chose not to introduce that now: the current single-column-until-`lg:` tablet layout is fully readable and not cramped (confirmed by the same math — at 768px, a still-single-column `OrderStatusBreakdown` gets the *full* ~720px row width, comfortably fitting donut+legend side by side even before this pass's own `sm:` fix ever mattered) — just not maximally space-efficient. A real, working tablet layout beats a risky one I can't visually verify in this environment.

**Re-verified, not re-built: orders table/page mobile responsiveness (step 42) and the dashboard header/pagination/KPI strip.** These already went through dedicated mobile-responsiveness work in earlier sessions (the sticky order-id column, the `max-h-[65vh] overflow-auto` scroll container, `StickyLedgerCell`'s frozen header) — re-checked the actual current classes rather than assuming they still hold, confirmed the pattern is sound and needs no changes here. Also walked the app header (logo + nav links + theme toggle, well under 343px combined) and `Pagination` (no fixed-width rigid elements, `flex-wrap` throughout) and found nothing broken at any width — worth recording that this pass looked, not just skipped these because a prior pass touched them.

**The fixes:**
- `FiltersBar`/`FiltersBarSkeleton`: `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center` — one full-width control per row below `sm` (640px), the original wrapped-row layout from `sm` up. Each control gets `w-full sm:<original-width>` (search, status select) or `flex-1 sm:w-37.5 sm:flex-none` (the two date inputs, so they split the row evenly on mobile instead of using their fixed 150px each, which would nearly overflow a 343px screen on their own).
- `OrderStatusBreakdown`/its skeleton: `CardContent` becomes `flex flex-1 flex-col items-center gap-4 sm:flex-row` — donut centered above a full-width (`w-full`) legend below `sm`, the original side-by-side row from `sm` up. Chose `sm` specifically because the outer grid stays single-column below `lg`, so this section has its *full* row width available anywhere from `sm` to `lg` — no risk of the nested-breakpoint cramping problem described above, precisely because the outer split wasn't also moved.

**Verification.** `npm run build`/`npm run lint`/`npm test` all clean (build unaffected — same three routes, same one pre-existing lint warning, same 29 passing tests — these are layout-only className changes with no logic touched). Production server + `curl`, checked for the actual rendered classes rather than assuming the edit "worked": all of `sm:min-w-50`/`sm:w-40`/`sm:w-37.5`/`sm:flex-none` present on the real (non-skeleton) `<input>`/`<button>` elements in `/orders`'s response, and `sm:flex-row` present on the real (non-skeleton) `OrderStatusBreakdown` `CardContent` in `/`'s response — confirmed by finding every occurrence in the document and checking each one's surrounding markup, not just the first match (the skeleton's near-identical classes render earlier in the same streamed document and would otherwise produce a false positive).

**One limitation, same category as every other responsive claim across this project: no real browser or screenshot tool was available to visually confirm the wrap/stack points, hover, or actual rendered spacing.** Everything above is confirmed by exact pixel arithmetic against this app's real, measured container padding and component sizes, plus confirming the intended classes actually reached the rendered HTML — not by looking at a live viewport. Offered to the user as an open item rather than silently assumed correct.

**Commands run:**
```
npm run build && npm run lint && npm test   # all clean before any edits
                                              # (baseline check)

# — edits to filters-bar.tsx, order-status-breakdown.tsx —

npm run build   # → compiled clean, TypeScript clean, routes unchanged
npm run lint     # → clean (1 pre-existing unrelated warning)
npm test          # → 5 suites, 29 tests, all still passing

npm run start &
curl -s http://localhost:3000/orders -o /tmp/orders-r.html -w "HTTP:%{http_code}\n"
curl -s http://localhost:3000/ -o /tmp/dash-r.html -w "HTTP:%{http_code}\n"
# → both HTTP 200

python3 -c "... find every occurrence of sm:w-40 / sm:w-37.5 / sm:flex-row,
             print surrounding context for each, confirm at least one
             occurrence is the real (non-skeleton) element, not just the
             skeleton's matching class string ..."
# → confirmed present on the real SelectTrigger, both real date <input>s,
#   and the real OrderStatusBreakdown CardContent

pkill -9 -f "next-server"
rm -f /tmp/orders-r.html /tmp/dash-r.html
```

**How this moves the build forward:** the two remaining genuine mobile-layout bugs in the app are fixed and verified; the tablet-breakpoint idea that was considered and set aside is written down with the actual reasoning (a container-query problem, not a "didn't get to it" gap), so it doesn't need re-deriving if it comes up again later.

## Skeleton-vs-real size audit (dashboard + orders page)

**What was asked.** Check whether the loading skeletons across the dashboard and orders page are undersized relative to the real content they stand in for — the user's own hunch was that they mostly are, and that this causes a visible layout shift once real data streams in.

**First real obstacle: actually seeing a skeleton at all.** Every real fetch in this app goes through `mockFetch`'s random 1–2000ms delay, too short and unpredictable to reliably screenshot. Temporarily forced `generateRandomDelay()` in `lib/api/client.ts` to a fixed 8000ms (reverted before finishing — confirmed via `git status` showing no diff on that file at the end). Even with 8 real seconds to work with, the first several attempts still failed to catch the loading state:
- `browser_navigate` returned only once the page was fully loaded — expected in hindsight (a streamed RSC response doesn't fire the browser's `load` event until every Suspense boundary's chunk has flushed), but not obvious going in.
- Clicking the "Orders" nav link (`browser_click`) also landed on fully-resolved content immediately — this one turned out to be Next's own router prefetch/cache: `<Link>` had already fetched `/orders` in the background while it sat in the viewport, so the "navigation" never even touched the artificially slow `mockFetch` path.
- What worked: `browser_evaluate(() => location.reload())`. Unlike the three tools above, `browser_evaluate` doesn't auto-wait for the page to settle — it just runs the JS and returns, so a *following* tool call (another `evaluate`, or occasionally a `take_screenshot` if the round-trip was fast enough) had a real multi-second window to inspect the still-loading page. Confirmed this was genuinely mid-load, not a fluke, two ways: the document title read `"Loading http://localhost:3000/"` (the browser's own placeholder, shown before the page's real `<title>` tag — itself part of the static shell — has even arrived) immediately after triggering reload, and a screenshot taken in that window visually showed skeleton placeholders, not real data.

**Measured, didn't eyeball — every number below is `getBoundingClientRect().height` from the actual rendered page, both before and after each fix, at a 1440×1000 viewport.**

| Section | Skeleton (before) | Real | Gap | Skeleton (after) | Gap now |
|---|---|---|---|---|---|
| KPI cards (all 5, uniform) | 88px | 113px | −25px | 114px | +1px |
| Order status | 194px | 209px | −15px | 207px | −2px |
| Top products | 176px | 209px | −33px | 206px | −3px |
| Recent orders | 313px | 385px | −72px | 374px | −11px |
| Recent activity | 326px | 385px | −59px | 374px | −11px |
| Revenue/Orders charts | 196px | 196px | 0px (already correct) | — | — |
| Orders-page table | 281px, **8 rows** | 471px, **10 rows** | −190px, wrong row count | 448px, **10 rows** | −23px, correct row count |

**Root causes, not just numbers — three distinct categories of bug:**

1. **Bar heights too short.** `SummaryCards`, `TopProducts`, `RecentOrdersList`, and `OrdersTable`'s skeletons all used `h-3.5` (14px) placeholder bars standing in for real `text-sm` content that actually renders at a 20px line-height. `SummaryCards`' hero figure was a sharper case: `HERO_VALUE` is a 34px font-size nominally inheriting a 20px line-height from its ancestor, but browsers expand the line box to fit oversized glyphs rather than clip them — confirmed empirically (measured the real row at ~55px tall for text alone), not assumed. Fixed by sizing bars to `h-5` (20px) generally, and `h-14` specifically for the hero value bar once the real measurement was in hand.
2. **Whole rows/sections missing, not just undersized.** `OrderStatusBreakdownSkeleton` had 5 legend-row placeholders but no placeholder for the real component's 6th row (the "Cancelled / refunded" summary, with its own `border-t` separator) — that row would have visibly *appeared from nothing* on load, not just shifted position. Both table skeletons (`RecentOrdersList`, `OrdersTable`) had no `<thead>` placeholder at all, despite the real tables always rendering one.
3. **A genuinely wrong constant, not a sizing issue.** `OrdersTableSkeleton` defaulted to 8 placeholder rows (`DEFAULT_SKELETON_ROW_COUNT`, a number invented for the skeleton alone) while `getOrders()`'s own actual default page size is 10 (`DEFAULT_PAGE_SIZE` in `lib/api/orders.ts`) — two independently-maintained constants that happened to start equal and drifted apart at some point. This is the same category of bug the project's already hit once before (`ORDER_STATUSES`, `ORDER_PAGE_SIZE_OPTIONS` — see `step.md`'s standing lessons on single-source-of-truth constants), just not caught for this particular pair until now. Fixed by exporting `DEFAULT_PAGE_SIZE` and having the skeleton default to *it* instead of its own number — structurally impossible for the two to disagree again.

**One gap left deliberately unresolved, and why.** `RecentActivityFeed`'s skeleton still measures ~11px short per card even after the bar-height fix. Traced this to the real data itself, not a sizing mistake: activity messages vary in length ("New order ord_0166 placed by Imran Kabir — ৳1,200.00" vs "New customer Rahim Bhuiyan registered"), and some wrap to two lines at this viewport width while others don't — measured one real row directly at 70px, but the card's total (385px ÷ 5 ≈ 77px average) is higher, meaning at least one row is taller than the baseline. A uniform skeleton can approximate the common case but can't predict which specific rows will wrap before the data has even loaded — chasing an exact match here would mean guessing at real message lengths, which the skeleton has no way to know. Left as a small, honest, disclosed residual gap rather than an invented "solution."

**Verification.** `npm run build`/`npm run lint`/`npm test` all clean (build: same three routes, same one pre-existing warning; tests: all 29 still passing — none of this touched tested logic). Every number in the table above was re-measured after the corresponding fix, not just computed by hand and trusted — including a final visual screenshot of the actual loading state (not just the numbers) showing the donut placeholder, the now-present cancellation-rate row, and both table header rows all rendering as intended. `lib/api/client.ts`'s temporary 8-second delay was reverted before finishing — confirmed via `git status` showing zero diff on that file.

**Commands run:**
```
# temporarily force generateRandomDelay() to return 8000 (reverted at the end)

npm run dev &   # (several restarts along the way — see below)

# via Playwright MCP tools:
browser_navigate → http://localhost:3000/        # returns only once fully loaded
browser_take_screenshot                            # confirms: already real data
browser_click "Orders" nav link                    # same result — router prefetch
browser_evaluate(() => { location.reload(); return 'reloading'; })
  → Page Title: "Loading http://localhost:3000/"   # confirms genuinely mid-load
browser_take_screenshot                             # caught the real skeleton state

browser_evaluate(() => {
  // getBoundingClientRect() on every h2's sibling Card, and the ungrouped
  // KPI/chart cards, returned as one object
})
  → baseline "before" measurements (table above)

# — edits across 7 files —

# repeated: reload via evaluate, re-measure via evaluate, compare to baseline
# — iterated once more on Recent orders' header-row bar height after the
#   first pass left an 8px gap traced specifically to it

npm run build && npm run lint && npm test   # all clean

rm -rf .playwright-mcp   # screenshots/snapshots cleaned up (already gitignored)
pkill -9 -f "next-server"; pkill -9 -f "next dev"

# reverted lib/api/client.ts's generateRandomDelay() back to
# `Math.floor(Math.random() * 2000) + 1` — confirmed via `git status --short`
# showing no diff on that file
```

**How this moves the build forward:** this is the first real, hands-on use of the Playwright MCP browser access set up earlier this session — and it immediately found bugs the project's established `curl`-plus-pixel-math verification method structurally could not (a transient loading state, real rendered text metrics, an actual browser's line-box behavior). The `evaluate`-vs-`navigate`/`click`/`screenshot` auto-wait distinction is written into `step.md` as a standing lesson, since it's exactly the kind of non-obvious tool behavior that would otherwise be rediscovered the hard way next time a transient UI state needs inspecting.

## Date-range filter: shadcn Calendar + Popover replacing the native date inputs

**What was asked.** Swap the orders page's two native `<input type="date">` fields for shadcn's `Calendar` component (previously scoped as informational-only — "let me know, don't implement"), now actually build it, and verify it works on both mobile and desktop.

**Confirmed available for this project's exact style before installing anything.** `npx shadcn view calendar` (read-only) showed a `calendar` registry item for `base-nova` — this project's own style (Base UI, not the default Radix one; `components.json`'s `"style": "base-nova"`). Built on `react-day-picker` (a headless library independent of Radix/Base UI, which is why it works with either style) plus `date-fns` (already a dependency). Installed both `calendar` and `popover` (the date picker pattern needs a trigger + popup, and `Popover` didn't exist in `components/ui/` yet) via `npx shadcn add calendar popover` — added `react-day-picker` as the one new dependency, everything else already present.

**One immediate fix at the source, matching established project practice.** The generated `popover.tsx` had the same `shadow-md ring-1 ring-foreground/10` the project has already stripped from `Card`/`Dialog`/`Select`/`ChartTooltip` at the point each was added (Khata direction: borders-only depth). Fixed the same way, in the same commit as installing it, not left for a later pass.

**Design decision: one combined range-picker, not two separate single-date pickers.** The native inputs were two independent fields; `react-day-picker`'s `mode="range"` is built for exactly the from/to shape this filter already has, and one continuous interaction (pick a start day, then an end day, in one popover) reads better than tabbing between two separate controls for what's really one filter. This is a real design call, not just "the obvious shadcn way" — flagged here since it changes the interaction model, not just the visual component.

**A real bug found only by actually testing it, not by reading the code:** the popover closed after a *single* click. Read `react-day-picker`'s own `addToRange` source (`node_modules/react-day-picker/dist/esm/utils/addToRange.js`) to find out why rather than guessing: with the library's default `min={0}`, the very first click on an empty range immediately produces `{from: day, to: day}` — both endpoints already non-null. The original logic ("commit and close once both endpoints exist") fired on that very first click, before a real second endpoint could ever be chosen. Confirmed the bug visually before fixing it (a screenshot after one click showed the popover already closed, the trigger already reading "Sep 13, 2026 - Sep 13, 2026", the table already filtered to a single day) rather than assuming the fix was needed from reading the code alone.

**The fix: an explicit Apply button, the same pattern most real date-range pickers use** — not a cleverer heuristic trying to distinguish "first click" from "second click." The popover now holds a local, uncommitted `range` draft (synced from the URL on open, so a closed-without-applying attempt never leaks into the next open) and only calls `setFilters`+closes on an explicit Apply click. This sidesteps the seed-vs-complete ambiguity entirely instead of trying to out-guess `react-day-picker`'s internal state machine, and has a real secondary benefit: the user can freely change their mind mid-selection (click a different start day, keep browsing months) without anything committing prematurely.

**A real bug in the URL-state hook, found while wiring Apply up — not specific to the calendar.** `useOrderFiltersUrl`'s existing `setFilter(key, value)` closes over one `searchParams` snapshot per call. Calling it twice in the same handler (`setFilter("from", x); setFilter("to", y)`, the obvious first attempt at committing both endpoints) would have silently lost the `from` change — both calls build a fresh `URLSearchParams` from the *same* pre-update snapshot, so the second `router.replace` completely overwrites the first's effect. Caught this by reading the hook's actual implementation before wiring anything up against it, not by hitting the bug at runtime. Fixed by adding `setFilters(updates: Partial<...>)`, which builds one `URLSearchParams` from every change and calls `router.replace` once; `setFilter` is now a thin wrapper around it, so the two can't drift into two different code paths.

**Mobile: one month, not two — decided by the numbers, not a guess.** `numberOfMonths={2}` at any width narrower than `sm` (640px) would force the popover's own content wider than the viewport itself. Two `<Calendar>` instances are mounted (`className="sm:hidden"` / `className="hidden sm:flex"`), toggled by CSS rather than a `useMediaQuery` hook — avoids any SSR/hydration mismatch a JS viewport check would introduce (the server can't know the client's viewport size), at the acceptable cost of two lightweight `DayPicker` instances mounted at once instead of one.

**Verification — actually driven in a real browser (Playwright MCP), both breakpoints, not inferred from the code.** Confirmed directly:
- Desktop (1440px): two-month calendar renders correctly, aligned under the trigger, no clipping
- A full click-through of a real range selection: click day 13 (draft only, Apply/Clear go from disabled to enabled, table stays unfiltered, URL unchanged) → click day 15 (range visually highlighted across 13–14–15) → click Apply (URL becomes `?from=2026-09-13&to=2026-09-15`, popover closes, table correctly filtered to the 6 orders in that range, trigger now reads "Sep 13, 2026 – Sep 15, 2026")
- The page-level "Clear" button resets the trigger back to "Date range" and the URL back to `/orders` — confirmed the popover's own draft state resyncs correctly by reopening it afterward and finding it empty, not stale
- Light theme: calendar, popover, and trigger all render with correct contrast and the theme's actual token colors — checked directly, not assumed from dark mode alone
- Mobile (375px): trigger renders full-width (consistent with the rest of `FiltersBar`'s Phase 6 stacking), popover shows exactly one month with no horizontal overflow, month navigation (Prev/Next) works, a cross-month range (Sep 18 → Oct 5, navigating forward a month mid-selection) applies correctly, and a real "no orders in this range" result correctly renders the existing `EmptyState` with its "Clear filters" action

`npm run build`/`npm run lint`/`npm test` all clean throughout (build: same three routes, same one pre-existing warning; tests: all 29 still passing).

**Commands run:**
```
npx shadcn view calendar    # confirmed a base-nova calendar exists, read-only
npx shadcn view popover     # confirmed the same for popover
npx shadcn add calendar popover --yes
# → added react-day-picker; components/ui/calendar.tsx, components/ui/popover.tsx

# fixed popover.tsx's ring/shadow at the source (Khata direction)

npm run build && npm run lint   # clean

# built components/orders/date-range-filter.tsx, wired into filters-bar.tsx,
# added setFilters to hooks/use-order-filters.ts

npm run dev &
# via Playwright MCP: navigate /orders, resize 1440x900, open the popover,
# click day 13 → screenshot (confirms draft-only, not committed)
# → found the popover had ALREADY closed and committed after one click

# read node_modules/react-day-picker/dist/esm/utils/addToRange.js
# → confirmed the same-day-seed behavior; redesigned with an Apply button

npm run lint   # clean
# re-tested: click 13 (stays open, Apply/Clear enable) → click 15 (range
# highights) → Apply (URL commits, table filters, popover closes) — all
# confirmed via snapshot + screenshot, not assumed
# tested page-level Clear + reopen (confirms draft resync)
# switched to Light theme, re-opened popover, screenshotted
# resized to 375x800, re-tested the full click-through on mobile,
# including cross-month navigation and the empty-state path

npm run build && npm run lint && npm test   # all clean
rm -rf .playwright-mcp
pkill -9 -f "next-server"; pkill -9 -f "next dev"
```

**How this moves the build forward:** the orders page's date filter is now a real, polished range picker rather than two disconnected native inputs, matching the shadcn/Base UI component set already used everywhere else in the app. Two real, non-obvious bugs (the URL-state hook's snapshot problem, `react-day-picker`'s same-day seed behavior) were caught before shipping specifically because the feature was driven end-to-end in a real browser rather than trusted from reading the code — both are written into `step.md` since either would resurface identically anywhere else in the app that tries the same "two params from one interaction" or "range-mode calendar" pattern.

## Follow-up: "Clear" read as an odd, separate row on mobile

**What was asked.** A screenshot showed "Clear" rendering as its own full-width, centered row below the date-range trigger on mobile — asked for a better mobile treatment than a separate row.

**Root cause, and why the obvious fix (nest it beside the trigger) didn't work on the first attempt.** `Clear` was a direct child of the outer `flex flex-col` container — below `sm`, every direct child becomes its own row by construction, and the flex-col default `align-items: stretch` stretched the Button's own box to the full row width, with its content then centered inside via the button's own `justify-center`. First fix: nest `DateRangeFilter` and `Clear` together in one `flex items-center gap-2` wrapper so they'd share a row instead. That alone didn't work — `Clear` vanished off-screen entirely. Measured why with `getBoundingClientRect()` rather than guessing further: the date trigger's rect was the full 343px row width, `Clear`'s rect started at `x: 367` on a 375px-wide viewport (i.e. entirely past the visible edge), and the wrapper's `scrollWidth` (423px) exceeded its `clientWidth` (343px) by almost exactly `Clear`'s own width. Checked the trigger's actual computed style next: `flex-shrink: 0` — traced to `Button`'s own base classes (`shrink-0`, a sensible default for buttons generally, e.g. inside a horizontal button group where every button should hold its size). That default silently overrode the shrinking `Clear` needed room to appear at all; an earlier `min-w-0` addition had no effect because `flex-shrink: 0` means "never shrink," full stop — `min-width` only matters once shrinking is actually allowed to happen.

**Fix:** added `shrink` (not `shrink-0`) to the trigger's own className — `tailwind-merge` treats them as the same utility family and lets the later one win, so this instance shrinks while every other `Button` in the app keeps its sensible non-shrinking default. Kept the earlier `min-w-0` (on both the button and its label `<span>`) since it's still needed for the truncated label text to actually shrink once `flex-shrink` is allowed to act at all.

**Verification.** Re-tested via Playwright at 375px: `Clear` now sits compactly beside the (truncated, if needed) date-range label on one row; re-checked the no-active-filter state (trigger alone, full width, no dangling gap) and a status-only-filter state (an empty "Date range" placeholder next to "Clear" still reads fine, since "Clear" is a generic clear-all action, not date-specific). Re-confirmed desktop (1440px) is visually unchanged. `npm run build`/`npm run lint`/`npm test` all clean.

**Commands run:**
```
npm run dev &
# via Playwright MCP: 375px viewport, navigate /orders?from=...&to=...,
# screenshot → Clear button entirely missing from the visible page

browser_evaluate(() => { /* getBoundingClientRect() on the date button,
  Clear button, and their wrapper */ })
# → Clear's rect starts past the viewport edge; wrapper scrollWidth >
#   clientWidth by ~Clear's own width — confirms real overflow, not a
#   z-index/visibility issue

browser_evaluate(() => getComputedStyle(dateBtn))
# → flexShrink: "0" — traced to Button's own base classes

# added shrink (overriding shrink-0) to the trigger's className

npm run lint   # clean
# re-tested: 375px (Clear now inline, compact), no-filter state,
# status-only state, 1440px desktop (unchanged) — all via screenshot

npm run build && npm run lint && npm test   # all clean
rm -rf .playwright-mcp
pkill -9 -f "next-server"; pkill -9 -f "next dev"
```

**How this moves the build forward:** a real, if small, layout bug caught from a single user screenshot and fixed with the same measure-first discipline as the rest of this session — worth remembering that a component's own sensible base default (`shrink-0`) can silently defeat a parent-level layout intent, and that `min-width` fixes are inert until whatever's actually blocking shrinkage (`flex-shrink: 0` here) is addressed first.

## Error-state audit: forced failures, both pages, retry mechanism

**What was asked.** Run real tests with `DEFAULT_FAIL_RATE` set so API errors actually occur, on both the dashboard and orders pages, and check the error UI and the retry mechanism actually work — three screenshots were provided showing dashboard error states that "don't seem okay."

**Found `DEFAULT_FAIL_RATE` already live at `0.5`** (not something touched this session before now — an external edit, matching the project's established practice of noting rather than silently reverting these). Needed *deterministic*, not random, reproduction to actually diagnose the screenshots' specific layout problem rather than hunting for it across lucky reloads: temporarily set the global rate to `0` and added an explicit `{ failRate: 1 }` / `{ failRate: 0 }` override to the exact one or two `mockFetch` calls needed for each scenario (`getTopProducts` forced to fail while `getOrderStatusBreakdown` forced to succeed, matching the screenshots exactly; later `getOrders` forced to fail for the orders-page tests). Every override was reverted immediately after use — confirmed via `git diff` showing zero change on `lib/api/analytics.ts` and only the pre-existing, unrelated diff on `lib/api/client.ts`/`lib/api/orders.ts` at the end.

**Bug 1 (the one in the screenshots): a failed section didn't stretch to fill its grid row, leaving a real, measured dead-space gap.** Reproduced exactly: `OrderStatusBreakdown` succeeding (198px card, matching its own donut+legend content) beside `TopProducts` failing — measured via `getBoundingClientRect()`, not eyeballed: the error `Card` sat at its own natural 158px height inside a grid cell CSS Grid had stretched to 230px (the row's height, set by the taller successful sibling — the same `align-items: stretch` mechanism that correctly sizes successful content via its own `h-full`/`flex-1`), leaving a bare 72px gap before the next section. `SectionBoundary`'s fallback `Card` never had that same sizing treatment. Fixed by adding `h-full` and `justify-center` to the fallback `Card` (already had `items-center` for horizontal centering; needed `justify-center` too, for vertical) — one shared component, so the fix applies uniformly to every dashboard section without per-section changes. Verified the fix in both directions: `OrderStatusBreakdown` (success) / `TopProducts` (fail) — error card now exactly 230px, matching its sibling; and the reverse, `RecentOrdersList` (fail) / `RecentActivityFeed` (success, and normally the *shorter* of that pair) — confirmed via screenshot that this pairing, which would have shown an even larger gap pre-fix, now aligns perfectly too. Also re-verified the "everything fails at once" scenario (matching the second provided screenshot) still renders cleanly post-fix — no regression from adding `h-full` to a component that sometimes has no taller sibling to stretch against.

**Bug 2 (found by testing, not visible in the screenshots): a failed `OrdersResults` on the orders page wiped out `FiltersBar` entirely, defeating the whole reason that component was split out.** `app/orders/page.tsx`'s own code comment already *documented* this as an accepted limitation ("error.tsx still covers the whole route... regardless of the Suspense boundary in between") — but confirmed directly what that actually looks like: forcing `getOrders()` to fail replaced the *entire page*, search box and all, with the route-level `error.tsx` card. This is the identical disruption the "clunky filter" fix (extracting `OrdersResults` into its own Suspense boundary, a session or two ago) already fixed for the *loading* case — `Suspense` only catches a thrown promise, not a thrown error, so an error still propagates straight past it to the nearest actual error boundary. Fixed by wrapping `OrdersResults` in the dashboard's existing `SectionBoundary` (already a shared, generic component, not dashboard-specific despite its current callers) — reusing it rather than inventing a second error-isolation mechanism. `app/orders/error.tsx` still exists as the genuine last resort for anything outside `OrdersResults`.

**Retry mechanism, verified end to end, not just present:**
- Typed into the search box while `OrdersResults` was erroring — text stayed, input kept focus, cursor position intact; the debounced URL update then re-triggered (and re-failed) *only* the results section, `FiltersBar` completely unaffected
- Clicked Retry on the orders page — a genuinely new fetch attempt occurred (console error count increased, matching the forced failure firing again), `FiltersBar`'s typed text was still there afterward
- Flipped `getOrders` to succeed and clicked Retry again — recovered correctly, rendering the real (in this case, correctly empty — the test search term matched nothing) result
- On the dashboard, with all 6 sections failing at once, clicked each section's Retry individually and confirmed each recovers **only when its own Retry is clicked** — clicking one does trigger `router.refresh()` (which re-fetches every section's data, exactly as `SectionBoundary`'s own comment already documents), but a section whose own `key` didn't change keeps rendering its *stale* cached error state even though fresher data was just reconciled into its unrendered `children` — confirmed this is the actual, working-as-designed behavior, not a bug, by clicking through all 6 individually and watching each recover one at a time until the full dashboard matched its original clean state exactly

**Left `DEFAULT_FAIL_RATE` as the user's own current value, not reverted to `0`.** Attempted to revert it to `0` (matching the code's own comment: "Defaults to 0 so normal use... is reliable") as the last cleanup step, the same way every other temporary test change this session was reverted — but the user was actively editing `lib/api/client.ts` in their own IDE at that exact moment and set it back to `0.5` immediately after. Left it alone rather than re-reverting a live, deliberate edit — flagged to the user directly instead (a `0.5` global fail rate is good for continued testing, but would make the live app fail roughly half the time if left in place for grading/submission).

**Verification.** `npm run build`/`npm run lint`/`npm test` all clean throughout and at the end (routes unchanged, same one pre-existing warning, all 29 tests passing — none of this touched tested logic).

**Commands run:**
```
# read lib/api/client.ts, section-boundary.tsx, error-boundary.tsx,
# app/page.tsx, app/orders/page.tsx, app/orders/error.tsx first

# temporarily: DEFAULT_FAIL_RATE = 0; getOrderStatusBreakdown → failRate 0;
# getTopProducts → failRate 1 (deterministic repro of the screenshots)
npx tsc --noEmit    # clean
npm run dev &

# via Playwright MCP: 1440x1200, navigate /, screenshot
# → reproduced exactly: Order status normal height, Top products error
#   card visibly short with a gap below it before Recent orders

browser_evaluate(() => { /* getBoundingClientRect() + getComputedStyle()
  on both column divs, both sections, both cards */ })
# → errorCard height 158, its column 230 (matching sibling), confirmed
#   real: 72px gap, not a rendering/screenshot artifact

# fixed: added h-full + justify-center to SectionBoundary's fallback Card
npx tsc --noEmit   # clean
# re-navigated, re-screenshotted, re-measured
# → errorCard height now 230, exactly matching its sibling

# reverted the two analytics.ts overrides; added getOrders → failRate 1
# (isolates the orders-page + reversed-pairing tests without touching
# getOrders permanently)
# navigated /, screenshotted → confirmed RecentOrders(fail)/RecentActivity
#   (succeed) pairing also now aligns correctly
# navigated /orders → confirmed FiltersBar disappeared entirely, replaced
#   by the whole-route error.tsx card (bug 2, found by testing)

# fixed: wrapped OrdersResults in SectionBoundary in app/orders/page.tsx
npx tsc --noEmit   # clean
# re-navigated /orders → confirmed FiltersBar now stays mounted, only
#   the results area shows the error card

# typed in the search box mid-error, confirmed text+focus persisted
#   through the debounced re-fetch/re-fail
# clicked Retry, confirmed a new fetch attempt (console error count rose)
#   and FiltersBar's typed text was untouched afterward
# reverted getOrders' override to succeed; clicked Retry again
#   → recovered correctly (real EmptyState rendered)

# DEFAULT_FAIL_RATE = 1 (global): navigated / → confirmed all 6 sections
#   fail cleanly with matched heights throughout (no regression from the
#   h-full fix on standalone, non-paired sections)
# DEFAULT_FAIL_RATE = 0: clicked each of the 6 sections' own Retry button
#   individually, confirmed each recovers only on its own click, full
#   dashboard matches original state after all 6 clicked

# resized to 375px, re-navigated with getTopProducts forced to fail
#   → confirmed mobile (single-column, no stretch-pairing possible)
#   already rendered correctly, no changes needed there

npm run build && npm run lint && npm test   # all clean
rm -rf .playwright-mcp
pkill -9 -f "next-server"; pkill -9 -f "next dev"

# reverted lib/api/analytics.ts and lib/api/client.ts's DEFAULT_FAIL_RATE
# fully — confirmed via git diff; DEFAULT_FAIL_RATE was then independently
# set back to 0.5 by the user in their own IDE, left as-is
```

**How this moves the build forward:** two real bugs fixed — one purely visual (a missing `h-full`/`justify-center` on a shared fallback component, now correctly sized in every context that uses it), one architectural (an error-isolation gap that exactly mirrored a loading-isolation bug already fixed once before, now closed the same way with the same shared component). Both were found by actually forcing and observing failures end to end, not by reading the code and assuming it was fine — consistent with this session's established discipline, and `SectionBoundary` is now confirmed to correctly protect both the loading *and* the error case, on both pages, not just the page it was originally built for.

## Phase 7 — Performance Pass (steps 44–49b)

**What was done:** a real audit against the actual code, not a speculative pass adding memoization "just in case" — went through every client component and hook, `app/page.tsx` and `app/orders/[id]/page.tsx`'s fetch structure, and `package.json`, checking each one against a concrete question rather than a checklist. Found and fixed one real issue; everything else was already correct, and that's recorded too — a "nothing to fix here, and here's why" is as much a decision as a fix.

**44–45. `useMemo`/`useCallback` audit — nothing added.** Every chart component (`RevenueChart`, `OrdersChart`, `StatusDonut`) receives its data pre-shaped from a Server Component and renders it straight through — there's no derived computation happening client-side to memoize. `StatusDonut`'s `chartConfig` is already a module-level constant (built once at import time, not per render), same as `FiltersBar`'s `STATUS_OPTIONS`. `OrderRow` was already wrapped in `React.memo` with a comment explaining why it doesn't also need `useCallback` for its own click handler (nothing downstream is memoized to protect). `useOrderFiltersUrl`'s `setFilters`/`setFilter`/`clearFilters` were already `useCallback`-wrapped from the date-range-filter work two sessions ago. Checked, not assumed — read every "use client" file in the repo (`grep -rln "use client"`) and every `useState`/`useEffect`/`useMemo`/`useCallback` call site (`grep -rn`) before concluding this.

**46. Duplicate API calls / unnecessary re-renders — none found.** Every dashboard section fetches a distinct, non-overlapping slice of data (confirmed by grepping every `await getX()` call site across `components/dashboard` and `components/orders`) — no two sections call the same function. `app/orders/[id]/page.tsx` already parallelizes `getCustomerById`/`getActivityForOrder` with `Promise.all` (both only depend on the order that already resolved), so there's no accidental waterfall there either.

**47. Lazy-loading — one real win, applied.** Measured first, via Next's own `.next/diagnostics/route-bundle-stats.json` after a production build: `react-day-picker` (pulled in by `Calendar`, used only by `DateRangeFilter`) was ~252KB uncompressed and present in the first-load JS of *both* `/orders` (1,314,644 bytes) and `/orders/[id]` (1,312,609 bytes) — a fifth of each route's bundle, for a popover most page loads never open. `/orders/[id]` doesn't even render `FiltersBar`; it was only there because Turbopack hoists modules shared between sibling routes into a common chunk.

Fixed by wrapping `DateRangeFilter` in `next/dynamic({ ssr: false })` inside `filters-bar.tsx`, with a `Skeleton` loading fallback sized to match the trigger's resting height (`h-8 w-full sm:w-44`, matching `FiltersBarSkeleton`'s own sizing) so there's no layout shift while the chunk downloads. `ssr: false` is safe here since `FiltersBar` is already `"use client"` — the popover has nothing to render before hydration regardless.

Verified, not assumed: rebuilt, and grepped every chunk in the fresh `firstLoadChunkPaths` list for the string `DayPicker`/`react-day-picker` — zero matches, confirming it's now a genuinely separate on-demand chunk rather than just reshuffled. Then a real Playwright MCP session against the production server: opened the popover (chunk loaded on click, calendar rendered both months correctly), picked a start day (Apply/Clear went from disabled to enabled, confirming the seed-then-complete flow from the earlier date-range work still works unchanged), picked an end day, clicked Apply, and confirmed the URL updated to `?from=2026-09-08&to=2026-09-15`. Also navigated straight to `/orders/[id]` to confirm it still loads correctly now that it no longer shares that chunk at all.

Nothing else was a real dynamic-import candidate: Recharts is already needed for the compact chart view itself (not just the expanded dialog), so lazy-loading it would just move the same unavoidable cost around rather than removing it — and `ExpandableChart`'s dialog content was already confirmed (this session's error-state work, and originally when the component was built) to not mount into the DOM until the dialog opens, so it isn't paying an eager cost either.

**48. Unused dependencies — audited, none removed.** Checked every entry in `package.json` against actual `grep -rn` import usage. `cn` (the package, not the Tailwind convention) is real and used — `lib/utils.ts` re-exports it, and every `components/ui/*` primitive imports `cn` from it; this is shadcn's Nova-preset convention, not leftover scaffolding. `shadcn` itself is never imported at runtime (it's the CLI, used via `npx shadcn add …`) — technically belongs in `devDependencies`, but that's exactly where `npx shadcn init` places it by default, and reclassifying it has zero effect on the shipped bundle, so left as-is rather than churn for its own sake. Every other dependency (`date-fns`, `lucide-react`, `recharts`, `react-day-picker`, `next-themes`, `tw-animate-css`, `@base-ui/react`, `class-variance-authority`) has confirmed real import sites.

**49b. Revisited the per-section Suspense architecture — no restructuring, and here's the reasoning.** The original concern (`learn.md`'s "Step 14, revised" entry) was about sections popping in at visibly different times reading as janky. The two things that would actually cause that have both already been independently fixed earlier this session, for unrelated reasons: skeleton sizing now matches real content almost exactly (the skeleton-vs-real audit), so a section resolving no longer causes a layout shift — it's a content swap within a stable box, not a jump. And `generateRandomDelay()`'s range is 1–1000ms (the user's own edit, down from the original 2000ms ceiling), so the spread between the fastest- and slowest-resolving section is now well under a second rather than up to two.

Re-confirmed with a fresh streaming check against the current code rather than assuming the old measurement still holds: `curl -s -o /tmp/dash.html -w "TTFB: %{time_starttransfer}s total: %{time_total}s\n" http://localhost:3000` → **TTFB 22ms, total 971ms** — consistent with one section landing right at the ~1000ms ceiling while the shell itself still flushes near-instantly. All six section labels (`Overview`, `Charts`, `Order status`, `Top products`, `Recent orders`, `Recent activity`) present in the streamed payload, confirming every section still streams independently rather than one slow fetch blocking the rest. No code change made — the architecture was already right, and the two things that could have made it feel wrong were both already resolved as side effects of other work, not because this check overlooked them.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean after the `next/dynamic` change; production server (`npm run start`) used for the bundle measurement and the Playwright walkthrough, dev server for the streaming re-check.

**Commands run:**
```
npm run build   # baseline, before the fix
python3 -c "import json; d = json.load(open('.next/diagnostics/route-bundle-stats.json')); ..."
# → /orders 1,314,644 bytes first-load JS, /orders/[id] 1,312,609 — both
#   include a ~252KB chunk containing DayPicker/react-day-picker

grep -rl "DayPicker\|react-day-picker" .next/static/chunks/*.js
# → exactly one chunk, confirmed present in both routes' firstLoadChunkPaths

# fixed: DateRangeFilter wrapped in next/dynamic({ ssr: false }) in filters-bar.tsx
npx tsc --noEmit && npm run lint   # clean
rm -rf .next && npm run build      # clean rebuild

python3 -c "... same route-bundle-stats.json check ..."
# → /orders 1,240,856 bytes (-73,788), /orders/[id] 1,236,610 (-75,999)
# → grep for DayPicker/react-day-picker across every route's
#   firstLoadChunkPaths: zero matches, any route

npm run start &
# Playwright MCP: navigate /orders → snapshot (Date range button present,
#   not stuck loading) → click it → snapshot (calendar mounted, both
#   months, Apply/Clear disabled) → click Sep 8 → click Sep 15 → click
#   Apply → URL became /orders?from=2026-09-08&to=2026-09-15
# navigate /orders/ord_0166 → loads correctly, no shared-chunk dependency

npm run dev &
curl -s -o /tmp/dash.html -w "TTFB: %{time_starttransfer}s total: %{time_total}s\n" http://localhost:3000
# → TTFB: 0.022049s   total: 0.970803s
grep -o 'Overview\|Recent orders\|Recent activity\|Order status\|Top products\|Charts' /tmp/dash.html | sort -u
# → all six present

npm test   # unaffected, all still pass
```

**How this moves the build forward:** a real, measured ~74KB reduction in first-load JS on both orders routes — not a speculative optimization, found by reading Next's own build diagnostics rather than guessing at what "felt heavy." Equally important, the audit confirmed the rest of the codebase's memoization, data-fetching, and dependency choices were already sound going into this phase — largely because they'd already been built with these questions in mind (`OrderRow`'s memo comment, the parallel `Promise.all` in order details, the shared single fetch in `ChartsSection`) rather than needing a separate cleanup pass now. Phase 8 (Accessibility) is next.

## Phase 8 — Accessibility Pass (step 50)

**What was done:** went through the table, filters, nav, and error UI with real keyboard-only navigation and screen-reader-relevant attributes, verified against the live DOM rather than inferred from the JSX — found and fixed four real gaps, one of them a genuine functional block, not a cosmetic one.

**1. `<th>` cells missing `scope="col"`.** Both ledger tables (`OrdersTable` via `StickyLedgerCell`, and `RecentOrdersList`'s plain `<th>`s) rendered header cells with no `scope` attribute — a screen reader reading a data cell has no programmatic link back to which column it's under, only sighted users get that from position. Fixed at the shared source (`StickyLedgerCell` now sets `scope={as === "th" ? "col" : undefined}`, invalid on `<td>` so gated on `as`) plus the three plain `<th>`s in `recent-orders-list.tsx` that don't go through that component. Confirmed via a fresh production build: `curl`'d both pages and counted `scope="col"` occurrences — 5 on `/orders` (all five columns), 4 on `/` (the recent-orders table's four columns), matching exactly.

**2. Active nav link had no `aria-current`.** `NavLinks` conveyed "you're here" only visually (a colored underline) — a screen reader user tabbing through had no equivalent signal. Added `aria-current={isActive ? "page" : undefined}`. Verified by focusing each link in turn via real Tab presses and reading `getAttribute('aria-current')` off `document.activeElement`: `null` on Dashboard while on `/orders`, `"page"` on Orders — matches the actual route.

**3. `SectionBoundary`'s error card had no live region.** When a section fails after the page has already loaded, the error message and Retry button appear with no announcement — a screen reader user not already focused there would never know. Added `role="alert"` to the fallback `Card`.

**4. The real one — chart SVGs had no accessible name.** `RevenueChart`, `OrdersChart`, and `StatusDonut` are bare Recharts SVGs with no `role`/`aria-label`; a screen reader encounters an unlabeled graphic (or, worse, wades through internal SVG text nodes in a confusing order). Added `role="img"` + a one-line `aria-label` to each `ChartContainer` call, sourced from the same title already visible beside each chart (`ExpandableChart`'s panel header) rather than inventing new copy.

**5. The real bug — arrow-key navigation inside the date-range Calendar did nothing at all, and it wasn't a Recharts-style "nice to have."** `role="grid"` + roving `tabindex` (one day at `tabindex="0"`, every other day at `-1`) is a promise to assistive tech that arrow keys move through the grid — WAI-ARIA's whole point of that pattern. Landing on "Today" via Tab and pressing `ArrowRight` did nothing; since roving tabindex means Tab skips straight past the rest of the grid to Clear/Apply, this meant **a keyboard-only user could not select any date other than today** — a full functional block, not a polish gap.

Traced it properly rather than guessing at a fix:
- A capture-phase `keydown` listener on `window` confirmed the event reached the correct button and had `defaultPrevented`/`stopPropagation` behavior consistent with react-day-picker's own `handleDayKeyDown` actually running (its source, read directly from `node_modules/react-day-picker/dist/esm/DayPicker.js`, calls `e.preventDefault(); e.stopPropagation(); moveFocus(...)` for arrow keys) — so the library's own handler genuinely fired.
- Confirmed real browser focus (`.matches(':focus')`, not just `document.activeElement` by inference) was on the correct button, and confirmed via React's fiber props (`__reactProps$...`) that `onFocus`/`onKeyDown`/`onBlur` were all genuinely wired to it — ruled out a prop-forwarding break through Base UI's `Button`/`useButton`.
- Tried the one lever the library exposes for this (`autoFocus` on `<Calendar>`, which only changes whether `useFocus`'s internal `focusedDay` state starts populated) — no change, ruling out the "state never initialized" theory.
- Root cause, found by reading `components/ui/calendar.tsx`'s `CalendarDayButton` directly: it creates `const ref = React.useRef<HTMLButtonElement>(null)` and an effect that calls `ref.current?.focus()` whenever `modifiers.focused` becomes true for that day — this is the *only* mechanism that moves real DOM focus to the day react-day-picker's `moveFocus` just targeted internally. But the generated component never attached `ref={ref}` to the `<Button>` it renders. `ref.current` was permanently `null`, so the whole "move focus to the new day" step was a silent no-op — react-day-picker's own state (`focusedDay`, the new roving `tabindex`) updated correctly every time, but nothing ever told the browser to actually move focus there. Tab still worked by coincidence (native browser tab-order following `tabIndex="0"`, unrelated to this ref), which is exactly why this stayed invisible until arrow keys were tested specifically. This is upstream shadcn scaffolding output (`npx shadcn add calendar`), not something introduced by earlier work on this component — the same class of gap as `PopoverContent`'s ring-vs-border fix from the original Calendar install, found the same way: by actually using the thing, not reading the code and assuming it matched the reference implementation.
- Fix: one line, `ref={ref}` added to the `<Button>` in `CalendarDayButton`, with a comment explaining why it matters (so the next person touching this file doesn't see an apparently-unused `ref` and "clean it up").

**Verification — a full keyboard-only range pick, no mouse at any point:** Tab to the trigger, Enter to open (focus correctly lands on "Go to the Previous Month", matching Base UI's own popover-open focus behavior — confirmed unaffected by the fix), Tab twice into the grid, landed on Today. `ArrowRight` → focus genuinely moved to the 19th (previously stuck on the 18th). Enter to set the range start, `ArrowRight` ×2 → landed on the 21st, Enter to set the end, Tab → Clear, Tab → Apply, Enter → URL became `/orders?from=2026-09-19&to=2026-09-21`. Every step read off the real DOM (`document.activeElement`, `getComputedStyle`), not inferred from a screenshot.

Also re-verified the existing Select (status filter) was already fully keyboard-operable end to end (Enter to open, ArrowDown to highlight, Enter to choose — URL updated to `?status=pending`), and took a real screenshot confirming the order-id link's focus ring is genuinely visible on screen, not just present in computed styles.

**Verification:** `npx tsc --noEmit`, `npm run lint` (one pre-existing, unrelated warning — `lib/api/client.ts`'s now-unused `DEFAULT_DELAY_MS`, left alone, not from this session's edits), `npm test` (29/29), `npm run build` all clean.

**Commands run:**
```
grep -rln "use client" app components hooks   # scoped the audit surface
grep -rn "outline\|:focus" app/globals.css     # confirmed the shadcn base
  # layer tints the native focus outline (outline-ring/50) rather than
  # stripping it — links/buttons keep a real, visible default ring

# fixed: scope="col" (StickyLedgerCell + recent-orders-list.tsx),
#        aria-current (nav-links.tsx), role="alert" (section-boundary.tsx),
#        role="img" + aria-label (three chart components)
npx tsc --noEmit   # clean

npm run dev &
# Playwright MCP, /orders: real Tab presses through the whole page,
#   reading document.activeElement + getComputedStyle(outlineStyle) at
#   each stop — confirmed reachable, confirmed visible focus
#   (screenshot: a real ring around "ord_0166")
# aria-current: Tab to Dashboard (null) then Orders (page) — matches route
# Select: Enter → ArrowDown → Enter → URL ?status=pending
# th scope: document.querySelectorAll('table th') → all 5 report scope=col

# Calendar arrow-key investigation:
window.addEventListener('keydown', ..., true)   # capture-phase spy
# → event reaches target, propagation stopped — handleDayKeyDown ran
el.matches(':focus')                             # confirmed real focus
el['__reactProps$...']                           # onFocus/onKeyDown present
# tried autoFocus on <Calendar> — no change, reverted
# read components/ui/calendar.tsx directly → found the unattached ref

# fixed: ref={ref} added to CalendarDayButton's <Button>
npx tsc --noEmit   # clean
# re-tested: ArrowRight from "Today" → focus moved to the 19th (was stuck)
# full keyboard-only flow: Tab → Enter → Tab×2 → ArrowRight → Enter →
#   ArrowRight×2 → Enter → Tab → Tab → Enter
#   → URL: /orders?from=2026-09-19&to=2026-09-21

npm run lint && npm test && rm -rf .next && npm run build   # all clean
rm -rf .playwright-mcp
pkill -f "next-server"; pkill -f "next dev"; pkill -f "next start"
```

**How this moves the build forward:** four real accessibility gaps closed, and one of them — the calendar's arrow-key navigation — was a genuine functional block for keyboard-only users, not a labeling nicety, found only because arrow-key navigation was actually tested rather than assumed to work from the presence of `role="grid"` and roving `tabindex` in the markup. The root-cause trace (capture-phase event spy → real-focus check → fiber-props check → the `autoFocus` red herring → the missing `ref`) is worth remembering as a template for "the markup looks right but the behavior doesn't happen" bugs generally: confirm the event fires, confirm it's not consumed early, then check whether anything downstream actually acts on the resulting state — in this case, nothing did, because the one line that would have was never written. Phase 9 (README) is next.

## Phase 8b — Task-PDF audit gaps (steps 50.1–50.4)

**What prompted it:** before writing the README, re-read `Frontend_Task1_Analytics_Dashboard.pdf` line by line and audited the build against every requirement in it — not from memory of what was built, but by actually exercising each one against a running production server.

**What already passed, verified rather than assumed:** all four required KPIs (revenue, orders, active customers, conversion rate) plus AOV; both charts; recent orders and system activity; the orders page's full set (search, status, date, pagination, details); per-section skeletons; error handling; responsive. On the Data & API side, `grep -rn "lib/data\|mock-.*\.json" app components hooks` returned nothing, which is the real check behind "don't hardcode data inside UI components" and "keep API calls, types and transformation separate" — no UI file imports a dataset. On Architecture & React, `useEffect` is used twice and both are justified, `useCallback` is in `useOrderFiltersUrl`, `React.memo` is on `OrderRow`, and Phase 7 already confirmed no duplicate fetches.

**Where the gaps were, all under one line of the PDF:** *"Handle API loading, errors, **empty responses**, and **unexpected data**."* Loading and errors were genuinely solid — they'd each had a whole phase. The other two words had never been tested at all. Four findings, each confirmed by forcing the condition and watching the result, then re-confirmed fixed the same way.

**50.1 — empty responses had no UI on the dashboard.** `EmptyState` existed and was good, but only `OrdersTable` used it. Forcing every dashboard fetch to return `[]` showed Top products as a bare heading with nothing beneath it, Recent orders as a `<thead>` with no rows, and Recent activity as an empty sliver of a card — three sections that look broken rather than empty. Fixed by reusing the existing shared component in all of them (plus `OrderStatusBreakdown`, whose empty case is `total === 0` rather than an empty array — the API always returns all five statuses, and Recharts draws no arcs at all when every value is 0, so the real render would have been a blank 160px square beside a legend of zeros).

One deliberate non-change: `SummaryCards` gets no empty state. With no orders it shows ৳0.00 / 0 / 0 / 0.0% — zeros are a correct and meaningful answer for a KPI, not an absence of one. Adding an empty state there would have been consistency for its own sake.

`EmptyState` gained one optional `className` prop for padding: its default `py-16` is sized for the full-width orders table and dwarfs a five-row dashboard panel. One prop, three real call sites, rather than a second component.

**50.2 — an empty series didn't just render badly, it crashed.** `RevenueChart` did `data[data.length - 1]` then read `lastPoint.date`, throwing `TypeError: Cannot read properties of undefined` on an empty array. `SectionBoundary` caught it, so the page survived — but it then displayed **"Couldn't load charts"**, reporting a *failure* for a fetch that had succeeded and returned nothing. That's exactly the distinction the PDF draws by listing errors and empty responses separately, and it's the worse kind of bug: the safety net made it look handled.

Fixed in two parts. `ChartsSection` owns the "what does empty mean here" decision (both charts read the same series, so they're empty together) and renders the panels with an empty state inside — header, meta and border unchanged, so the dashboard's shape doesn't shift between states. `RevenueChart` separately guards its own `ReferenceDot`, since `data` is an ordinary array prop and an empty array is a legitimate input for it regardless of caller. Switched to `data.at(-1)` rather than keeping the index access with a truthiness check: `.at()` is typed `RevenuePoint | undefined`, so the empty case is visible to the type checker instead of only at runtime (this project doesn't run `noUncheckedIndexedAccess`).

That put a third copy of the chart-panel header in the file (loaded, loading, empty), so it was extracted to `ChartPanelHeader` — the same third-call-site rule `formatShortDate` was extracted under, and it matters more than usual here: the skeleton audit had already found several placeholders that had silently drifted from the content they stood in for, and a duplicated header is precisely how that happens again.

**50.3 — the real one: a hand-edited date param took down the whole orders page.** `/orders?from=banana` → `RangeError: Invalid time value`, thrown by date-fns' `format()` on an Invalid Date inside `DateRangeFilter`'s trigger label → the route-level `error.tsx` replaced the entire page, FiltersBar included. And it was unrecoverable: the bad param stays in the URL, so Retry re-renders and re-throws forever. A user reaching that URL from a stale bookmark or a shared link has no way out but editing the address bar.

`parseFilters` already validated `status` against the closed enum and `pageSize` against the offered options — the date params were the one unguarded input, and the comment there explained why: `<input type="date">` can only produce well-formed values. That reasoning was true when written and silently stopped being true when the Calendar replaced that input two phases earlier; it was never true of URLs people type or share. A stale "why this is safe" comment is more dangerous than no comment, so the replacement explicitly records that it was wrong and why, rather than quietly deleting it.

Fixed by extracting the safe parser `DateRangeFilter` already had into `lib/date-params.ts`, shared by all three readers of these params: server-side `parseFilters`, the `useOrderFiltersUrl` hook, and the picker itself. The hook is the important one — it's where the URL becomes app state, so a malformed value now stops being malformed at that line rather than at whichever consumer touches it first, exactly mirroring how an unknown status already falls back to `"all"`. An unusable date is dropped (treated as no filter) rather than applied, which also avoids the misleading alternative: unvalidated, `new Date("banana")` made every comparison false and filtered *every* order out, so the page would have said "No orders match your filters" about a filter the user never set.

The shared parser keeps both of the original's checks, and the comment now says why both are needed: the `yyyy-MM-dd` pattern alone accepts `2026-13-45`, and `Date.parse` alone accepts plenty this app never writes (`"Dec 2026"`, full ISO timestamps) which would then round-trip into the URL in a shape the picker can't read back. It also keeps the midday-not-midnight parse — a bare `yyyy-MM-dd` parses as UTC, so midnight shifts back a day in any timezone west of UTC, which matters for a reviewer opening the deployed link from the US.

**50.4 — no `not-found.tsx`.** `notFound()` was called for an unresolvable order (and for an unresolvable customer), but with no not-found boundary anywhere the app fell through to Next.js's own default 404: unstyled system font, no explanation, no way back. The root layout still rendered, so the header was there, which arguably made it worse — the one screen in the app that looked unfinished, sitting inside otherwise-finished chrome. Added a single global `app/not-found.tsx` rather than a per-route one: Next.js walks up to the nearest boundary, so one file covers both the bad-order-id case and genuinely unknown URLs, and the copy is honest for either. The two links out are the actual point — "not found" with no exit is a dead end, and this is a screen a user can reach without doing anything wrong.

**One honest non-fix, recorded rather than hidden:** `/orders/ord_9999` returns HTTP **200**, not 404. `loading.tsx` on that route creates a Suspense boundary, so the shell (and its status line) flushes before the page's own fetch resolves and calls `notFound()`. Making it a true 404 means giving up streaming on that route — a real TTFB and loading-skeleton benefit — to fix a status code no user sees, and the rendered result is correct either way. Left as-is deliberately; noting it because "we never checked" and "we checked and chose this" are different things.

**Verification:** every fix confirmed the same way it was found — forced the condition against a production build and looked. Empty responses: all five sections render their empty state, no crash, no false error card. Bad date param: page renders completely, filters intact, trigger back to its neutral "Date range" label, orders listed. Unknown order: styled 404 with both links. Then reverted every forced-empty patch and re-confirmed the normal dashboard renders identically, chart endpoint dot included. `git diff --stat lib/api/` empty afterwards, so no test scaffolding survived. `tsc --noEmit`, `npm run lint` (one pre-existing unrelated warning), `npm test` 29/29, `npm run build` all clean.

**Commands run:**
```
# audit
grep -rn "lib/data\|mock-.*\.json" app components hooks   # → nothing in UI
git remote -v && git log origin/main --oneline -1          # repo pushed, in sync
find app -type f -name "*.tsx"                             # → no not-found.tsx

# forced-empty test (temporary patches to lib/api/*, reverted after)
npm run build && npm run start &
curl -s http://localhost:3000 ... ; grep -i error /tmp/empty-test.log
# → ⨯ TypeError: Cannot read properties of undefined (reading 'date')
# Playwright: full-page screenshot → 3 sections visibly blank,
#   charts panel showing a false "Couldn't load charts"

curl "http://localhost:3000/orders?from=banana"
# → page renders, but console: RangeError: Invalid time value
#   → whole route replaced by error.tsx, FiltersBar gone, Retry can't recover
curl "http://localhost:3000/orders/ord_9999"
# → HTTP 200, Next.js default unstyled 404

# fixes, then re-verified the same way
npx tsc --noEmit && npm run lint && npm test && npm run build   # clean
# Playwright, forced-empty build: all 5 sections show proper empty states
# Playwright, real build: ?from=banana renders full page, filters intact
#                        /orders/ord_9999 → styled 404 with two links out
#                        dashboard unchanged vs before (endpoint dot present)
git diff --stat lib/api/    # empty — no scaffolding left behind
rm -rf .playwright-mcp; pkill -f "next-server"
```

**How this moves the build forward:** every line of the task PDF is now verifiably covered, and the gaps it surfaced were all in the same blind spot — the two words in one requirement (`empty responses`, `unexpected data`) that had never been exercised, versus loading and errors which had each had a dedicated phase. Worth generalising: the requirements that get tested are the ones with an obvious way to trigger them, and the ones that quietly rot are those needing a condition you have to manufacture. The `RevenueChart` case is the sharpest example — an error boundary caught the crash and printed a confident, wrong explanation, so from the outside it looked like handled behaviour rather than a bug. Phase 9 (README) is next, and it now has a genuine story to tell about why there's no `useMemo` in the codebase: all derived data is computed server-side in `lib/api/`, so there is nothing client-side to memoize, and adding one would violate the PDF's own "not unnecessarily" clause.

## Phase 8b follow-up — responsive/performance/accessibility pass on the audit fixes

**What prompted it:** requested explicitly, before moving to the README — a targeted re-audit of the four fixes just made (empty states, the chart crash guard, date-param validation, `not-found.tsx`), on the same three axes every other visual phase has been checked against, rather than assuming they inherited correctness from the components they reused.

**Found one real bug, in code that hadn't existed an hour earlier.** `app/not-found.tsx` renders its two actions as `<Button render={<Link .../>}>` — Base UI's documented pattern for styling a link like a button. But `Button`'s own `nativeButton` prop defaults to `true`, and nothing here overrode it, so Base UI assumed it was still going to render a `<button>` even though the actual output is an `<a>`. Confirmed via the browser console, not just by reading the type: two dev-mode errors on every load of the 404 page — *"A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true... impact forms and accessibility."* This wasn't cosmetic — `useButton`'s internal keyboard-activation logic branches on `isNativeButton`, so the mislabeling could affect how Base UI's own Space/Enter handling treats the element, on top of the console noise. Fixed with `nativeButton={false}` on both, plus a comment explaining why Base UI can't infer this on its own (it decides before it has any DOM node to check). Re-verified: 0 console errors, both render as genuine `<a href>` elements, and a full keyboard round-trip (focus the link, press Enter) actually navigates to `/orders`.

**Responsive:** screenshotted the empty dashboard (all 5 sections + both chart panels) at 375px, 768px, and 1440px. Clean at every width — single-column stacking on mobile/tablet with no overflow, and at desktop the empty-state icon+text stays centered and doesn't look lost even in the widest panels (Top products at 8/12, Recent orders at 7/12). `not-found.tsx` checked at 375px: the two-button row fits without wrapping, card doesn't overflow. Confirmed the pre-existing `OrdersTable` empty state (untouched by this round, but now sharing the `className`-extended `EmptyState`) still renders identically — no regression from the shared component's new prop.

**Performance:** compared first-load JS before/after via the same `.next/diagnostics/route-bundle-stats.json` check Phase 7 used. All four routes grew by ~1.5–2.7KB uncompressed (`/`: +2,201 · `/orders`: +2,740 · `/orders/[id]`: +2,167 · `/_not-found`: +1,559) — `EmptyState` (a Client Component) now reaching three more Server Component call sites it didn't before, plus six new lucide icons. Expected and negligible next to Phase 7's ~74KB win; not worth chasing further. No new re-render or duplicate-fetch surface: every changed component is still an async Server Component executing once per request, so there's nothing for `useMemo`/`useCallback` to protect here — consistent with the Phase 7 finding that this codebase's server-side data shape leaves nothing client-side to memoize. Also confirmed `EmptyChartPanel` correctly omits `ExpandableChart`'s expand button (nothing to expand when there's no data) — checked directly in the rendered screenshot, not assumed from the code.

**Accessibility:** every new icon (`Package`, `PackageOpen`, `History`, `ChartPie`, `ChartSpline`, `FileQuestion`) is `aria-hidden`, matching the convention already used everywhere else in the app — checked with a grep across all five changed files, not spot-checked. `not-found.tsx` intentionally has no `<h1>`, matching the existing convention in `app/error.tsx`/`app/orders/error.tsx`/`app/orders/[id]/error.tsx` — none of them carry a heading, since they're transient state cards rather than routes with their own content hierarchy, and a not-found page in particular can't know which route it's replacing to emit a sensible route-specific `sr-only` one. The `nativeButton` fix above is this section's real finding; separately confirmed a visible focus ring renders on the "Back to orders" link (screenshotted, not just read from computed styles) and that Tab reaches it in document order.

**Verification:** `npx tsc --noEmit`, `npm run lint` (same one pre-existing unrelated warning), `npm test` (29/29), `npm run build` all clean after the `nativeButton` fix.

**Commands run:**
```
npm run build
python3 -c "... route-bundle-stats.json diff vs Phase 7's recorded numbers ..."
# → all 4 routes +1.5–2.7KB uncompressed, EmptyState + 6 new icons

grep -rln "aria-hidden" components/dashboard/{recent-orders-list,recent-activity-feed,
  top-products,order-status-breakdown,charts-section}.tsx   # all 5, confirmed

npm run dev &
# Playwright MCP, /orders/ord_9999:
browser_console_messages(level: "error")
# → 2 Base UI dev warnings: "expected a native <button>"

# fixed: nativeButton={false} on both Button render={<Link/>} calls
browser_console_messages(level: "error")   # → 0
document.querySelectorAll('a')             # → real <a href> elements, correct hrefs
link.focus(); page.keyboard.press('Enter') # → navigated to /orders

# forced-empty build (temporary, reverted after):
browser_resize(375x700) / (768x1000) / (1440x1000)
browser_take_screenshot(fullPage: true)   # → clean at all 3 widths
git diff --stat lib/api/                  # empty — reverted correctly

npx tsc --noEmit && npm run lint && npm test && npm run build   # all clean
rm -rf .playwright-mcp; pkill -f "next-server"; pkill -f "next dev"
```

**How this moves the build forward:** the audit paid for itself — a genuine accessibility/correctness bug (`nativeButton`) shipped in code that was less than an hour old, in a component built specifically *because* the accessibility pass had flagged the app's one unstyled screen. The lesson isn't really about Base UI specifically; it's that a component built to fix one gap can introduce a different one, and the only way to know is to check the new surface with the same rigor as the old one, not assume it inherits correctness from the primitives it's made of. A second, smaller find: `learn.md` itself had a structural bug from earlier in this session — the Error-state audit section's closing paragraph had been dropped mid-edit and ended up duplicated at the file's true end, after two later phases. Fixed by moving it back to the right place and removing the orphaned copy, since a mis-ordered decision log is exactly the kind of thing this file exists to prevent.

## Phase 9 — README (step 51)

**What was done:** wrote `README.md` from scratch, replacing the `create-next-app` boilerplate. Covers all 7 things the task PDF asks a README to cover — setup, architecture/folder structure, API/data-fetching approach, Server vs Client Components, performance decisions, testing, key implementation notes — plus an AI-assisted development section, per the user's explicit request kept deliberately short and scannable rather than a condensed version of this file.

**Approach:** every claim in it was checked against the actual codebase rather than written from memory of what was built — `SEARCH_DEBOUNCE_MS` (400ms), the ~74KB lazy-load win (from Phase 7's own measured number), which hooks use `useCallback`/`React.memo` (grepped, not assumed), and the exact currency example (৳45,59,700.00, taken from an earlier real screenshot). The three AI-assisted-development bullet points are the three real bugs actually found and fixed this session (the `RevenueChart` empty-data crash, the unrecoverable date-param crash, and the `Calendar` ref-wiring bug) — chosen because they're concrete, verifiable, and answer the task PDF's own framing ("understand the generated code," not just used it) better than a generic statement would.

**Scope decision:** `plan.md`'s README outline was used as the section list, not as prose to copy — `plan.md` and `learn.md` are the working documents (reasoning, rejected alternatives, full command traces); the README is the reader-facing summary, so it states each decision and its one-line why, then links to `learn.md` for anyone who wants the full trace, rather than repeating it.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all clean (the README itself has no code to break, but this confirms nothing else was disturbed while writing it).

**Commands run:**
```
grep -n "SEARCH_DEBOUNCE_MS" components/orders/filters-bar.tsx   # → 400
cat package.json                                                  # exact versions for the stack line
find app components hooks lib -type f \( -name "*.ts" -o -name "*.tsx" \) | sort
# → confirmed the folder-structure section against the real tree, not memory

npx tsc --noEmit && npm run lint && npm test && npm run build   # all clean
```

**How this moves the build forward:** all 7 of the task PDF's submission requirements now have a real answer in the repo. What's left is Phase 10 — a final verification pass (build/lint/test/Lighthouse), then GitHub push and Vercel deploy, both of which pause for explicit confirmation.

## Lighthouse audit (step 54, run early at the user's request)

**What was done:** ran Lighthouse against the production build (`npm run build && npm run start`), both via Chrome DevTools MCP (accessibility/best-practices/SEO/agentic-browsing — that tool splits performance out into a separate trace-based analysis) and the `lighthouse` CLI directly via `npx` (the classic 4-category scorecard, which is what step 54 and the task PDF actually ask for).

**Desktop results — all 3 routes:**

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 99 | 100 | 100 | 100 |
| `/orders` | 100 | 100 | 100 | 100 |
| `/orders/[id]` | 100 | 100 | 100 | 100 |

Dashboard's 1 missing performance point: LCP 0.97/1, driven by `bf-cache` (page can't enter back/forward cache) and some unused/legacy JS in shared framework chunks. Checked `bf-cache`'s own failure reason rather than assuming it was fixable: Lighthouse itself labels it **"Not actionable"** — caused by `Cache-Control: no-store`, which `export const dynamic = "force-dynamic"` sets deliberately (the dashboard simulates live analytics data, so it was never meant to be cached — a decision made and documented back at Phase 2). Nothing here is a real gap; a 99 next to two 100s is already about as good as this architecture gets.

**Mobile (Lighthouse's default preset — simulated slow-4G + 4x CPU throttle) told a different, worth-investigating story:** `/` dropped to **79** (LCP 3.7s, TBT 420ms), while `/orders` only dropped to **94** (LCP 3.0s, TBT 50ms). A 15-point gap between two routes under the identical throttle profile is a real signal, not noise — chased it rather than reporting the number and moving on.

`bootup-time`'s own per-script breakdown pointed at one 229KB chunk responsible for 3,982ms of the dashboard's total script time under 4x throttle (confirmed via `grep` that the chunk contains `react-dom`). Cross-checked against `/orders`, which shares that same React/Next runtime chunk but has no charts and only shows 50ms of TBT — isolating the actual cost to chart rendering (Recharts computing three chart instances' scales/paths/SVG on mount), not the framework runtime itself.

**Why this isn't a fix, and the reasoning is already on record:** Phase 7's own performance audit considered lazy-loading Recharts and explicitly rejected it — the charts are above-the-fold, required content (not a deferred interaction like the date picker, which *was* lazy-loaded), so deferring the import would only move the same unavoidable rendering cost to right after first paint, likely trading a slow LCP for a layout-shifting one. Recharts itself is a locked technology choice (`plan.md`: "Charts — Recharts — lightweight, composable, plays well with React server/client boundaries"), and the task PDF requires "revenue and orders charts" as a core feature, not an optional one. A 4x CPU throttle is also a deliberately pessimistic simulation — real mid-range hardware isn't 4x slower than a dev machine — so 420ms TBT under that profile is "needs improvement" by Google's own thresholds (200–600ms), not "poor" (>600ms).

**What went in the README:** the desktop table (genuinely excellent, worth showing) plus one sentence naming the mobile finding and its cause, rather than either hiding it or writing paragraphs about it — the full investigation lives here instead, matching the project's established README-is-short/learn.md-has-the-trace pattern.

**Verification:** all three routes' JSON reports read back with `python3`/`json` rather than eyeballing the HTML reports, so every number quoted above is a direct read of Lighthouse's own output.

**Commands run:**
```
npm run build && npm run start &

# accessibility/best-practices/SEO/agentic-browsing, via Chrome DevTools MCP
lighthouse_audit(pageId, device: "desktop", mode: "navigation")
# → 100/100/100/100 on /

# full 4-category scorecard, via CLI (what step 54 actually wants)
npx lighthouse http://localhost:3000 --output=json --output=html \
  --output-path=/tmp/lighthouse-reports/dashboard \
  --chrome-flags="--headless=new --no-sandbox" --preset=desktop --quiet
python3 -c "... read categories + LCP/FCP/TBT/CLS from the JSON report ..."
# → performance 99, accessibility/best-practices/seo 100

npx lighthouse http://localhost:3000/orders ...           # → 100/100/100/100
npx lighthouse http://localhost:3000/orders/ord_0166 ...  # → 100/100/100/100

# mobile preset (no --preset=desktop → Lighthouse's default mobile,
# simulated slow-4G + 4x CPU throttle)
npx lighthouse http://localhost:3000 --output=json ...        # → performance 79
npx lighthouse http://localhost:3000/orders --output=json ... # → performance 94

python3 -c "... print every performance audit scoring < 0.9 ..."
# → bootup-time, mainthread-work-breakdown, TBT, LCP, max-potential-fid

python3 -c "... bootup-time details, sorted by total ms ..."
# → one 229KB chunk: 3982ms total / 3699ms scripting
grep -o "react-dom" .next/static/chunks/27t_qfc-3_lzs.js   # confirmed contents

python3 -c "... same bf-cache audit details ..."
# → failure reason: MainResourceHasCacheControlNoStore, labeled "Not actionable"

rm -rf /tmp/lighthouse-reports /tmp/chrome-devtools-mcp-*
pkill -f "next-server"; pkill -f "next start"
```

**How this moves the build forward:** a genuinely strong result recorded honestly — desktop is excellent everywhere, and the one real weak spot (mobile chart rendering under aggressive throttle) was traced to its actual cause and cross-checked against a control route (`/orders`) rather than reported as an unexplained number. Confirms Phase 7's earlier call not to lazy-load Recharts was the right one: the cost is real, understood, and inherent to shipping actual charts, not something a different loading strategy would have avoided. Phase 10's remaining items (a full end-to-end manual pass, then GitHub/Vercel, both pausing for confirmation) are what's left before submission.

## Phase 10, steps 52–54 — formal verification + Lighthouse re-run

**What was done:** steps 52–54 run together as the user asked, properly and in order this time (54 had been run early, ahead of 52/53, at the user's own request last time).

**Step 52.** Clean build (`npm run build`), clean `tsc --noEmit`, 29/29 tests, and lint down to the same single pre-existing warning (`lib/api/client.ts`'s unused `DEFAULT_DELAY_MS`, from the user's own concurrent edit, unrelated to any of this project's own work) — nothing new surfaced.

**Step 53 — confirmed the build is actually minified, not just assumed from tooling defaults.** Read a real chunk from `.next/static/chunks/`: single-letter identifiers, no whitespace, one dense line per module — 156KB packed into 21 lines. CSS: 2 lines, 60KB total across the whole app — confirms Tailwind's purge is working too, not just minification (an unpurged Tailwind v4 default is several MB, not 60KB).

**Step 54, re-run.** Same routes, same method as the earlier pass. Desktop came back **100/100/100/100 on all three routes** this time — the dashboard's earlier 99 (a borderline LCP audit) resolved on its own, consistent with the mock API's randomized 1–1000ms per-fetch delay making LCP timing slightly variable run to run, not a real regression or fix. Re-ran mobile too, specifically to check whether the dashboard/orders gap from the first pass was a one-off or a stable pattern: **dashboard 80 / orders 99** this run, versus **79 / 94** the first time — the specific numbers move a little, but the gap (dashboard notably behind orders, both routes' non-performance categories still 100) holds across both runs. That stability is what actually matters here, more than either individual number — it confirms the earlier finding (Recharts' rendering cost under throttle) was a real, repeatable pattern rather than a one-time fluke worth re-investigating.

Updated the README's table from 99/100/100/100 to the cleaner 100/100/100/100, and loosened the mobile sentence from exact numbers (79/94) to a range (~79–80 / 94–99) so it doesn't read as a single precise measurement that a re-run could contradict.

**Verification:** both Lighthouse runs' JSON reports read back programmatically, same as the first pass — not eyeballed.

**Commands run:**
```
rm -rf .next && npm run build     # clean
npm run lint                       # 1 pre-existing warning, unrelated
npx tsc --noEmit                   # clean
npm test                           # 29/29

# minification spot-check
find .next/static/chunks -iname "*.js" -not -iname "turbopack*" | head -1 | xargs wc -c -l
head -c 300 <that file>            # single-letter identifiers, no whitespace
find .next/static -iname "*.css" -exec ls -la {} \;   # 60KB total
head -c 300 <the .css file>        # one dense line, no whitespace

npm run start &
npx lighthouse http://localhost:3000 --preset=desktop ...          # → 100/100/100/100
npx lighthouse http://localhost:3000/orders --preset=desktop ...   # → 100/100/100/100
npx lighthouse http://localhost:3000/orders/ord_0166 --preset=desktop ... # → 100/100/100/100
npx lighthouse http://localhost:3000 ...           # mobile → performance 80
npx lighthouse http://localhost:3000/orders ...    # mobile → performance 99

rm -rf /tmp/lighthouse-reports
pkill -f "next-server"; pkill -f "next start"
```

**How this moves the build forward:** Phase 10's build/lint/test/minification/Lighthouse checks are now done properly, in order, not just piecemeal — and re-running Lighthouse specifically confirmed the earlier mobile finding was a stable pattern rather than noise worth re-chasing. What's left in Phase 10 is the manual end-to-end pass (step 55), then GitHub push and Vercel deploy, both of which pause for explicit confirmation before anything touches a shared system.

## Phase 10, step 55 — manual end-to-end pass

**What was done:** the user asked whether this step needed them to do it manually or whether it could be done directly — it can, since nothing in it touches a shared system (only steps 56/57, GitHub push and Vercel deploy, are gated on explicit confirmation). Ran all 7 items against the production build via real Playwright interaction, not code inspection — each one was something that had been individually verified at some earlier point in the build, but never all together, end to end, in one continuous pass, which is what this step actually asks for.

- **Dashboard load** — clean navigation, 0 console errors, full-page screenshot confirms all 6 sections render with real data.
- **Filters + URL sync** — typed a search term (debounced correctly to `?q=Imran`), added a status filter via keyboard (`Enter` → `ArrowDown` → `Enter`), URL became `?q=Imran&status=pending` with both filters composed correctly (confirms the `setFilters` batching fix from earlier in the build still holds). Loaded that exact URL fresh and confirmed both inputs and the table restore correctly from it — not just that the URL updates when you interact, but that it's genuinely the source of truth in both directions.
- **Pagination** — `Next` advanced to `?page=2` with a different first row; changing "Rows per page" to 20 correctly reset to page 1 (dropped the `page` param) and rendered exactly 20 rows.
- **Order details** — `/orders/ord_0166` renders items, timeline, and customer sections correctly, 0 console errors.
- **Empty state** — a nonsense search (`?q=zzznomatch`) shows "No orders match your filters"; clicking "Clear filters" correctly resets the URL and restores results.
- **Forced error + retry** — temporarily set `DEFAULT_FAIL_RATE = 1` in `lib/api/client.ts` and rebuilt (this only takes effect in the production build the e2e pass is meant to test, so a rebuild was necessary, not optional). Dashboard: all 6 sections fail independently with correctly-sized error cards (screenshotted — matches the Phase 8b `SectionBoundary` height fix). Orders: `FiltersBar` stays mounted with only the results area showing the error card; typed into the search box while it was erroring and confirmed the text stuck; clicked Retry and confirmed a genuine new fetch attempt (console error count rose 2→4, not just a re-render) without touching the typed text. Reverted the fail rate, rebuilt again, and confirmed the same page recovers cleanly with no error.
- **Responsive check** — screenshotted the dashboard at 375px (mobile) and 1024px (the `lg` breakpoint, where the desktop grid — 5 KPI tiles, side-by-side charts, 4/8 and 7/5 splits — kicks in) and the orders page at 375px (filters stack one per row, table scrolls horizontally with a visible scrollbar and the sticky Order column staying pinned). All clean, no overflow.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all clean afterward; `git diff lib/api/client.ts` confirmed empty (the forced-fail-rate edit was fully reverted, not left in the tree).

**Commands run:**
```
npm run build && npm run start &

# dashboard load, filters, pagination, order details, empty state —
# all via Playwright MCP navigation/evaluate/type against the running
# production server; see the conversation for the individual checks

# forced error + retry
cp lib/api/client.ts /tmp/client.bak
sed -i 's/DEFAULT_FAIL_RATE = 0/DEFAULT_FAIL_RATE = 1/' lib/api/client.ts
rm -rf .next && npm run build && npm run start &
# ... Playwright: dashboard (all 6 sections fail), orders (FiltersBar
#     survives, typed text persists, Retry re-fetches) ...
cp /tmp/client.bak lib/api/client.ts
rm -rf .next && npm run build && npm run start &
# ... confirmed clean recovery ...

# responsive
browser_resize(375x800) / (1024x900) — dashboard and orders, screenshotted

git diff lib/api/client.ts                      # empty
npx tsc --noEmit && npm run lint && npm test && npm run build   # all clean
pkill -f "next-server"; pkill -f "next start"; rm -rf .playwright-mcp
```

**How this moves the build forward:** every checklist item in step 55 has now been exercised directly, not inferred from having tested pieces of it separately across earlier phases — including the one item (retry under a forced global failure) that genuinely needed a rebuild to test honestly, since the mock delay/fail-rate logic only takes effect in whichever build is actually running. Phase 10's only remaining items are steps 56 and 57 — GitHub push and Vercel deploy — both of which wait for the user's explicit go-ahead before touching anything outside this machine.

## Naming the app: "Khata"

**What was done:** `.interface-design/system.md` had flagged "Khata" (খাতা — ledger/account book) as the design specimen's working name back in Phase 2b, explicitly left as "an open question for the user, not decided." Asked directly, offered a few more options in the same register (Bahi, Hisab, plain "Ledger"), and the user picked Khata — the name the whole visual direction had quietly been built around already (ledger-stamp status indicators, red-ink negative amounts, lakh-grouped currency).

Adopted it everywhere a name actually belongs, not just the metadata:
- `app/layout.tsx` — page title and description
- `components/shared/app-header.tsx` — the header had only ever shown an icon, no visible product name; added the wordmark next to it (icon keeps the accent color, text sits in `text-foreground` so the two don't compete for attention)
- `package.json`'s `name` — then ran `npm install` to sync `package-lock.json`'s two `name` fields rather than leaving them pointing at the old `"app"` until the next unrelated install silently fixed it
- `README.md`'s title, with one line explaining what the name means for a reader with no Bengali context
- `.interface-design/system.md`'s own "Naming" section, resolving the open question it had recorded rather than leaving a stale "not yet decided" note next to a codebase that had, in fact, decided

**Verification:** screenshotted the header at desktop and mobile widths — wordmark doesn't crowd the nav links or wrap awkwardly at either. `npx tsc --noEmit`, `npm run lint` (same one pre-existing unrelated warning), `npm test` (29/29 — no test references the old title or the header's markup), `npm run build` all clean.

**Commands run:**
```
npx tsc --noEmit && npm run lint && npm test   # clean
npm run dev &
# Playwright: page title → "Khata"; screenshot header at 1024px and 375px
rm -rf .playwright-mcp; pkill -f "next dev"
rm -rf .next && npm run build   # clean

npm install   # re-syncs package-lock.json's name field to "khata"
git diff --stat package-lock.json   # only the 2 name fields changed
```

**How this moves the build forward:** a real product name applied consistently, not left as a to-do buried in a design-process file — the kind of loose end that's easy to leave unresolved right up until submission. Nothing left in the codebase still calls this the generic "Production Analytics Dashboard."

## A real custom icon, not a lucide stand-in

**What was done:** the user wanted a genuinely custom brand icon for the header/favicon, not another stock lucide icon (the header had been using `NotebookText` as a placeholder). Wrote a prompt for ChatGPT's image generator grounded in the actual physical object ("a real Bangladeshi bahi-khata — cloth-bound cover, hand-stitched spine, ruled pages") rather than an abstract "ledger icon" brief, specifically to avoid the generic-AI-icon look. The user generated a composite sheet of concepts and asked for each one extracted from the single PNG — cropped all 10 distinct panels out with PIL, saved them to a gitignored `.brand-drafts/` folder at the repo root (not `/tmp`, so they could actually be browsed in a file manager/VS Code, which the first attempt — pointing at a real `/tmp` path — didn't satisfy). The user picked one (a solid rounded-square app icon: a book with a folded top-right corner, a ring-bound spine, cream on maroon) and asked for the drafts folder to be deleted entirely once decided.

**Turning a raster reference into a real, working icon** was the actual work, not just picking a favorite PNG. A flat image can't do what this needed — sit in the header at 20px and re-color live with the theme toggle, and work as a crisp favicon at 16px — so it had to become a hand-drawn SVG, not a traced/embedded image. Built it as a real design pass, not a one-shot: wrote the path by hand, rendered it next to the reference PNG side-by-side in a throwaway HTML page (served over `http://localhost`, since Playwright's `file://` access is blocked) and iterated twice — v1 was too narrow and cramped, v2 fixed proportions but had page-stack detail lines invisible (drawn in the same color as the background they sat on, a real bug caught by actually looking, not assumed correct because the code "should" have worked).

**The one real design finding, worth recording on its own:** rendered the icon at 16/20/24/32/64/128px side by side — the reference's four individual spine "rings" only read as a ring-binder at 64px and above; below that they blur into noise. Since the two real use cases (a 20px header icon, a 16px browser-tab favicon) are both below that threshold, kept the four rings only conceptually and simplified to one solid spine bar for the actual shipped mark — the fold-crease and page-stack line details were kept in the code since they add polish at larger renders (a PWA install prompt, an OS app switcher) and cost nothing where they're too small to see, rather than being special-cased away.

**Two colors, two contexts, one shared idea:**
- `components/shared/khata-mark.tsx` — the header version. Single `currentColor` fill (exactly how every lucide icon in this app is already used — `className="size-5 text-primary"`), so it re-colors correctly on every theme change for free, confirmed live by toggling dark mode and screenshotting (the mark visibly shifted from the light theme's muted maroon to the dark theme's brighter rose, matching the rest of the UI's accent). The fold-crease and page-line details are drawn in `var(--background)` rather than a second hardcoded color — they read as "cut into" the solid shape against whatever surface it sits on, correctly in both themes, without needing their own dark-mode variant.
- `public/icon-light.svg` / `public/icon-dark.svg` — the favicon. A browser tab icon can't read the page's live CSS, so these bake in each theme's exact `--primary`/`--primary-foreground` hex pair directly (already wired via the `prefers-color-scheme` media-query `<link>` tags from the earlier naming pass — no changes needed there, just new file contents).

**Also done while touching this area:** deleted `app/favicon.ico` (the Vercel default — this was the actual point of the exercise) and the five unused create-next-app scaffold SVGs in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — confirmed unreferenced anywhere in the codebase via `grep` before deleting, not assumed safe to remove.

**Verification:** screenshotted the header in both light and dark theme (live toggle, not two separate page loads) and both favicon SVGs rendered side by side at 128px — all four read correctly, matching their intended theme's palette. `npx tsc --noEmit`, `npm run lint` (same one pre-existing unrelated warning), `npm test` (29/29), `npm run build` all clean afterward.

**Commands run:**
```
# extracted the 10 concepts from the user's composite PNG
python3 -c "from PIL import Image; ... .crop(box) for each panel ..."
mkdir .brand-drafts && cp crops there   # then deleted entirely per instruction
rm -rf .brand-drafts

# icon redraw — iterative visual comparison against the reference crop
python3 -m http.server <port>   # file:// blocked in Playwright, serve over http instead
# 3 rounds: write SVG path -> browser_navigate -> screenshot -> compare -> adjust
# size test: rendered at 16/20/24/32/64/128px side by side
# -> found the 4-ring spine detail unreadable below 64px, simplified to 1 bar

grep -rn "file\.svg\|globe\.svg\|next\.svg\|vercel\.svg\|window\.svg" app components
# -> confirmed unused before deleting
rm app/favicon.ico public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg

npx tsc --noEmit && npm run lint && npm test && npm run build   # all clean
npm run start &
# Playwright: screenshot header light theme -> click [aria-label="Dark"] ->
#   screenshot again -> icon color visibly shifted, matching --primary
# separate http.server on public/: both favicon SVGs rendered side by side

pkill -f "next-server"; pkill -f "next start"; pkill -f "http.server"
rm -rf .playwright-mcp /tmp/khata-brand-crops /tmp/khata-icon-test
```

**How this moves the build forward:** a real, hand-built brand asset replaces both the leftover Vercel favicon and the lucide placeholder — the exact "not something generic" the user asked for, verified working in both themes rather than shipped on the assumption that `currentColor` would obviously just work. The size-legibility finding (simplify before 64px, not after) is worth remembering as a general icon-design lesson beyond this one asset: test the smallest real use size before finalizing a detailed reference, not after.

## Phase 11, step 58 — code-splitting Recharts off routes that never render it

**What was done:** a post-deployment audit (run against a real `next start` production build, then re-confirmed against the live Vercel deployment, not a code read) found that `/orders` and `/orders/[id]` — neither of which renders a single chart — were shipping the same ~421KB Recharts chunk the dashboard needs, because Turbopack had hoisted it into the shared chunk group. Confirmed directly: grepped the chunk for `recharts` (108 hits) and orders-page strings (zero), and grepped each route's own HTML for the chunk's filename before touching anything.

Fixed by wrapping the three components that actually import Recharts — `RevenueChart`, `OrdersChart` (`components/dashboard/charts-section.tsx`), `StatusDonut` (`components/dashboard/order-status-breakdown.tsx`) — in `next/dynamic`, mirroring the pattern `FiltersBar` already used for `DateRangeFilter`. One real difference from that precedent, checked against Next's own docs before writing anything: `ChartsSection`/`OrderStatusBreakdown` are Server Components (they `await` their own data), and `ssr: false` is not legal there — Next throws if you try. Left `ssr` unset (defaults to `true`), which is actually what's wanted here anyway: the dashboard's charts still need to appear in the initial server-rendered HTML, only the *routes that don't use them* should skip the chunk. `next/dynamic` code-splits regardless of the `ssr` value; `ssr: false` only controls whether the *using* route also renders it eagerly on the server, which was never the problem.

Each `dynamic()` call gets a `loading:` fallback sized to the real component's resting dimensions — `h-40 w-full` for the two line/area charts (the same value `ChartPanelSkeleton` already uses), `size-40 shrink-0 rounded-full` for the donut (matching `OrderStatusBreakdownSkeleton`). Noted in a comment why the taller "expanded" Dialog instance of each chart doesn't get its own differently-sized fallback: `next/dynamic`'s `loading` option doesn't receive the wrapped component's per-instance props, and in practice this doesn't matter — the compact instance on the same page load has already triggered the chunk fetch by the time anyone opens the Dialog, so the expanded instance's `loading` state is a fallback for a race that doesn't happen in normal use.

**Verification, not assumption** — rebuilt from scratch and re-measured, since the earlier audit's numbers came from a throwaway experiment that was reverted:
- Route payload totals (uncompressed, summing every `<script>` an actual page load references): `/` 1147KB → **631KB**, `/orders` 1324KB → **670KB**, `/orders/[id]` similarly down. Matches the audit's earlier measurement exactly.
- The ~330KB Recharts vendor chunk (found by grepping every chunk for `recharts` hit count, since the filename itself changes on every build) is present in `.next/static/chunks` but **not** referenced by name in any of the three routes' initial HTML — confirmed with a direct `grep -c <chunk-filename>` against each route's markup, all zero.
- `/`'s HTML still contains real `recharts-surface`/`recharts-wrapper` DOM markers and zero "No data for this period" empty-state text — the charts are still server-rendering actual data, not silently falling back to a skeleton or an empty state.
- `/orders`'s HTML has zero chart-related DOM markers (`recharts-surface`, `AreaChart`, `PieChart`) — nothing chart-shaped leaked onto a page that shouldn't have any.
- `npx tsc --noEmit`, `npm run lint` (same one pre-existing `DEFAULT_DELAY_MS` warning, unrelated), `npm test` (29/29), `npm run build` all clean.

**Commands run:**
```
npm run build   # clean, same route table as before

npx next start -p 3199 &
for u in / /orders /orders/ord_0023; do
  # sum byte size of every /_next/static/chunks/*.js referenced in that route's HTML
  curl -s "http://localhost:3199$u" | grep -oE '/_next/static/chunks/[^"]*\.js' | sort -u \
    | while read p; do stat -c%s ".next${p#/_next}"; done | awk '{s+=$1} END {print s/1024, "KB"}'
done
# -> /: 631KB, /orders: 670KB, /orders/ord_0023: 676KB

for f in .next/static/chunks/*.js; do
  grep -c "AreaChart\|PieChart" "$f"   # locate the recharts chunk by content, not guessed filename
done

RC=.next/static/chunks/<found-chunk>.js
for u in / /orders /orders/ord_0023; do
  curl -s "http://localhost:3199$u" | grep -c "$(basename $RC)"   # 0 on all three: not statically declared
done

curl -s http://localhost:3199/ | grep -oE 'recharts-surface|recharts-wrapper' | sort | uniq -c   # 3 each, SSR intact
curl -s http://localhost:3199/ | grep -c 'No data for this period'                                # 0, real data rendering
curl -s http://localhost:3199/orders | grep -oE 'recharts-surface|AreaChart|PieChart'              # empty, nothing leaked

npx tsc --noEmit && npm run lint && npm test   # all clean
pkill -f "next start -p 3199"
```

**How this moves the build forward:** closes the highest-impact item from the post-deployment audit backlog (`step.md` Phase 11) with a measured, not theorized, result — the same discipline the rest of the build already holds itself to. Leaves the README performance section's `react-day-picker` number without its Recharts counterpart for now, on purpose: that's a doc update, not code, and belongs with whichever step actually revisits the README rather than being slipped in here.

## Phase 11, step 59 — clamping out-of-range pages instead of slicing past the end

**What was done:** the post-deployment audit found two related bugs in `/orders`'s page param, both confirmed live against a production build before touching any code. `?page=999` showed "No orders match your filters" (with a *Clear filters* button) sitting right next to "Page 999 of 20" — the filters matched all 200 orders; only the requested page was out of range, so `getOrders`' `slice(start, start + pageSize)` ran past the end of the sorted array and returned zero rows, which `OrdersTable` then reported as a filter mismatch rather than a page mismatch. Separately, `?page=1.5` passed the existing `Number.isFinite(page) && page > 0` check in `parseFilters` and reached `getOrders` as a literal fraction — `(1.5 - 1) * 10 = 5`, so `slice(5, 15)` returned a real 10-row window straddling pages 1 and 2, one no Prev/Next click could ever produce.

Two separate, minimal fixes, one per sub-bug, kept apart because they're different kinds of invalid:
- `app/orders/page.tsx`'s `parseFilters`: `Number.isFinite(page)` → `Number.isInteger(page)`. A fractional page has no valid meaning at all — no UI control (the Pagination component's Prev/Next, or a page-size change) ever produces one — so it gets the exact same treatment `status`/`from`/`to` already get for malformed input: dropped, falling back to the default (page 1), not coerced via `Math.floor` into a page number nobody asked for.
- `lib/api/orders.ts`'s `getOrders`: a too-high-but-otherwise-valid integer (`?page=999`) is deliberately *not* rejected at the `parseFilters` boundary — the real page count only exists inside `getOrders`, once `total` and `pageSize` are both known. Restructured the existing `page`/`pageSize` computation so `pageSize` and `total` come first, then `totalPages = Math.max(1, Math.ceil(total / pageSize))`, then `page = Math.min(Math.max(1, filters.page ?? 1), totalPages)`. `getOrders` already returns the `page` it actually used (not the one it was asked for) — `OrdersResults` was already passing that straight to `Pagination`, so clamping here was enough on its own; `Pagination`'s "Page X of Y" label came out correct with no separate component change.

Considered and deliberately skipped: a distinct "this page doesn't exist" empty state. Once the page is clamped, the table never actually renders empty for a filter set that has real results — the reported symptom (a false "no orders match your filters") simply stops happening, the same way `?status=bogus` silently falling back to "all" doesn't get its own explanatory banner either. Adding one would be a UI concept this app doesn't otherwise have, for a case the clamp already resolves.

**Verification, against a rebuilt production server, not just the unit test:**
- `?page=999` on the real 200-order dataset: "Page 20 of 20", real rows rendered, no empty-state text present (confirmed by both a positive check for the pagination label and a negative check for the empty-state string).
- `?page=1.5`: "Page 1 of 20" — and the actual rendered rows (every `/orders/<id>` link, diffed) are byte-identical to a plain `?page=1` request, confirming the fallback lands on page 1 exactly, not some other interpretation of "1.5."
- `?page=0` and `?page=-5`: still clamp to page 1 (the pre-existing `Math.max(1, …)` floor, unchanged).
- `?pageSize=50&page=999`: clamps to "Page 4 of 4" — proves the clamp is computed against the real total for whichever `pageSize` is actually requested, not a number hardcoded against the default page size.
- One caught-and-fixed false negative along the way: the first attempt at this verification ran against a `next start` server that had been left running from an earlier session, still serving the pre-fix `.next` build — confirmed by checking the process's start time against the wall clock, not assumed. Killed it and started a fresh one before trusting any of the above.
- Added a `getOrders` unit test (`lib/api/orders.test.ts`) asserting the out-of-range clamp directly against the fixture dataset. `npx tsc --noEmit`, `npm run lint` (same one pre-existing unrelated warning), `npm test` (30/30 — 29 plus the new one), `npm run build` all clean.

**Commands run:**
```
npx tsc --noEmit && npm run lint && npm test   # 30/30, clean

npm run build
ps aux | grep next-server   # caught a stale server from an earlier session
kill -9 <stale-pid>
nohup npx next start -p 3199 > server.log 2>&1 & disown   # fresh server, doesn't die with the shell

python3 -c "
import urllib.request, re
def label(path):
    h = urllib.request.urlopen(f'http://localhost:3199{path}').read().decode()
    return re.findall(r'Page.{0,60}of.{0,30}', h)
for p in ['1','2','3','20','0','-5']:
    print(p, label(f'/orders?page={p}'))
print(label('/orders?pageSize=50&page=999'))
"
# page=999 check (separate call): pagination label + 'No orders match your filters' presence + row count
# page=1.5 vs page=1: diffed every /orders/<id> href, byte-identical

pkill -f "next start -p 3199"
```

**How this moves the build forward:** closes the second item from the post-deployment audit backlog (`step.md` Phase 11) — the message an out-of-range page used to show wasn't just imprecise, it actively told the user their search terms were wrong when they weren't. The fix is a single clamp at the one place that already knows the real page count, not a new UI concept layered on top.
