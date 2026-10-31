#!/bin/sh
# Vercel build. Preview builds (pushes to a non-production branch) only see variables enabled for
# "Preview", so fall back to the other Supabase connection strings when DATABASE_URL is Production-only.
set -e
export DATABASE_URL="${DATABASE_URL:-${SESSION_POOLER:-$DIRECT_URL}}"
export DIRECT_URL="${DIRECT_URL:-${SESSION_POOLER:-$DATABASE_URL}}"
if [ -z "$DATABASE_URL" ]; then
  echo "vercel-build: no database connection string. Add DATABASE_URL (or SESSION_POOLER / DIRECT_URL) for this environment in Vercel → Settings → Environment Variables." >&2
  exit 1
fi
[ "$VERCEL_ENV" = "production" ] || echo "vercel-build: ${VERCEL_ENV:-local} build — this updates a preview URL, not the live site. Set Vercel's Production Branch to this branch to publish automatically."
prisma generate
prisma migrate deploy
tsx prisma/seed-if-empty.ts
next build
