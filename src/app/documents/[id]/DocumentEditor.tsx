"use client";

import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  readOnly: boolean;
}

// How long to wait after the user stops typing before saving. Long enough
// that we're not firing a PATCH on every keystroke, short enough that a
// closed tab rarely loses more than a second of typing.
const AUTOSAVE_DELAY_MS = 800;

export function DocumentEditor({ documentId, initialTitle, initialContent, readOnly }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(nextTitle: string, nextContent: string) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, content: nextContent }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(nextTitle, nextContent), AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave(value, content);
  }

  function handleContentChange(value: string) {
    setContent(value);
    scheduleSave(title, value);
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={readOnly}
          className="w-full border-none bg-transparent text-2xl font-bold outline-none disabled:text-slate-500"
        />
        <span className="whitespace-nowrap text-xs text-slate-400">
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved"}
          {status === "error" && "Failed to save"}
        </span>
      </div>

      {readOnly && (
        <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-700">
          You have view-only access to this document.
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        disabled={readOnly}
        rows={20}
        className="w-full resize-none rounded border border-slate-200 p-4 font-mono text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
        placeholder="Start writing..."
      />

      {/* NOTE for Phase 2: this is where a WebSocket connection will slot in -
          instead of only PATCHing on a debounce, we'll also broadcast each
          change to other connected clients viewing this same document. */}
    </div>
  );
}
