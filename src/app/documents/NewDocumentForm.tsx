"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewDocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    setLoading(false);

    if (res.ok) {
      const doc = await res.json();
      setTitle("");
      router.push(`/documents/${doc.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New document title..."
        className="flex-1 rounded border border-slate-300 p-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
