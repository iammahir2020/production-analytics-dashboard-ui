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
