"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { QuarantineItem } from "@/lib/issues";
import PhotoModeration from "@/components/photo-moderation";
import FlagReview from "@/components/flag-review";
import ClusterReview from "@/components/cluster-review";
import ExportPanel from "@/components/export-panel";
import { useI18n } from "@/components/i18n-provider";
import { isMessageKey } from "@/lib/i18n";
export default function Moderation() {
  const { t } = useI18n();
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
    if (!res.ok)
      throw new Error(isMessageKey(result.code) ? t(result.code) : result.error);
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
        <Image src="/fixpafos-logo.png" alt="" width={28} height={28} />
        <ArrowLeft size={17} /> {t("app.name")}
      </Link>
      <ShieldCheck size={32} />
      <h1>{t("moderation.title")}</h1>
      <p>{t("moderation.intro")}</p>
      {items === null ? (
        <form className="admin-login" onSubmit={load}>
          <label>
            {t("moderation.password")}
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? t("moderation.checking") : t("moderation.open")}
          </button>
        </form>
      ) : (
        <>
          <div className="moderation-toolbar">
            <span>
              {t("moderation.awaiting", {
                count: items.filter((i) => i.status === "pending").length,
              })}
            </span>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void load()}
            >
              {t("common.refresh")}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setPassword("");
                setItems(null);
              }}
              disabled={busy}
            >
              {t("moderation.lock")}
            </button>
          </div>
          {items.length === 0 && (
            <div className="empty-state">
              <h2>{t("moderation.emptyTitle")}</h2>
              <p>{t("moderation.emptyBody")}</p>
            </div>
          )}
          <ExportPanel password={password} />
          <FlagReview password={password} />
          <ClusterReview password={password} />
          <PhotoModeration password={password} />
          {items.map((i) => (
            <article className="quarantine-item" key={i.id}>
              <span className="small-label">
                {t("moderation.quarantineMeta", {
                  type: i.submissionType,
                  status: i.status,
                  blockedBy: i.blockedBy,
                  category: i.category,
                })}
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
                  ? t("moderation.published")
                  : busy
                    ? t("common.pleaseWait")
                    : t("moderation.approve")}
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
