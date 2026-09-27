"use client";

import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type SyncStatus = "connecting" | "live" | "offline";

interface Props {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  readOnly: boolean;
}

// How long to wait after the user stops typing before saving to Postgres.
// This is the durable save - separate from the live broadcast below, which
// fires much more eagerly since it's cheap (no DB write, just a message).
const AUTOSAVE_DELAY_MS = 800;

// Every browser tab gets a random id so it can tell "an update I sent" apart
// from "an update someone else sent" - without this, applying our own
// broadcast back to ourselves could fight with what we're actively typing.
const CLIENT_ID = Math.random().toString(36).slice(2);

const WS_URL = process.env.NEXT_PUBLIC_SYNC_WS_URL ?? "ws://localhost:4000";

export function DocumentEditor({ documentId, initialTitle, initialContent, readOnly }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

  // Open one WebSocket connection per document view, join that document's
  // "room" on the sync server, and apply any content another client
  // broadcasts. This is intentionally simple: whichever update arrives last
  // wins, with no merge logic - a known, documented limitation (see README).
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setSyncStatus("live");
      socket.send(JSON.stringify({ type: "join", documentId }));
    };

    socket.onclose = () => setSyncStatus("offline");
    socket.onerror = () => setSyncStatus("offline");

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "update" && msg.senderId !== CLIENT_ID) {
          setContent(msg.content);
        }
      } catch {
        // ignore malformed messages rather than crashing the editor
      }
    };

    return () => socket.close();
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function broadcast(nextContent: string) {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({ type: "update", documentId, content: nextContent, senderId: CLIENT_ID })
      );
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave(value, content);
  }

  function handleContentChange(value: string) {
    setContent(value);
    scheduleSave(title, value);
    broadcast(value); // live update to other viewers - separate from the debounced DB save
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
        <span className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-400">
          <span
            className={
              syncStatus === "live"
                ? "flex items-center gap-1 text-emerald-600"
                : syncStatus === "connecting"
                  ? "flex items-center gap-1 text-slate-400"
                  : "flex items-center gap-1 text-amber-600"
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (syncStatus === "live"
                  ? "bg-emerald-500"
                  : syncStatus === "connecting"
                    ? "bg-slate-400"
                    : "bg-amber-500")
              }
            />
            {syncStatus === "live" ? "Live" : syncStatus === "connecting" ? "Connecting..." : "Offline"}
          </span>
          <span>
            {status === "saving" && "Saving..."}
            {status === "saved" && "Saved"}
            {status === "error" && "Failed to save"}
          </span>
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
    </div>
  );
}
