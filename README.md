# CodeNation

A persistent world for developers. Real work — solved challenges, rated duels, hackathon
placements, merged contributions, mentoring hours — mints in-world resources and reputation.
Reputation unlocks territory, buildings, technologies and, past 3,000 points, a **Forge** where
players craft custom items that render in their own country.

Built to [`SPEC.md`](./SPEC.md).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess`. No `any`, no `@ts-ignore` |
| Styling | Tailwind CSS v4 with a `@theme` token layer. No component library |
| Database | Supabase Postgres, RLS on every table |
| Auth | Supabase Auth — GitHub OAuth, email magic link fallback |
| Realtime | Supabase Realtime (duel presence, alliance chat, forge broadcast) |
| Code execution | Judge0 behind a `CodeRunner` interface (see below) |
| Hosting | Vercel + Supabase cloud |

### One deviation from the spec

The spec locked Piston. The public Piston endpoint (`emkc.org`) became **whitelist only on
2026-02-15** and now refuses `/execute`, so it cannot run a live judge.

`JUDGE_PROVIDER` defaults to `judge0`, pointing at the free public `ce.judge0.com` — no key, and
it reports peak memory, which Piston does not. `PistonRunner` is unchanged and still selected with
`JUDGE_PROVIDER=piston`; [`docker-compose.piston.yml`](./docker-compose.piston.yml) brings up a
self-hosted instance. Both implement the same `CodeRunner` interface, so this is one env var.

## Local setup

```bash
git clone https://github.com/Yashika2211/codenation.git
cd codenation
pnpm install
cp .env.example .env.local     # fill in the Supabase keys
pnpm dev
```

Open http://localhost:3000. The design system lives at `/kitchen-sink`.

### Database

```bash
supabase link --project-ref <ref>
supabase db push                          # migrations
psql "$DATABASE_URL" -f supabase/seed.sql # 40 problems, 60 tech nodes, 30 blueprints, 45 items
pnpm seed                                 # synthetic citizens, nations, cities
```

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | 106 unit tests over the game's rules |
| `pnpm verify:seed` | Runs every seeded problem's reference solution against its cases |
| `pnpm verify:refs` | Checks every tech / blueprint / item cross-reference resolves |
| `pnpm verify:db` | Applies migrations + seed + invariants to a throwaway Postgres |
| `pnpm check:responsive` | Walks every route at 390 / 768 / 1440px in a real browser |
| `pnpm seed:sql` | Regenerates `supabase/seed.sql` from `scripts/data/` |
| `pnpm seed` | Seeds the generated world |
| `pnpm check` | Everything CI runs |

## Verification

Five things here cannot be typechecked, so each has a real test:

- **The rules of the game.** 106 unit tests (`pnpm test`) pin the economy, grading, fingerprints,
  rank gates, Forge gates and atlas projection to the values the spec states — not to whatever
  the implementation currently returns. They caught two bugs: the inscription filter let
  letter-spaced evasion through, and the atlas constants sat in a `server-only` module. The
  fingerprint suite asserts the property that actually matters, which is that *unrelated* programs
  stay well below the similarity threshold — a false positive there costs someone their standing.


- **Seed correctness.** Every problem carries a Python reference solution. `verify:seed` runs it
  against all 169 test cases and compares with the judge's own line-wise rule. It caught six wrong
  expected outputs the first time it ran — each one would have shipped an unsolvable problem.
- **Cross-references.** `verify:refs` fails if a blueprint or item requires a tech node that does
  not exist, or a craftable sits below the Forge threshold.
- **Schema and RLS.** `verify:db` applies the whole migration set, the seed twice (it must be
  idempotent) and an 11-point invariant suite to a throwaway Postgres container. It asserts, among
  other things, that a signed-in client **cannot** patch their own reputation, cannot read hidden
  test cases, and cannot insert into the ledger. It found a real bug: account deletion was
  impossible because the ledger's append-only trigger blocked the cascade.

- **Responsive and touch.** The spec says *"everything must work at 390px wide"*, which is not
  something you can eyeball reliably. `check:responsive` drives a real browser over every public
  route at three widths and fails on horizontal scroll, any element past the viewport edge, touch
  targets under 44px, or a console error. It found 47 issues on its first run — including genuine
  horizontal scrolling caused by a `hidden` utility losing to a component's own `inline-flex`,
  which is decided by stylesheet order rather than class order.

The first four run in CI on every push; the responsive audit needs a running server, so it is a
local gate before deploying.

## Layout

```
app/                 routes; Server Components by default
components/ui/       the design system — build a primitive here before using it in a page
components/arena/    editor, test panel, judge workspace
components/forge/    ForgedBuilding renderer and the crafting studio
lib/judge/           CodeRunner interface, Judge0 + Piston runners, grading, streaming
lib/economy/         minting rules and the append-only ledger
lib/forge/           parameter schema, rarity gates, crafting rules
lib/progression/     rank ladder, badge engine, research
lib/integrity/       k-gram fingerprints and moderation signals
supabase/migrations/ schema, RLS, triggers
scripts/data/        typed seed sources
scripts/sql/         Supabase shim and the invariant suite
```

## House rules

- Server Components by default. `"use client"` only for state, events or realtime.
- Every mutation re-verifies auth server-side. A client-supplied resource amount, score or
  reputation delta is never trusted — and a trigger enforces that even if RLS were misconfigured.
- Every economy change appends to `resource_ledger`. Balances are derived, never patched.
- No emoji in the UI. Icons are inline stroke SVG.
- Text on an accent fill uses the matching `--color-on-*` token, never white.
- Every animation is wrapped in a `prefers-reduced-motion` guard.

## Sample data honesty

Seeded citizens and nations carry `is_seed = true`, are excluded from every real count, and are
marked on their own profile. No fabricated number is rendered as a platform metric: when there is
nothing to report, the landing page shows a dash rather than inventing one.

The integrity pipeline does **not** claim to detect AI-written code. That cannot be done reliably,
and a system that says otherwise is worse than one that does not try.
