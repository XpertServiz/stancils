/** Notify IndexNow-compatible search engines (Bing, Yandex, Seznam…) about changed URLs. Fire-and-forget. */
export async function pingIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key || !site || site.includes("localhost") || paths.length === 0) return;
  const host = new URL(site).host;
  await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: paths.map((p) => `${site}${p}`) }),
  }).catch(() => {});
}
