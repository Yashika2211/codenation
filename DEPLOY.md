# Going live

Four things stand between this repo and a stranger solving a problem at a public URL: a Supabase
project, a GitHub OAuth app, the seed, and a Vercel deploy.

Two of the steps need a browser login that only you can do. Those are marked **you**.

---

## 1. Supabase project

**you** — create the project and log the CLI in:

```bash
supabase login                       # opens a browser
supabase projects create codenation --org-id <your-org> --region <nearest>
```

Or create it at https://supabase.com/dashboard and then:

```bash
supabase link --project-ref <ref>
```

Push the schema and the reference data:

```bash
supabase db push                              # 12 migrations
psql "$DATABASE_URL" -f supabase/seed.sql     # 40 problems, 169 cases, 60 tech, 30 blueprints, 45 items, 22 badges
```

`DATABASE_URL` is under **Project settings → Database → Connection string → URI**. Use the
session pooler string if direct connections are blocked on your network.

### Verify it took

```sql
select
  (select count(*) from problems)          as problems,        -- 40
  (select count(*) from testcases)         as testcases,       -- 169
  (select count(*) from tech_nodes)        as tech,            -- 60
  (select count(*) from blueprints)        as blueprints,      -- 30
  (select count(*) from item_definitions)  as items,           -- 45
  (select count(*) from badges)            as badges;          -- 22
```

The seed is idempotent — re-running it is a no-op, not a duplicate-key error.

---

## 2. Environment

Copy the keys from **Project settings → API**:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server only, never NEXT_PUBLIC_
JUDGE_PROVIDER=judge0
JUDGE0_URL=https://ce.judge0.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000     # the real domain in production
```

> The service role key bypasses RLS completely. It is read only by `lib/supabase/service.ts`,
> which is `import "server-only"` — a Client Component that imports it fails the build.

Now the world should work locally:

```bash
pnpm dev
```

Sign-in will not work yet — that needs step 3.

---

## 3. GitHub OAuth

**you** — https://github.com/settings/developers → **New OAuth App**

| Field | Value |
|---|---|
| Application name | CodeNation |
| Homepage URL | `https://<your-domain>` (or `http://localhost:3000` while testing) |
| Authorization callback URL | `https://<ref>.supabase.co/auth/v1/callback` |

The callback points at **Supabase**, not at your app. Getting this wrong is the single most
common reason sign-in fails.

Paste the client id and secret into Supabase → **Authentication → Providers → GitHub**, and
enable it.

Then set **Authentication → URL Configuration**:

- Site URL: `https://<your-domain>`
- Redirect URLs: add `https://<your-domain>/auth/callback` and
  `http://localhost:3000/auth/callback`

---

## 4. Seed the generated world (optional)

Twenty-five synthetic citizens, eight nations and their cities, so the atlas is not empty:

```bash
pnpm seed
```

Every one of them is inserted with `is_seed = true`: excluded from the landing page's citizen
count, excluded from the nation count, and visibly marked on their own profile. Their reputation
is minted through the ledger exactly as a real player's would be, so the economy stays honest.

Skip this if you would rather launch genuinely empty. The app handles zero rows everywhere —
that is what the empty states are for.

---

## 5. Vercel

**you**:

```bash
vercel login
vercel link
```

Set the environment variables (production, preview and development):

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JUDGE_PROVIDER          # judge0
vercel env add JUDGE0_URL              # https://ce.judge0.com
vercel env add NEXT_PUBLIC_SITE_URL    # https://<your-domain>
```

Ship it:

```bash
vercel --prod
```

Then go back and update, with the real domain:

- GitHub OAuth app → Homepage URL
- Supabase → Authentication → URL Configuration → Site URL and Redirect URLs
- `NEXT_PUBLIC_SITE_URL` in Vercel

---

## 6. Confirm it is actually live

The spec's definition of done, as a checklist a stranger could run:

1. Open the URL. The landing telemetry shows **real counts**, not dashes.
2. Sign in with GitHub. You land on `/onboarding`.
3. Claim a handle. You land on `/city`.
4. Go to `/arena`, open a problem, write Python, press **Run**. Sample cases stream in.
5. Press **Submit**. The full hidden set runs; the verdict and minted resources appear.
6. Your reputation in the nav went up, and `/u/<handle>` shows a square on the heatmap.
7. At 1,000 reputation, claim a parcel on `/city` and build something.
8. At 2,500, found a nation. It appears on `/atlas` at your country's position.

If step 5 fails with *"the judge is unreachable"*, the public Judge0 instance is rate limiting.
Either wait, or point `JUDGE0_URL` at your own instance.

---

## Judge notes

`JUDGE_PROVIDER` selects the backend and nothing else in the codebase knows which is in use.

- **judge0** (default) — `https://ce.judge0.com`, free, no key, reports peak memory. Public, so
  it is rate limited; `lib/judge/queue.ts` paces requests to ~4/s with retry and backoff.
- **piston** — the spec's original choice. The public endpoint went whitelist-only on 2026-02-15
  and refuses `/execute`, so this needs a self-hosted instance:

  ```bash
  docker compose -f docker-compose.piston.yml up -d
  docker exec piston piston ppman install python 3.10.0   # and the rest
  ```

  Then `JUDGE_PROVIDER=piston` and `PISTON_URL=http://localhost:2000/api/v2`.

---

## Before each deploy

```bash
pnpm check        # typecheck, lint, seed verification, cross-references, build
pnpm verify:db    # migrations + seed + 12 invariants against a throwaway Postgres
```

`verify:db` needs a working Docker daemon (`colima start` on this machine). CI runs both on every
push, so a red build is the same signal locally and on GitHub.
