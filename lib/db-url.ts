/**
 * Supabase's transaction pooler (PgBouncer, usually port 6543) can't run Prisma's prepared
 * statements unless the URL carries `pgbouncer=true` — without it queries fail with
 * "prepared statement \"s0\" already exists". Add it automatically so a copied URL just works.
 */
export function databaseUrl(raw = process.env.DATABASE_URL): string | undefined {
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
