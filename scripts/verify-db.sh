#!/usr/bin/env bash
#
# Applies the whole migration set, the seed, and the invariant suite to a
# throwaway Postgres container.
#
# This is the only way to know the schema is actually correct: RLS policies,
# triggers and check constraints cannot be typechecked, and a mistake in any of
# them means reputation can be minted from a browser. It found two real bugs the
# first time it ran.
#
# Usage: pnpm verify:db     (requires a working docker daemon)

set -euo pipefail

CONTAINER="${CODENATION_PG_CONTAINER:-codenation-verify-pg}"
IMAGE="postgres:16-alpine"
DB="codenation"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "docker daemon is not reachable — start Docker (or 'colima start') first." >&2
  exit 1
fi

cleanup
echo "Starting $IMAGE ..."
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB="$DB" \
  "$IMAGE" >/dev/null

# The postgres entrypoint runs a temporary server during initdb, so pg_isready
# can succeed before the real one is listening. Probe with an actual query, and
# require two consecutive successes.
ready=0
for _ in $(seq 1 90); do
  if docker exec "$CONTAINER" psql -U postgres -d "$DB" -c 'select 1' >/dev/null 2>&1; then
    ready=$((ready + 1))
    if [ "$ready" -ge 2 ]; then break; fi
  else
    ready=0
  fi
  sleep 1
done

if [ "$ready" -lt 2 ]; then
  echo "Postgres never became ready." >&2
  docker logs "$CONTAINER" 2>&1 | tail -20 >&2
  exit 1
fi

run_sql() {
  local label="$1" file="$2"
  docker cp "$file" "$CONTAINER:/tmp/run.sql" >/dev/null
  if docker exec "$CONTAINER" psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f /tmp/run.sql; then
    echo "  ok   $label"
  else
    echo "  FAIL $label" >&2
    exit 1
  fi
}

echo "Applying Supabase shim ..."
run_sql "supabase-shim.sql" "$ROOT/scripts/sql/supabase-shim.sql"

echo "Applying migrations ..."
for migration in "$ROOT"/supabase/migrations/*.sql; do
  run_sql "$(basename "$migration")" "$migration"
done

echo "Applying seed ..."
run_sql "seed.sql" "$ROOT/supabase/seed.sql"

echo "Re-applying seed (must be idempotent) ..."
run_sql "seed.sql (second pass)" "$ROOT/supabase/seed.sql"

echo "Checking invariants ..."
run_sql "invariants.sql" "$ROOT/scripts/sql/invariants.sql"

echo "Seeded row counts:"
docker exec "$CONTAINER" psql -U postgres -d "$DB" -At -c "
select '  problems          '||count(*) from public.problems
union all select '  testcases         '||count(*) from public.testcases
union all select '  tech_nodes        '||count(*) from public.tech_nodes
union all select '  blueprints        '||count(*) from public.blueprints
union all select '  item_definitions  '||count(*) from public.item_definitions
union all select '  badges            '||count(*) from public.badges;"

echo "Database verified."
