import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { DesignArt } from "@/components/DesignArt";

export const metadata: Metadata = { title: "Stencil Tutorials & Guides", description: "How to stencil walls, floors, furniture, cakes and lattes — step-by-step guides.", alternates: { canonical: "/tutorials" } };

export default async function Tutorials() {
  const posts = await db.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="eyebrow mb-2">Learn</p>
      <h1 className="mb-8 text-4xl font-bold">Tutorials & guides</h1>
      <div className="grid gap-5 md:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/tutorials/${p.slug}`} className="tilt card group overflow-hidden">
            <div className="art-tile aspect-[16/9] p-6 text-mint/80"><DesignArt svg={p.coverSvg} uid={`t${p.id}`} className="h-full w-full" /></div>
            <div className="p-5"><span className="badge badge-muted capitalize">{p.kind}</span><h2 className="mt-2 font-bold group-hover:text-accent">{p.title}</h2><p className="mt-1 text-sm text-ink2">{p.excerpt}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
