import { describe, it, expect } from "vitest";
import { databaseUrl } from "../lib/db-url";

describe("databaseUrl", () => {
  it("adds pgbouncer=true for the Supabase transaction pooler", () => {
    const u = new URL(databaseUrl("postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")!);
    expect(u.searchParams.get("pgbouncer")).toBe("true");
  });
  it("keeps an existing pgbouncer setting", () => {
    expect(databaseUrl("postgresql://u:p@host.pooler.supabase.com:6543/db?pgbouncer=true")).toContain("pgbouncer=true");
  });
  it("leaves direct and local URLs alone", () => {
    expect(databaseUrl("postgresql://u:p@localhost:5432/db")).toBe("postgresql://u:p@localhost:5432/db");
    expect(databaseUrl("postgresql://u:p@db.abc.supabase.co:5432/postgres")).not.toContain("pgbouncer");
  });
});
