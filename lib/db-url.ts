/**
 * Database URL for Prisma.
 * - Falls back to SESSION_POOLER / DIRECT_URL when DATABASE_URL isn't set for this environment
 *   (e.g. Vercel Preview builds when DATABASE_URL is Production-only).
 * - Supabase's transaction pooler (PgBouncer, port 6543) can't run Prisma's prepared statements
 *   without `pgbouncer=true` ("prepared statement \"s0\" already exists"), so it is added automatically.
 */
export function databaseUrl(raw = process.env.DATABASE_URL || process.env.SESSION_POOLER || process.env.DIRECT_URL): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const pooled = u.port === "6543" || u.hostname.includes("pooler.");
    if (pooled && u.port === "6543" && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    if (pooled && !u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "5");
    return u.toString();
  } catch {
    return raw;
  }
}
