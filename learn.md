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
