"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    // Auto sign-in right after registering, so the user doesn't have to
    // fill the login form again immediately after filling this one.
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/documents");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create an account</h1>

        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-900 p-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
