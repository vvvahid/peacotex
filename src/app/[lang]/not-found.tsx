"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-48 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl font-light">{t.notFound.title}</h1>
      <Link href={href("/shop")} className="btn btn-gold mt-8">{t.notFound.browse}</Link>
    </div>
  );
}
