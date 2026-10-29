import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/server/admin-auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm py-20">
      <p className="font-serif text-3xl tracking-[0.3em]">PEACOTEX</p>
      <h1 className="mt-6 text-3xl font-light">Admin sign-in</h1>
      <LoginForm />
    </div>
  );
}
