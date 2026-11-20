import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "video/mp4", "video/webm"]);

/**
 * Store a public media file. Uses UploadThing when UPLOADTHING_TOKEN is set (required on Vercel),
 * otherwise writes to /public/uploads for local development.
 */
export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
  if (file.size > 25_000_000) throw new Error("File is larger than 25 MB");
  if (process.env.UPLOADTHING_TOKEN) {
    const { UTApi } = await import("uploadthing/server");
    const res = await new UTApi().uploadFiles(file);
    if (res.error || !res.data) throw new Error(res.error?.message ?? "Upload failed");
    return res.data.ufsUrl ?? res.data.url;
  }
  if (process.env.VERCEL) throw new Error("Set UPLOADTHING_TOKEN to upload media on Vercel.");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
