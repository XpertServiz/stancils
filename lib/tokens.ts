import { createHmac, timingSafeEqual } from "crypto";

const key = () => process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me";

/** Short signed token that lets a guest view their own order page. */
export function orderToken(orderId: string) {
  return createHmac("sha256", key()).update(`order:${orderId}`).digest("base64url").slice(0, 22);
}
export function checkOrderToken(orderId: string, token: string | undefined | null) {
  if (!token) return false;
  const a = Buffer.from(orderToken(orderId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
