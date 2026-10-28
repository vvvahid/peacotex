import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-48 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl font-light">This page has been cut from the roll.</h1>
      <Link href="/shop" className="btn btn-gold mt-8">Browse fabrics</Link>
    </div>
  );
}
