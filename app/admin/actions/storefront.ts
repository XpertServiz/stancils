"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveUpload } from "@/lib/storage";
import { pingIndexNow } from "@/lib/seo";
import { cleanHome, DEFAULT_MENU_TEXT, ensureMenuCollections, getHome, parseMenu, saveHome, saveMenuText, type Chip } from "@/lib/storefront";

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

/** The top of the homepage: label, headline, text, strip, buttons and the big arch picture. */
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
        heroButton2: String(fd.get("button2") ?? ""),
        heroImage: up ?? prev.heroImage,
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

/** The arch pictures, the shop/custom/story/benefit texts and the email box. The last, empty picture box adds a new one. */
export async function saveHomeRows(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const prev = await getHome();
    const chips: Chip[] = [];
    for (let i = 0; fd.has(`tile_label_${i}`); i++) {
      if (fd.get(`tile_remove_${i}`) === "on") continue;
      const label = String(fd.get(`tile_label_${i}`) ?? "").trim();
      if (!label) continue;
      const up = await photo(fd.get(`tile_img_${i}`));
      chips.push({
        label, href: String(fd.get(`tile_href_${i}`) ?? "").trim() || "/shop", image: up ?? String(fd.get(`tile_keep_${i}`) ?? ""),
        eyebrow: String(fd.get(`tile_eyebrow_${i}`) ?? ""), desc: String(fd.get(`tile_desc_${i}`) ?? ""), cta: String(fd.get(`tile_cta_${i}`) ?? ""),
      });
    }
    const f = (k: string) => String(fd.get(k) ?? "");
    const storyPhoto = await photo(fd.get("storyPhoto"));
    const next = cleanHome(
      {
        chips,
        deptEyebrow: f("deptEyebrow"), deptTitle: f("deptTitle"),
        shop: { eyebrow: f("shop_eyebrow"), title: f("shop_title"), intro: f("shop_intro") },
        custom: { eyebrow: f("custom_eyebrow"), title: f("custom_title"), text: f("custom_text"), button: f("custom_button") },
        story: { eyebrow: f("story_eyebrow"), title: f("story_title"), text: f("story_text"), link: f("story_link"), image: storyPhoto ?? prev.story.image },
        benefits: f("benefits").split(/\r?\n/).map((l) => l.split("|")).filter((q) => q[0]?.trim()).map((q) => ({ t: q[0].trim(), d: (q[1] ?? "").trim() })),
        newsletterTitle: f("newsletterTitle"), newsletterSub: f("newsletterSub"),
      },
      prev,
    );
    await saveHome(next);
    await audit(s.id, "storefront.home.sections", "settings", "storeHome", { chips: prev.chips.length }, { chips: next.chips.length });
    refreshAll();
    return { ok: true, msg: "Saved. The homepage sections are updated." };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Kept so older imports still compile: the old feature banner is no longer on the homepage. */
export async function saveFeature(_: R, __: FormData): Promise<R> {
  return { ok: true, msg: "This banner is no longer used." };
}
