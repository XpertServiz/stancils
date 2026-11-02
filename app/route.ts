import { renderLandingPage } from "@/lib/landing";

// The homepage is the owner's approved design, with its products managed in Admin → Website → Landing products.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await renderLandingPage(), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300" },
  });
}
