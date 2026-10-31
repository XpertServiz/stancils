"use server";
// DECISION: content edits publish immediately and every change snapshots the page into
// ContentVersion, so "rollback" covers the draft/preview need with far less machinery.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";
import { pingIndexNow } from "@/lib/seo";
import { SECTION_LIBRARY } from "@/lib/sections";
import { DEFAULT_THEME, FONTS, THEMES, hexToTriplet } from "@/lib/themes";

type R = { ok: boolean; msg: string } | null;

async function snapshot(page: string, byId: string) {
  const sections = await db.pageSection.findMany({ where: { page, deletedAt: null }, orderBy: { sort: "asc" } });
  await db.contentVersion.create({ data: { page, snapshot: JSON.parse(JSON.stringify(sections)), byId } });
}

const refresh = () => {
  revalidatePath("/", "layout");
  revalidatePath("/admin/website");
};



export async function sectionOp(fd: FormData) {
  const s = await requirePermission("content.edit");
  const id = String(fd.get("id") || "");
  const op = String(fd.get("op"));
  const page = String(fd.get("page") || "home");
  if (op === "add") {
    const type = String(fd.get("type"));
    const max = (await db.pageSection.aggregate({ where: { page }, _max: { sort: true } }))._max.sort ?? 0;
    await db.pageSection.create({ data: { page, type, title: SECTION_LIBRARY[type] ?? "New section", sort: max + 1 } });
  } else {
    const sec = await db.pageSection.findUniqueOrThrow({ where: { id } });
    if (op === "toggle") await db.pageSection.update({ where: { id }, data: { visible: !sec.visible } });
    if (op === "delete") await db.pageSection.update({ where: { id }, data: { deletedAt: new Date() } });
    if (op === "restore") await db.pageSection.update({ where: { id }, data: { deletedAt: null } });
    if (op === "purge") await db.pageSection.delete({ where: { id } });
    if (op === "duplicate") await db.pageSection.create({ data: { page: sec.page, type: sec.type, title: sec.title, subtitle: sec.subtitle, data: sec.data ?? {}, sort: sec.sort + 1, visible: false } });
    if (op === "up" || op === "down") {
      const list = await db.pageSection.findMany({ where: { page: sec.page, deletedAt: null }, orderBy: { sort: "asc" } });
      const i = list.findIndex((x) => x.id === id);
      const j = op === "up" ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) {
        [list[i], list[j]] = [list[j], list[i]];
        await db.$transaction(list.map((x, k) => db.pageSection.update({ where: { id: x.id }, data: { sort: k } })));
      }
    }
  }
  await snapshot(page, s.id);
  await audit(s.id, `section.${op}`, "page_section", id || page);
  refresh();
}

export async function saveSection(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const id = String(fd.get("id"));
    const sec = await db.pageSection.findUniqueOrThrow({ where: { id } });
    let data = sec.data as Record<string, unknown>;
    const raw = String(fd.get("data") || "").trim();
    if (raw) {
      try { data = JSON.parse(raw); } catch { return { ok: false, msg: "Advanced data must be valid JSON." }; }
    }
    if (sec.type === "problem_solution") {
      const items = [0, 1, 2, 3, 4, 5].map((i) => ({ problem: String(fd.get(`p${i}`) || ""), solution: String(fd.get(`s${i}`) || "") })).filter((x) => x.problem || x.solution);
      data = { ...data, items };
    }
    if (sec.type === "text") data = { ...data, body: String(fd.get("body") || ""), stone: fd.get("stone") === "on" };
    await db.pageSection.update({ where: { id }, data: { title: String(fd.get("title") || "") || null, subtitle: String(fd.get("subtitle") || "") || null, data: data as object } });
    await snapshot(sec.page, s.id);
    await audit(s.id, "section.update", "page_section", id, { title: sec.title }, { title: fd.get("title") });
    refresh();
    return { ok: true, msg: "Published." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function rollbackVersion(fd: FormData) {
  const s = await requirePermission("content.publish");
  const v = await db.contentVersion.findUniqueOrThrow({ where: { id: String(fd.get("id")) } });
  const rows = v.snapshot as { id: string; type: string; title: string | null; subtitle: string | null; data: object; sort: number; visible: boolean }[];
  await db.$transaction([
    db.pageSection.updateMany({ where: { page: v.page, deletedAt: null }, data: { deletedAt: new Date() } }),
    ...rows.map((r) => db.pageSection.upsert({ where: { id: r.id }, create: { ...r, page: v.page, deletedAt: null }, update: { type: r.type, title: r.title, subtitle: r.subtitle, data: r.data, sort: r.sort, visible: r.visible, deletedAt: null } })),
  ]);
  await audit(s.id, "content.rollback", "content_version", v.id);
  refresh();
}

export async function saveSiteSettings(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const lines = (k: string) => String(fd.get(k) || "").split("\n").map((x) => x.trim()).filter(Boolean);
    await setSetting("hero", {
      mode: String(fd.get("mode")), eyebrow: String(fd.get("eyebrow")), headline: String(fd.get("headline")), sub: String(fd.get("sub")),
      primaryCta: { label: String(fd.get("p_label")), href: String(fd.get("p_href")) }, secondaryCta: { label: String(fd.get("s_label")), href: String(fd.get("s_href")) },
      featuredSlug: String(fd.get("featuredSlug") || ""), videoUrl: String(fd.get("videoUrl") || ""), imageUrl: String(fd.get("imageUrl") || ""), trust: lines("trust"),
    });
    await setSetting("announcement", { enabled: fd.get("ann_enabled") === "on", text: String(fd.get("ann_text") || "") });
    await setSetting("splash", { enabled: fd.get("splash") === "on" });
    await setSetting("seo", { title: String(fd.get("seo_title")), description: String(fd.get("seo_desc")) });
    await audit(s.id, "site.settings", "settings", "hero");
    refresh();
    return { ok: true, msg: "Published." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function saveAppearance(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("appearance.manage");
  const preset = String(fd.get("preset") || DEFAULT_THEME);
  if (!THEMES.some((t) => t.id === preset)) return { ok: false, msg: "Unknown theme." };
  const accent = fd.get("useAccent") === "on" ? String(fd.get("accent") || "") : "";
  if (accent && !hexToTriplet(accent)) return { ok: false, msg: "Main colour must be a hex colour like #2563EB." };
  const displayFont = String(fd.get("displayFont"));
  const bodyFont = String(fd.get("bodyFont"));
  if (!FONTS[displayFont] || !FONTS[bodyFont]) return { ok: false, msg: "Unknown font." };
  const style = String(fd.get("splashStyle") || "cube") as "cube" | "laser" | "layers" | "spray";
  await setSetting("theme", { preset, accent, displayFont, bodyFont });
  await setSetting("splash", { enabled: fd.get("splash") === "on", style });
  await audit(s.id, "appearance.update", "settings", "theme", undefined, { preset, accent, displayFont, bodyFont, splash: style });
  refresh();
  return { ok: true, msg: "Applied to the live site." };
}

export async function saveFaq(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("content.edit");
  const id = String(fd.get("id") || "");
  const op = String(fd.get("op") || "save");
  if (op === "delete" && id) await db.faq.delete({ where: { id } });
  else {
    const data = { question: String(fd.get("question")), answer: String(fd.get("answer")), page: String(fd.get("page") || "home"), sort: Number(fd.get("sort")) || 0, visible: fd.get("visible") === "on" };
    if (!data.question || !data.answer) return { ok: false, msg: "Question and answer are required." };
    if (id) await db.faq.update({ where: { id }, data });
    else await db.faq.create({ data });
  }
  await audit(s.id, `faq.${op}`, "faq", id);
  refresh();
  return { ok: true, msg: "Saved." };
}

export async function savePost(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.publish");
    const id = String(fd.get("id") || "");
    const slug = String(fd.get("slug") || fd.get("title")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const data = {
      title: String(fd.get("title")), slug, excerpt: String(fd.get("excerpt") || "") || null, body: String(fd.get("body") || ""), kind: String(fd.get("kind") || "blog"),
      videoUrl: String(fd.get("videoUrl") || "") || null, published: fd.get("published") === "on", seoTitle: String(fd.get("seoTitle") || "") || null, seoDesc: String(fd.get("seoDesc") || "") || null,
      tags: String(fd.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
    };
    const post = id ? await db.blogPost.update({ where: { id }, data }) : await db.blogPost.create({ data });
    await audit(s.id, id ? "post.update" : "post.create", "blog_post", post.id);
    revalidatePath(`/tutorials/${post.slug}`);
    revalidatePath("/tutorials");
    void pingIndexNow([`/tutorials/${post.slug}`]);
    if (!id) redirect(`/admin/website/blog?edit=${post.id}`);
    return { ok: true, msg: "Saved." };
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { ok: false, msg: (e as Error).message.includes("Unique") ? "That slug is taken." : (e as Error).message };
  }
}

export async function deletePost(fd: FormData) {
  const s = await requirePermission("content.publish");
  const p = await db.blogPost.delete({ where: { id: String(fd.get("id")) } });
  await db.redirect.upsert({ where: { from: `/tutorials/${p.slug}` }, create: { from: `/tutorials/${p.slug}`, to: "/tutorials" }, update: { to: "/tutorials" } });
  await audit(s.id, "post.delete", "blog_post", p.id);
  revalidatePath("/tutorials");
  redirect("/admin/website/blog");
}

export async function saveCollection(_: R, fd: FormData): Promise<R> {
  try {
    const s = await requirePermission("content.edit");
    const id = String(fd.get("id") || "");
    const data = {
      name: String(fd.get("name")), slug: String(fd.get("slug")).toLowerCase().replace(/[^a-z0-9-]+/g, "-"), type: String(fd.get("type")) as "SURFACE" | "STYLE" | "OCCASION",
      description: String(fd.get("description") || "") || null, seoTitle: String(fd.get("seoTitle") || "") || null, seoDesc: String(fd.get("seoDesc") || "") || null, sort: Number(fd.get("sort")) || 0,
    };
    if (id) {
      const before = await db.collection.findUniqueOrThrow({ where: { id } });
      await db.collection.update({ where: { id }, data });
      if (before.slug !== data.slug) await db.redirect.upsert({ where: { from: `/c/${before.slug}` }, create: { from: `/c/${before.slug}`, to: `/c/${data.slug}` }, update: { to: `/c/${data.slug}` } });
    } else await db.collection.create({ data });
    await audit(s.id, id ? "collection.update" : "collection.create", "collection", id || data.slug);
    refresh();
    return { ok: true, msg: "Saved." };
  } catch (e) { return { ok: false, msg: (e as Error).message }; }
}

export async function saveStory(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("content.edit");
  const id = String(fd.get("id") || "");
  if (fd.get("op") === "delete" && id) {
    await db.projectStory.delete({ where: { id } });
  } else {
    const data = {
      title: String(fd.get("title")), surface: String(fd.get("surface")), summary: String(fd.get("summary")), quote: String(fd.get("quote") || "") || null,
      author: String(fd.get("author") || "") || null, hours: Number(fd.get("hours")) || null, productSlugs: String(fd.get("productSlugs") || "").split(",").map((x) => x.trim()).filter(Boolean),
      sort: Number(fd.get("sort")) || 0, visible: fd.get("visible") === "on",
    };
    if (id) await db.projectStory.update({ where: { id }, data });
    else {
      const p = data.productSlugs[0] ? await db.product.findUnique({ where: { slug: data.productSlugs[0] } }) : null;
      await db.projectStory.create({ data: { ...data, afterSvg: p?.designSvg } });
    }
  }
  await audit(s.id, "story.save", "project_story", id);
  refresh();
  return { ok: true, msg: "Saved." };
}

export async function saveLegal(_: R, fd: FormData): Promise<R> {
  const s = await requirePermission("content.publish");
  const slug = String(fd.get("slug"));
  const page = `legal:${slug}`;
  const existing = await db.pageSection.findFirst({ where: { page } });
  const data = { body: String(fd.get("body") || "") };
  if (existing) await db.pageSection.update({ where: { id: existing.id }, data: { title: String(fd.get("title")), data, deletedAt: null } });
  else await db.pageSection.create({ data: { page, type: "legal", title: String(fd.get("title")), data } });
  await audit(s.id, "legal.update", "page_section", page);
  revalidatePath(`/legal/${slug}`);
  return { ok: true, msg: "Published." };
}
