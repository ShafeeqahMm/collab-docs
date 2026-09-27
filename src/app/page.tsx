import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/documents");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Collab Docs</h1>
      <p className="max-w-md text-center text-slate-600">
        A small collaborative document editor, built to demonstrate a full
        auth + CRUD + (soon) real-time sync stack.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-slate-900 px-4 py-2 text-white">
          Log in
        </Link>
        <Link href="/register" className="rounded border border-slate-300 px-4 py-2">
          Create account
        </Link>
      </div>
    </main>
  );
}
