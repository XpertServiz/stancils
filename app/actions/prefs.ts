"use server";
import { cookies } from "next/headers";

const year = 60 * 60 * 24 * 365;

export async function setCurrency(code: string) {
  (await cookies()).set("cc_currency", code.slice(0, 3).toUpperCase(), { path: "/", maxAge: year, sameSite: "lax" });
}
export async function setUnits(u: "cm" | "in") {
  (await cookies()).set("cc_units", u, { path: "/", maxAge: year, sameSite: "lax" });
}
export async function setCountry(c: string) {
  (await cookies()).set("cc_country", c.slice(0, 2).toUpperCase(), { path: "/", maxAge: year, sameSite: "lax" });
}
export async function setSurface(s: string | null) {
  const jar = await cookies();
  if (!s) jar.delete("cc_surface");
  else jar.set("cc_surface", s, { path: "/", maxAge: year, sameSite: "lax" });
}
