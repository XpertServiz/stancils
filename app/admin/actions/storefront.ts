"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/storage";
import { pingIndexNow } from "@/lib/seo";
import { cleanHome, DEFAULT_MENU_TEXT, ensureMenuCollections, getHome, parseMenu, saveHome, saveMenuText, type HomeRow } from "@/lib/storefront";

type R = { ok: boolean; msg: string } | null;

const refreshAll = () => {
  revalidatePath("/", "layout");
  void pingIndexNow(["/"]);
};

const photo = async (f: FormDataEntryValue | null) => {
  if (f instanceof File && f.size > 0) {
    if (!f.type.startsWith("image/")) throw new Error("Photos must be images (JPG or PNG).");
    return saveUpload(f);
  }
  return null;
};

/** The top menu. Plain text: one line per link, indent a line to put it in a dropdown. */
export async function saveMenu(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const text = String(fd.get("menu") ?? "").replace(/[<>]/g, "");
    const menu = parseMenu(text);
    if (!menu.length) return { ok: false, msg: "Add at least one menu line." };
    if (menu.length > 14) return { ok: false, msg: "Please keep the top menu to 14 items or fewer." };
    const made = await ensureMenuCollections(menu);
    await saveMenuText(text);
    await audit(s.id, "storefront.menu.update", "settings", "storeMenu", undefined, { items: menu.length, newCollections: made });
    refreshAll();
    revalidatePath("/admin/website/menu");
    return { ok: true, msg: `Saved. ${menu.length} menu items${made ? `, and ${made} new collection${made === 1 ? "" : "s"} created` : ""}. Live now.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function resetMenu(_: R): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const menu = parseMenu(DEFAULT_MENU_TEXT);
    await ensureMenuCollections(menu);
    await saveMenuText(DEFAULT_MENU_TEXT);
    await audit(s.id, "storefront.menu.reset", "settings", "storeMenu");
    refreshAll();
    revalidatePath("/admin/website/menu");
    return { ok: true, msg: "Menu restored to the starter menu." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** The top of the homepage: headline, photo, checklist, button, badge, plus the product rows and the store hours. */
export async function saveHomeTop(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const prev = await getHome();
    const up = await photo(fd.get("heroPhoto"));
    const next = cleanHome(
      {
        eyebrow: String(fd.get("eyebrow") ?? ""),
        headline: String(fd.get("headline") ?? ""),
        sub: String(fd.get("sub") ?? ""),
        checklist: String(fd.get("checklist") ?? "").split(/\r?\n/),
        cta: { label: String(fd.get("cta_label") ?? ""), href: String(fd.get("cta_href") ?? "") },
        badge: String(fd.get("badge") ?? ""),
        heroImage: up ?? (fd.get("remove_hero") === "on" ? "/images/hero-girl.jpg" : prev.heroImage),
      },
      prev,
    );
    await saveHome(next);
    await audit(s.id, "storefront.home.top", "settings", "storeHome", prev, next);
    refreshAll();
    return { ok: true, msg: "Saved. The homepage is updated." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** The product rows ("Persian Carpet Stencils", …). The last, empty row in the form adds a new one. */
export async function saveHomeRows(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const prev = await getHome();
    const rows: HomeRow[] = [];
    for (let i = 0; fd.has(`title_${i}`); i++) {
      if (fd.get(`remove_${i}`) === "on") continue;
      const title = String(fd.get(`title_${i}`) ?? "").trim();
      if (!title) continue;
      const up = await photo(fd.get(`banner_${i}`));
      rows.push({
        title,
        intro: String(fd.get(`intro_${i}`) ?? ""),
        collection: String(fd.get(`collection_${i}`) ?? ""),
        banner: up ?? (fd.get(`nobanner_${i}`) === "on" ? "" : String(fd.get(`keep_${i}`) ?? "")),
        count: Number(fd.get(`count_${i}`) || 8),
      });
    }
    const chips = String(fd.get("chips") ?? "").split(/\r?\n/).map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([label, href]) => ({ label, href: href || "/shop" }));
    const next = cleanHome(
      { rows, chips, latestTitle: String(fd.get("latestTitle") ?? ""), hours: String(fd.get("hours") ?? ""), mapQuery: String(fd.get("mapQuery") ?? ""), newsletterTitle: String(fd.get("newsletterTitle") ?? "") },
      prev,
    );
    await saveHome(next);
    await audit(s.id, "storefront.home.rows", "settings", "storeHome", { rows: prev.rows.length }, { rows: next.rows.length });
    refreshAll();
    return { ok: true, msg: `Saved. ${next.rows.length} product row${next.rows.length === 1 ? "" : "s"} on the homepage.` };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
