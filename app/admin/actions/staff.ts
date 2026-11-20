"use server";
import { revalidatePath } from "next/cache";
import { requirePermission, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { PERMISSIONS, ROLES } from "@/lib/permissions";

type R = { ok: boolean; msg: string } | null;

export async function saveStaff(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("staff.manage");
    const id = String(fd.get("id") || "");
    const role = String(fd.get("role"));
    if (!ROLES[role]) return { ok: false, msg: "Unknown role" };
    const grant = Object.keys(PERMISSIONS).filter((p) => fd.get(`perm_${p}`) === "grant");
    const revoke = Object.keys(PERMISSIONS).filter((p) => fd.get(`perm_${p}`) === "revoke");
    const password = String(fd.get("password") || "");
    if (id) {
      if (id === s.id && (role !== "super_admin" || fd.get("active") !== "on") && s.role === "super_admin") return { ok: false, msg: "You can't demote or deactivate yourself." };
      const before = await db.staffUser.findUniqueOrThrow({ where: { id } });
      await db.staffUser.update({ where: { id }, data: { name: String(fd.get("name")), role, active: fd.get("active") === "on", permsGrant: grant, permsRevoke: revoke, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
      await audit(s.id, "staff.update", "staff", id, { role: before.role, active: before.active, grant: before.permsGrant, revoke: before.permsRevoke }, { role, active: fd.get("active") === "on", grant, revoke });
    } else {
      if (password.length < 10) return { ok: false, msg: "Use a password of at least 10 characters." };
      const u = await db.staffUser.create({ data: { name: String(fd.get("name")), email: String(fd.get("email")).toLowerCase(), role, passwordHash: await hashPassword(password), permsGrant: grant, permsRevoke: revoke } });
      await audit(s.id, "staff.create", "staff", u.id, undefined, { email: u.email, role });
    }
    revalidatePath("/admin/staff");
    return { ok: true, msg: "Saved." };
  } catch (e) { return { ok: false, msg: (e as Error).message.includes("Unique") ? "Email already in use." : (e as Error).message }; }
}
