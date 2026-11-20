/** Small version of a picture for cards and lists. The starter-catalogue photos have a 420px copy in /catalog/t/; uploaded photos are used as they are. */
export const thumb = (url: string | null | undefined) => (url && /^\/catalog\/[^/]+\.jpg$/.test(url) ? url.replace("/catalog/", "/catalog/t/") : url ?? null);
