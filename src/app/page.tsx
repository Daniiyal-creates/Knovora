import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Knovora</h1>
      <p className="text-lg text-neutral-600">
        Turn your documents and websites into an AI assistant that answers in your voice — no code
        required.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-brand px-5 py-2.5 font-medium text-brand-fg hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-50"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
