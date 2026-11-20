"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { checkPassword, endStaffSession, startStaffSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

const attempts = new Map<string, { n: number; until: number }>();

export async function staffLogin(_: unknown, fd: FormData): Promise<{ error: string } | null> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return { error: "Too many attempts — try again in a few minutes." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await db.staffUser.findUnique({ where: { email } });
  if (!user || !user.active || !(await checkPassword(String(fd.get("password") ?? ""), user.passwordHash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "Email or password is incorrect." };
  }
  attempts.delete(ip);
  await db.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "login", "staff", user.id);
  await startStaffSession(user.id);
  redirect("/admin");
}

export async function staffLogout() {
  await endStaffSession();
  redirect("/admin/login");
}
