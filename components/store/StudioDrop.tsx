"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, Type } from "lucide-react";

/** Homepage drop zone → hands the file to the Studio via sessionStorage. */
export function StudioDrop() {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [text, setText] = useState("");

  const take = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      try { sessionStorage.setItem("cc_studio_upload", String(r.result)); } catch {}
      router.push("/custom-stencils?from=home");
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="card p-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) take(f); }}
        className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${over ? "border-accent bg-accent/10" : "border-line hover:border-accent/60"}`}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-onaccent"><Upload /></div>
        <p className="text-lg font-semibold">Drop your logo or image here</p>
        <p className="text-sm text-ink3">PNG, JPG or SVG · we&apos;ll do the rest</p>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && take(e.target.files[0])} />
      </label>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) router.push(`/custom-stencils?text=${encodeURIComponent(text.trim())}`); }}>
        <div className="relative flex-1">
          <Type size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="…or type words for a lettering stencil" className="input pl-9" maxLength={40} />
        </div>
        <button className="btn btn-primary">Create</button>
      </form>
    </div>
  );
}
