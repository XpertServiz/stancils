"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { compressImage } from "./compress";
import { thumb } from "@/lib/img";
import { addPhoto } from "@/app/admin/actions/quick";
import { makeCover } from "@/app/admin/actions/quick";
import { deleteImage } from "@/app/admin/actions/products";

export function ProductPhotos({ productId, images }: { productId: string; images: { id: string; url: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    start(async () => {
      let ok = 0;
      for (const [i, f] of list.entries()) {
        setMsg({ ok: true, text: `Uploading ${i + 1} of ${list.length}…` });
        const fd = new FormData();
        fd.append("productId", productId);
        fd.append("photo", await compressImage(f));
        const r = await addPhoto(null, fd);
        if (r?.ok) ok++;
        else return setMsg({ ok: false, text: r?.msg ?? "Upload failed" });
      }
      setMsg({ ok: true, text: `${ok} photo${ok === 1 ? "" : "s"} added.` });
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((im, i) => (
          <div key={im.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-s1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(im.url)!} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-onaccent">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              {i > 0 && <form action={makeCover} className="flex-1"><input type="hidden" name="id" value={im.id} /><button className="w-full rounded bg-white/90 px-1 py-1 text-[11px] font-semibold text-black">Make main</button></form>}
              <form action={deleteImage} className="flex-1"><input type="hidden" name="id" value={im.id} /><button className="w-full rounded bg-white/90 px-1 py-1 text-[11px] font-semibold text-danger" aria-label="Delete photo">Delete</button></form>
            </div>
          </div>
        ))}
        {images.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-line p-4 text-sm text-ink3">No photos yet. The product will not show on your website until it has one.</p>}
      </div>
      <label className="btn btn-primary btn-sm cursor-pointer">
        {pending ? "Uploading…" : "Add photos"}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={pending} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </label>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
