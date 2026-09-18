"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { QuarantineItem } from "@/lib/issues";
import PhotoModeration from "@/components/photo-moderation";
export default function Moderation() {
  const [password, setPassword] = useState(""),
    [items, setItems] = useState<QuarantineItem[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function call(action?: string, id?: string) {
    const res = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action, id }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  }
  async function load(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setItems((await call()).items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish(id: string) {
    setBusy(true);
    setError("");
    try {
      await call("publish", id);
      setItems((await call()).items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="moderation-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={17} /> PafosLive
      </Link>
      <ShieldCheck size={32} />
      <h1>Moderation quarantine</h1>
      <p>
        Review submissions blocked by the profanity filter or DeepSeek. Approved
        items are published to the shared community board.
      </p>
      {items === null ? (
        <form className="admin-login" onSubmit={load}>
          <label>
            Moderation password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Checking…" : "Open quarantine"}
          </button>
        </form>
      ) : (
        <>
          <div className="moderation-toolbar">
            <span>
              {items.filter((i) => i.status === "pending").length} awaiting
              review
            </span>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void load()}
            >
              Refresh
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setPassword("");
                setItems(null);
              }}
              disabled={busy}
            >
              Lock
            </button>
          </div>
          {items.length === 0 && (
            <div className="empty-state">
              <h2>Nothing awaiting review</h2>
              <p>Blocked reports and replies will appear here.</p>
            </div>
          )}
          <PhotoModeration password={password} />
          {items.map((i) => (
            <article className="quarantine-item" key={i.id}>
              <span className="small-label">
                {i.submissionType} · {i.status} · {i.blockedBy} / {i.category}
              </span>
              <h2>{i.submission.author}</h2>
              <p>{i.submission.message}</p>
              {"location" in i.submission && (
                <p className="muted">{i.submission.location.label}</p>
              )}
              <button
                className="button secondary"
                disabled={busy || i.status === "published"}
                onClick={() => void publish(i.id)}
              >
                {i.status === "published"
                  ? "Published"
                  : busy
                    ? "Please wait…"
                    : "Approve & publish"}
              </button>
            </article>
          ))}
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
