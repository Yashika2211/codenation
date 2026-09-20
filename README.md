# CodeNation

A persistent world for developers. Real work — solved challenges, rated duels, hackathon
placements, merged contributions, mentoring hours — mints in-world resources and reputation.
Reputation unlocks territory, buildings, technologies and, past 3,000 points, a **Forge** where
players craft custom items that render in their own country.

Built to [`SPEC.md`](./SPEC.md). Nothing in that file is up for renegotiation.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess`. No `any`, no `@ts-ignore` |
| Styling | Tailwind CSS v4 with a `@theme` token layer. No component library |
| Database | Supabase Postgres, RLS on every table |
| Auth | Supabase Auth — GitHub OAuth, email magic link fallback |
| Realtime | Supabase Realtime |
| Code execution | Piston behind a `CodeRunner` interface |
| Hosting | Vercel + Supabase cloud |

## Local setup

```bash
git clone https://github.com/Yashika2211/codenation.git
cd codenation
pnpm install
cp .env.example .env.local     # fill in the Supabase keys
pnpm dev
```

Open http://localhost:3000. The design system lives at `/kitchen-sink`.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm check` | All three, in the order CI runs them |
| `pnpm seed` | Generated seed data |

## Layout

```
app/                 routes; Server Components by default
components/ui/       the design system — build a primitive here before using it in a page
lib/design/          accents, navigation, shared visual vocabulary
lib/utils/           small dependency-free helpers
supabase/            migrations and SQL seed
scripts/             generated seed data
```

## House rules

- Server Components by default. `"use client"` only for state, events or realtime.
- Every mutation re-verifies auth server-side. A client-supplied resource amount, score or
  reputation delta is never trusted.
- Every economy change appends to `resource_ledger`. Balances are derived, never patched.
- No emoji in the UI. Icons are inline stroke SVG.
- Text on an accent fill uses the matching `--color-on-*` token, never white.
- Every animation is wrapped in a `prefers-reduced-motion` guard.

## Sample data honesty

Seeded citizens carry `profiles.is_seed = true` and are excluded from any real-user count. No
fabricated number is ever rendered as a platform metric.
