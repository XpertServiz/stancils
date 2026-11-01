import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Markdown } from "@/components/Markdown";
import { DesignArt } from "@/components/DesignArt";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await db.blogPost.findUnique({ where: { slug: (await params).slug } });
  if (!p) return {};
  return { title: p.seoTitle ?? p.title, description: p.seoDesc ?? p.excerpt ?? undefined, alternates: { canonical: `/tutorials/${p.slug}` }, openGraph: { type: "article", title: p.title } };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await db.blogPost.findUnique({ where: { slug: (await params).slug } });
  if (!p || !p.published) notFound();
  const ld = { "@context": "https://schema.org", "@type": p.kind === "tutorial" ? "HowTo" : "Article", name: p.title, headline: p.title, description: p.excerpt, datePublished: p.publishedAt.toISOString(), dateModified: p.updatedAt.toISOString() };
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/tutorials" className="text-sm text-ink3 hover:text-ink">← All guides</Link>
      <h1 className="mt-4 text-4xl font-bold">{p.title}</h1>
      <p className="mt-3 text-lg text-ink2">{p.excerpt}</p>
      <div className="art-tile my-8 aspect-[16/9] rounded-2xl p-8 text-accent/80"><DesignArt svg={p.coverSvg} uid={`a${p.id}`} className="h-full w-full" /></div>
      {p.videoUrl && <div className="mb-8 aspect-video overflow-hidden rounded-2xl"><iframe src={p.videoUrl.replace("watch?v=", "embed/").replace("youtube.com", "youtube-nocookie.com")} title={p.title} className="h-full w-full" allowFullScreen loading="lazy" /></div>}
      <Markdown text={p.body} />
      <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="font-semibold">Ready to try it?</p>
        <div className="flex gap-2"><Link href="/shop" className="btn btn-primary">Shop stencils</Link><Link href="/custom-stencils" className="btn btn-ghost">Make your own</Link></div>
      </div>
    </article>
  );
}
