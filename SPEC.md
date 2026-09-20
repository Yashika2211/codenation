# CodeNation — Build Specification

> Everything in here is decided. Do not re-litigate the stack, the palette or the fonts.

---

## 0. What you are building

CodeNation is a persistent world for developers. Real work — solved challenges, rated duels,
hackathon placements, merged open-source contributions, mentoring hours — mints in-world
resources and reputation. Reputation unlocks territory, buildings, technologies and, past
3,000 points, a **Forge** where players craft custom items that render in their own country.

It must run as a real web app with real accounts, real code execution, real persistence and a
live public URL. Not a click-through mockup.

**Locked stack**

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict, React Server Components |
| Styling | Tailwind CSS v4 with the token layer in §2 + plain CSS for keyframes |
| Database | Supabase Postgres, Row Level Security on every table |
| Auth | Supabase Auth — GitHub OAuth primary, email magic link fallback |
| Realtime | Supabase Realtime (presence + broadcast + postgres_changes) |
| Code execution | Piston public API behind a `CodeRunner` interface |
| Hosting | Vercel (app) + Supabase cloud (data). Both free tier. |
| Package manager | pnpm |

**Hard rules**

- No `any`. No `@ts-ignore`. `pnpm typecheck` and `pnpm lint` must pass at every milestone.
- Server Components by default. `"use client"` only for components with state, events or realtime.
- All mutations go through Server Actions or Route Handlers that re-verify auth server-side.
  Never trust a client-supplied resource amount, score or reputation delta.
- Every economy change writes a row to `resource_ledger`. Balances are derived, never patched.
- No emoji anywhere in the UI. Icons are inline stroke SVG only.
- Do not install a component library (no shadcn, MUI, Chakra). The visual system below is the
  component library. Build the primitives once in `components/ui/` and reuse them.

---

## 1. Visual direction — "neon terminal deco"

Near-black void ground, glass panels floating on it, one spring-cyan accent carrying the eye,
violet and magenta as supports, everything numeric set in monospace.

**Never do:** gradient rainbow washes, cards with a coloured left border, emoji, Inter, Roboto,
Arial, drop shadows on text, fake iOS status bars, purple-to-pink hero gradients.

**Always do:** flat near-black ground with *radial* glow pools, 1px hairline borders at low
alpha, generous negative space, monospace for every number and label, a single accent doing the
work.

---

## 2. Design tokens

```css
@theme {
  /* ground */
  --color-void:        #06070D;   /* page background */
  --color-panel:       #0D1018;   /* solid panel */
  --color-elevated:    #12161F;

  /* glass */
  --color-glass:       rgb(255 255 255 / 0.028);
  --color-glass-hi:    rgb(255 255 255 / 0.05);
  --color-line:        rgb(124 140 180 / 0.16);
  --color-line-hi:     rgb(124 140 180 / 0.24);

  /* text */
  --color-text:        #EAF0F8;
  --color-muted:       #A9B8CC;
  --color-dim:         #93A3B8;
  --color-faint:       #7E8CA3;
  --color-ghost:       #6E7B90;

  /* accents */
  --color-flux:        #3BE8B0;   /* primary — spring cyan */
  --color-ion:         #7C6BFF;   /* violet */
  --color-plasma:      #E84FA8;   /* magenta */
  --color-signal:      #5FC8FF;   /* sky */
  --color-amber:       #F2B441;   /* gold */

  /* text that sits ON an accent fill — never white */
  --color-on-flux:     #04120D;
  --color-on-ion:      #0A0720;
  --color-on-plasma:   #1A0512;
  --color-on-signal:   #04141F;
  --color-on-amber:    #1B1408;

  --font-display:      "Syne", system-ui, sans-serif;      /* 700, 800 */
  --font-body:         "Manrope", system-ui, sans-serif;   /* 400–800 */
  --font-mono:         "JetBrains Mono", ui-monospace, monospace; /* 400,500,700 */

  --radius-chip: 9px;
  --radius-card: 14px;
  --radius-panel: 18px;
  --radius-hero: 24px;
}
```

**Type scale**

| Role | Font | Size / weight / tracking |
|---|---|---|
| Hero | display | 108px / 800 / -0.035em / lh 0.92 |
| Page title | display | 32px / 800 / -0.025em |
| Section title | display | 19–20px / 800 |
| Card title | display or body | 17–23px / 700 |
| Body | body | 13–16.5px / 400–500 / lh 1.6 |
| Label (uppercase) | mono | 9.5–10px / 500 / 0.18em / uppercase / `--color-dim` |
| Numeric / data | mono | 10.5–12px |
| Big stat | display | 19–30px / 800 |

**Accessibility, enforced**

- Body text >= 4.5:1 on its background; >= 3:1 for 24px+.
- Text on an accent fill uses the matching `--color-on-*`, never white.
- Real `<button>`, `<a href>`, `<input>` + `<label>`. Never `onClick` on a `div`.
- Icon-only buttons carry `aria-label`. Interactive targets >= 44px on touch.
- Every animation wrapped in `@media (prefers-reduced-motion: reduce) { animation: none; }`.

---

## 3. Component recipes

Build these in `components/ui/` first, before any page.

**Atmosphere wrapper** — every full page sits on radial glow pools over `--color-void`, plus an
absolutely-positioned 48px grid overlay at 5% alpha.

**`<Panel>`** — `bg-glass border border-line rounded-panel`. Variant `solid` uses `bg-panel/85`.
Variant `tinted` takes an accent and renders `bg-{accent}/8 border-{accent}/28`.

**`<TopNav>`** — 64px, `border-b border-line`, `bg-[rgb(9_11_18/0.8)] backdrop-blur`. Left: a 20px
square rotated 45° with a flux border and glow, then `CODENATION` in display 800, 15px,
`letter-spacing: 0.16em`. Nav pills, resource chips, avatar.

**`<ResourceChip>`** — `px-[11px] py-[7px] rounded-chip border border-line bg-glass-hi`, a 9px
square rotated 45° in the resource colour, value in mono 11.5px, label in mono 10px.

**`<Avatar>`** — rounded square, `linear-gradient(140deg, <a>, <b>)` derived deterministically
from the user id, initials in display 800 in `--color-void`.

**`<IsoPlate>`** — the signature element. A CSS-3D grid:
`transform: perspective(1400px) rotateX(57deg) rotateZ(45deg)`. Each occupied tile holds a
building div with scanline facade, accent glow and `translateZ(level * 15px)`. Empty tiles get a
45° hatch at 6% alpha. Height, accent and window density come from the database.

**`<Marker>`** — floating label over the plate with a mono kicker and bold name.

**`<StatTile>`** — mono uppercase label, display 800 value 25–30px, 11.5px dim sub-line.

**`<Heatmap>`** — 53 × 7 grid of 9px rounded squares, 3px gaps, five levels.

**`<SkillRadar>`** — inline SVG hexagon, two faint rings, filled polygon.

**Keyframes**: `cn-stream`, `cn-pulse`, `cn-float`, `cn-dash`.

---

## 4. Data model

Supabase Postgres. Every table has RLS. `profiles.id` references `auth.users.id`.

### Identity & world
```
profiles         id, handle unique, display_name, bio, avatar_seed, country_code,
                 github_login, github_verified_at, reputation int default 0,
                 arena_rating int default 1200, trust_score int default 100,
                 nation_id fk null, created_at
nations          id, slug unique, name, founder_id fk, flag jsonb, doctrine,
                 tier int, prestige int, founded_at
parcels          id, nation_id fk null, owner_id fk, grid_x, grid_y, zoning, acquired_at
buildings        id, parcel_id fk, blueprint_id fk, level int, accent, state
                 ('queued'|'building'|'complete'), progress numeric, eta timestamptz,
                 custom_item_id fk null      -- forged skin applied
blueprints       id, slug, name, kind, base_cost jsonb, requires_tech uuid[],
                 requires_rep int, max_level, default_accent
```

### Work & judging
```
problems         id, slug, title, difficulty ('easy'|'medium'|'hard'|'expert'),
                 topics text[], statement_md, constraints_md, time_limit_ms,
                 memory_limit_mb, author_id, is_public, created_at
testcases        id, problem_id fk, input, expected, is_sample bool, weight int
                 -- RLS: non-sample rows are SERVICE ROLE ONLY.
submissions      id, user_id, problem_id, language, source_code, status
                 ('queued'|'running'|'accepted'|'wrong_answer'|'tle'|'mle'|'error'),
                 passed int, total int, runtime_ms, memory_kb, created_at
submission_runs  id, submission_id fk, testcase_id fk, verdict, runtime_ms, stderr
duels            id, problem_id, player_a, player_b, state, started_at, ends_at,
                 winner_id, rating_delta_a, rating_delta_b
```

### Economy & progression
```
resource_ledger  id, user_id, resource ('compute'|'data'|'alloy'|'rep'),
                 delta bigint, reason, ref_table, ref_id, created_at   -- APPEND ONLY
wallets          user_id pk, compute bigint, data bigint, alloy bigint, updated_at
tech_nodes       id, slug, name, tier int, branch, description, cost jsonb,
                 requires uuid[], unlocks_blueprints uuid[], unlocks_items uuid[]
tech_progress    user_id, node_id, state ('locked'|'available'|'researching'|'mastered'),
                 progress numeric, solves_done int, solves_required int
badges           id, slug, name, description, rarity, rule jsonb
badge_awards     user_id, badge_id, awarded_at, evidence jsonb
```

### Items & the Forge
```
item_definitions id, slug, name, kind, rarity, unlock_rule jsonb, base_params jsonb,
                 craftable bool, cost jsonb, requires_rep int, requires_tech uuid[]
item_instances   id, definition_id fk, owner_id fk, params jsonb, seed text,
                 forged_at, bound bool default true, serial int
inventory        user_id, item_instance_id, acquired_at, source
loadout          user_id pk, avatar_frame uuid, workspace_skin uuid, banner uuid,
                 title uuid, flag_motif uuid, landmark uuid
```

### Social & governance
```
alliances        id, slug, name, charter_md, treasury jsonb, tier, founded_at
alliance_members alliance_id, nation_id, role ('speaker'|'member'|'probation'), contribution
trades           id, from_nation, to_nation, offer jsonb, want jsonb, state, created_at
visits           id, visitor_id, nation_id, at
guestbook        id, nation_id, author_id, body, at
activity_feed    id, actor_id, verb, object_type, object_id, payload jsonb, at
moderation_flags id, kind, subject_type, subject_id, confidence numeric, signals jsonb,
                 state ('watch'|'evidence'|'review'|'resolved'), verdict, resolved_at
appeals          id, flag_id, author_id, body, state, decided_at
```

**RLS shape:** readable-by-all for `profiles`, `nations`, `problems` (public only),
`activity_feed`, `badges`; owner-only write. `testcases` non-sample and `submissions.source_code`
of other users are service-role only. `resource_ledger` is insert-only from server code.

Seed with ~40 real problems, ~60 tech nodes across 5 branches, ~30 blueprints, ~45 item
definitions, and 25 synthetic citizens.

---

## 5. Progression, economy, and the Forge

### 5.1 Reputation ladder

| REP | Rank | Unlocks |
|---|---|---|
| 0 | Citizen | Daily contracts, city presence, starter workspace |
| 250 | Apprentice | Avatar frames tier 1, squad membership |
| 500 | Artisan | Workspace skins, rated duels |
| 1,000 | Engineer | Claim first 3 land parcels, tech tree tier II |
| 1,750 | Architect | District zoning, blueprint tier II, mentor queue |
| 2,500 | **Founder** | Found a nation: name, flag designer, doctrine |
| **3,000** | **Sovereign** | **THE FORGE — custom item crafting**, custom building skins, emissive palettes, custom flag motifs, personal title |
| 4,000 | Magistrate | Host events inside your borders, guest permissions |
| 5,000 | Luminary | Found an alliance, open trade routes, treasury |
| 7,500 | Archon | World-event hosting, moderator eligibility, rare forge palettes |
| 10,000 | Legend | One unique **Landmark** on the world atlas, mythic forge tier |

Store this ladder as data in `lib/progression/ranks.ts`.

### 5.2 Minting rules

```
solve(problem)        compute = 60 × difficultyMult, rep = 8 × difficultyMult
                      difficultyMult: easy 1, medium 2, hard 4, expert 7
                      first-ever-solver bonus: ×2.5 on compute, +25 rep
duel win              compute = 420, rep = 38, rating via Elo K=32
duel loss             rep = 4 (participation), rating −
contest placement     compute = 2000 × placementCurve(rank, entrants)
merged PR (verified)  data = 300, rep = 45
review / mentoring    data = 90, rep = 40, capped at 3 per day
hackathon placement   compute + alloy by bracket, rep = 120 for a final
daily contract        small fixed grants, resets 00:00 UTC
```

**Anti-inflation, mandatory:**
- Diminishing returns: the *n*-th reward of the same kind in a rolling 24h is multiplied by
  `max(0.25, 0.85^(n-1))`.
- Repeat solves of a problem you already solved mint 0.
- Seasonal prestige decay of 15% on `nations.prestige` at season rollover.
- Buildings charge upkeep every 6h in compute; unpaid buildings go dormant. Main sink.

### 5.3 The Forge — custom items at 3,000 REP

Deterministic parametric crafting. Rendering is pure CSS driven by `params`.

**Item kinds:** `avatar_frame`, `workspace_skin`, `building_skin`, `district_prop`,
`flag_motif`, `banner`, `title`, `landmark`.

**Rarity:** `common` → `rare` → `epic` → `legendary` → `mythic`.

```ts
type ForgeParams = {
  palette: { base: Hex; accent: Hex; emissive: Hex };
  emissiveIntensity: number;   // 0–1, caps by rarity: common .3 → mythic 1.0
  silhouette: "spire" | "ziggurat" | "arcology" | "lattice" | "monolith" | "helix";
  facade: "banded" | "ribbed" | "grid" | "faceted" | "glass";
  crown: "none" | "beacon" | "ring" | "antenna" | "halo";   // beacon+ requires epic
  motif: string;
  inscription: string;         // <= 24 chars, profanity-filtered
  seedNoise: number;
};
```

**Crafting rules** (`lib/forge/craft.ts`), all validated server-side:
1. `rep >= definition.requires_rep` (>= 3000 for every craftable).
2. All `requires_tech` nodes `mastered`.
3. Wallet covers `cost`; cost scales `base × rarityMult` (1, 2.5, 6, 15, 40).
4. Mythic requires 10,000 rep and one-per-player-per-season (partial unique index).
5. On success: deduct via ledger, insert `item_instance` with incrementing `serial`, insert into
   `inventory`, emit `activity_feed`, broadcast to the nation channel.
6. Crafted items are `bound: true`. Only `rare` and below unbind, for an `alloy` cost.

**Rendering:** one component, `<ForgedBuilding params={...} />`, used in the nation view, the
atlas preview and the profile showcase. **Preview must be live.**

### 5.4 Badge engine

`badges.rule` is a JSON predicate evaluated by `lib/progression/rules.ts`, re-evaluated for the
affected user inside the mint transaction.

---

## 6. Screens

| Route | Screen |
|---|---|
| `/` | Entry portal — parallax skyline, data streams, live telemetry, path, features, atlas teaser |
| `/city` | City of Coders — 5×5 IsoPlate, left rail, centre plate, right rail |
| `/atlas` | World map — SVG orbital map, nations as nodes, dashed trade arcs, ranked list |
| `/n/[slug]` | Nation — 6×6 IsoPlate of real buildings, flag, build queue, blueprints, guestbook |
| `/forge` | The Forge — locked below 3,000 rep; picker, params, live preview, cost, owned grid |
| `/arena` | Arena lobby — problem list, filters, ladder, matchmaking |
| `/arena/[slug]` | Problem — statement, CodeMirror 6 editor, Run/Submit, live verdict streaming |
| `/duel/[id]` | Rated duel — editor + opponent telemetry, countdown, stake panel |
| `/events` | Hackathons — featured event, tracks, bracket, leaderboard |
| `/tech` | Tech tree — branch tabs, 4 tiers, animated SVG edges, detail rail |
| `/u/[handle]` | Profile — radar, 53-week heatmap, badges, forged showcase, verified activity |
| `/guild/[slug]` | Alliance — members, exchange, projects, diplomacy, chat |
| `/fairplay` | Integrity — pipeline, review queue, trust score, charter, verdicts |

Everything must work at 390px wide, with a fixed bottom tab bar on mobile.

---

## 7. Code execution

```ts
export interface CodeRunner {
  run(input: { language: string; version: string; source: string; stdin: string;
               timeLimitMs: number }): Promise<{
    stdout: string; stderr: string; exitCode: number; runtimeMs: number;
    verdict: "ok" | "runtime_error" | "timeout";
  }>;
}
```

`PistonRunner` posts to the public Piston API behind a server-side rate-limited queue and streams
partial results over realtime. `Judge0Runner` is a second implementation selected by
`JUDGE_PROVIDER`. Mint only inside the transaction that writes the final `accepted` status.

---

## 8. Anti-cheat (v1, honest scope)

- Telemetry: keystroke count, paste events, paste volume — aggregates only.
- Cadence signal: `pastedChars / totalChars > 0.9` plus abnormally fast first submit.
- Similarity: winnowing k-gram fingerprints (k=5, window=4), Jaccard >= 0.82.
- Every signal writes a `moderation_flags` row. Nothing is auto-punished.
- Rate-limit submissions (1 per 5s).

AI assistance is allowed and must be declared; plagiarism is the line. Nothing here claims to
detect AI-written code.

---

## 9. Build order

- **M0 — Skeleton.** Next.js + TS + Tailwind v4 + tokens + fonts + `components/ui/` + `/kitchen-sink`.
- **M1 — Landing.** `/` complete with parallax skyline and data streams.
- **M2 — Auth + schema.** Supabase, migrations, RLS, GitHub OAuth, `/u/[handle]`, onboarding.
- **M3 — Arena.** Problems, editor, Piston runner, submissions, verdict streaming, ladder, Elo.
- **M4 — Economy.** Ledger, wallets, minting, diminishing returns, rep ladder, heatmap, badges.
- **M5 — World.** Parcels, blueprints, build queue, upkeep, IsoPlate, `/city`, `/n/[slug]`, `/atlas`.
- **M6 — The Forge.** Live preview, crafting, forged items rendering everywhere.
- **M7 — Multiplayer.** Presence, live feed, duels, alliances, trades, guestbook, chat.
- **M8 — Events + integrity.** Hackathons, brackets, leaderboards, fingerprinting, moderation.

---

## 10. Going live

```
supabase init && supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
pnpm tsx scripts/seed.ts
vercel link && vercel env pull .env.local
vercel --prod
```

**Definition of "live":** a stranger can open the URL, sign in with GitHub, solve a real problem
in the browser against a real judge, watch their reputation increase, claim a parcel, construct a
building, and see it appear on the world atlas — without you touching anything.

---

## 11. Sample data honesty

Seeded citizens are marked `profiles.is_seed = true` and excluded from any "real users" count.
Never render a fabricated number as a platform metric — if the real count is 3, show 3.
