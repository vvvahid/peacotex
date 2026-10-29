"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block text-sm text-mist">
        Password
        <input
          name="password" type="password" required autoComplete="current-password" autoFocus
          className="mt-2 block h-12 w-full rounded-xl border border-line bg-night px-4 text-ivory focus:border-gold focus:outline-none"
          aria-describedby="login-error"
        />
      </label>
      <p id="login-error" role="alert" className="min-h-5 text-sm text-gold">{state?.error}</p>
      <button type="submit" disabled={pending} className="btn btn-gold w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
