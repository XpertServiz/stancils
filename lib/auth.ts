import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";
import { effectivePerms, type Permission } from "./permissions";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me");
const STAFF = "cc_staff";
const CUST = "cc_cust";

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

async function sign(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(secret());
}

async function read(name: string): Promise<Record<string, unknown> | null> {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret())).payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

const cookieOpts = (days: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: days * 86400,
});

// ── staff ──
export async function startStaffSession(userId: string) {
  (await cookies()).set(STAFF, await sign({ sub: userId, k: "staff" }, 1), cookieOpts(1));
}
export async function endStaffSession() {
  (await cookies()).delete(STAFF);
}

export const getStaff = cache(async () => {
  const p = await read(STAFF);
  if (!p?.sub) return null;
  const user = await db.staffUser.findUnique({ where: { id: String(p.sub) } });
  if (!user || !user.active) return null;
  return { ...user, perms: effectivePerms(user) };
});

export type StaffSession = NonNullable<Awaited<ReturnType<typeof getStaff>>>;

/** For pages: redirect to login if anonymous, show 403 if lacking permission. */
export async function requireStaff(perm?: Permission): Promise<StaffSession> {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  if (perm && !s.perms.has(perm)) redirect("/admin?denied=" + perm);
  return s;
}

/** For server actions: throw instead of redirecting. */
export async function requirePermission(perm: Permission): Promise<StaffSession> {
  const s = await getStaff();
  if (!s) throw new Error("Not signed in");
  if (!s.perms.has(perm)) throw new Error(`Missing permission: ${perm}`);
  return s;
}

// ── customers ──
export async function startCustomerSession(customerId: string) {
  (await cookies()).set(CUST, await sign({ sub: customerId, k: "cust" }, 30), cookieOpts(30));
}
export async function endCustomerSession() {
  (await cookies()).delete(CUST);
}
export const getCustomer = cache(async () => {
  const p = await read(CUST);
  if (!p?.sub) return null;
  return db.customer.findUnique({ where: { id: String(p.sub) }, include: { business: true } });
});
