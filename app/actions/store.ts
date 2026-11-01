"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword, endCustomerSession, getCustomer, hashPassword, startCustomerSession } from "@/lib/auth";

type R = { ok: boolean; msg: string } | null;

export async function subscribe(_: R, fd: FormData): Promise<R> {
  const email = z.string().email().safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, msg: "Please enter a valid email." };
  await db.subscriber.upsert({ where: { email: email.data }, create: { email: email.data }, update: {} });
  return { ok: true, msg: "You're in! Use WELCOME10 on your first order." };
}

const Inquiry = z.object({
  kind: z.enum(["contact", "custom", "b2b", "missing"]).default("contact"),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(5).max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitInquiry(_: R, fd: FormData): Promise<R> {
  const parsed = Inquiry.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: "Please fill in your name, a valid email and a message." };
  const { website: _w, ...data } = parsed.data;
  void _w;
  await db.inquiry.create({ data });
  await db.alert.create({ data: { type: "inquiry", message: `New ${data.kind} inquiry from ${data.name}`, link: "/admin/inbox" } });
  return { ok: true, msg: "Thanks! We'll reply within one business day." };
}

const ReviewSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(3000),
  productId: z.string().optional(),
  orderNumber: z.string().optional(),
});

const BANNED = /(https?:\/\/|www\.|viagra|casino|crypto)/i;

export async function submitReview(_: R, fd: FormData): Promise<R> {
  const parsed = ReviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, msg: "Please add your name, email, a rating and at least a sentence." };
  const d = parsed.data;
  const email = d.email.toLowerCase();
  let verified = false;
  let orderId: string | undefined;
  if (d.orderNumber) {
    const o = await db.order.findFirst({ where: { number: d.orderNumber.trim().toUpperCase(), email, paymentStatus: "paid" } });
    if (o) {
      verified = true;
      orderId = o.id;
    }
  }
  const recent = await db.review.count({ where: { email, createdAt: { gt: new Date(Date.now() - 86400000) } } });
  const flagged = BANNED.test(d.body) || recent >= 3;
  await db.review.create({
    data: { name: d.name, email, rating: d.rating, title: d.title, body: d.body, productId: d.productId || null, orderId, verified, status: flagged ? "pending" : "published" },
  });
  if (d.productId && !flagged) await refreshRating(d.productId);
  await db.alert.create({ data: { type: "review", severity: d.rating <= 3 ? "warning" : "info", message: `New ${d.rating}★ review from ${d.name}`, link: "/admin/reviews" } });
  return { ok: true, msg: flagged ? "Thanks! Your review will appear after a quick check." : "Thanks — your review is live!" };
}

export async function refreshRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "published" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
}

export async function customerRegister(_: R, fd: FormData): Promise<R> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!z.string().email().safeParse(email).success || password.length < 8) return { ok: false, msg: "Use a valid email and a password of 8+ characters." };
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) return { ok: false, msg: "An account with that email already exists — sign in instead." };
  const c = existing
    ? await db.customer.update({ where: { email }, data: { passwordHash: await hashPassword(password), name: name || existing.name } })
    : await db.customer.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  await db.order.updateMany({ where: { email, customerId: null }, data: { customerId: c.id } });
  await startCustomerSession(c.id);
  redirect("/account");
}

export async function customerLogin(_: R, fd: FormData): Promise<R> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const c = await db.customer.findUnique({ where: { email } });
  if (!c?.passwordHash || !(await checkPassword(String(fd.get("password") ?? ""), c.passwordHash))) return { ok: false, msg: "Email or password is incorrect." };
  await startCustomerSession(c.id);
  redirect(String(fd.get("next") || "/account"));
}

export async function customerLogout() {
  await endCustomerSession();
  redirect("/");
}

export async function applyBusiness(_: R, fd: FormData): Promise<R> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, msg: "Please create an account or sign in first." };
  const company = String(fd.get("company") ?? "").trim();
  if (!company) return { ok: false, msg: "Company name is required." };
  await db.businessAccount.upsert({
    where: { customerId: customer.id },
    create: { customerId: customer.id, company, country: String(fd.get("country") ?? ""), taxId: String(fd.get("taxId") ?? "") || null, notes: String(fd.get("notes") ?? "") || null },
    update: { company, country: String(fd.get("country") ?? ""), taxId: String(fd.get("taxId") ?? "") || null, notes: String(fd.get("notes") ?? "") || null, status: "pending" },
  });
  await db.alert.create({ data: { type: "b2b", message: `Business account application: ${company}`, link: "/admin/b2b" } });
  return { ok: true, msg: "Application received — we'll review it within one business day." };
}

export async function toggleWishlist(productId: string) {
  const c = await getCustomer();
  if (!c) return { ok: false, needLogin: true };
  const existing = await db.wishlistItem.findUnique({ where: { customerId_productId: { customerId: c.id, productId } } });
  if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
  else await db.wishlistItem.create({ data: { customerId: c.id, productId } });
  return { ok: true, saved: !existing };
}
