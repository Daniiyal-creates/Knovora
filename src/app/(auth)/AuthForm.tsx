"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const isLogin = mode === "login";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <Link href="/" className="text-2xl font-bold">
          Knovora
        </Link>
        <h1 className="mt-4 text-xl font-semibold">
          {isLogin ? "Sign in to your workspace" : "Create your workspace"}
        </h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>

        {state.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        {state.notice ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{state.notice}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-600">
        {isLogin ? (
          <>
            New to Knovora?{" "}
            <Link href="/signup" className="font-medium text-brand">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
