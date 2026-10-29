import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="eyebrow mb-3">404</p>
        <h1 className="text-4xl font-bold">This page fell through the stencil.</h1>
        <p className="mt-3 text-ink2">It may have moved. Try the shop or search.</p>
        <div className="mt-6 flex justify-center gap-2"><Link href="/" className="btn btn-ghost">Home</Link><Link href="/shop" className="btn btn-primary">Shop stencils</Link></div>
      </div>
    </div>
  );
}
