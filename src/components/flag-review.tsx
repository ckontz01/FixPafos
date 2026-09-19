"use client";
import { useCallback, useEffect, useState } from "react";
import { Flag, RotateCcw, EyeOff } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { isMessageKey, type MessageKey } from "@/lib/i18n";
import type { FlaggedIssue } from "@/lib/issues";

/**
 * Moderation queue for flagged reports.
 *
 * Flagging never deletes. A report that reached the hide threshold is withdrawn
 * from the public board and waits here; a moderator restores it or confirms the
 * removal, and either way the report itself is retained.
 */
export default function FlagReview({ password }: { password: string }) {
  const { t, timeAgo } = useI18n();
  const [flagged, setFlagged] = useState<FlaggedIssue[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const call = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...payload }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          isMessageKey(result.code) ? t(result.code) : result.error,
        );
      return result;
    },
    [password, t],
  );

  const refresh = useCallback(async () => {
    try {
      setFlagged((await call({ action: "flags" })).flagged);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  async function review(issueId: string, outcome: "restored" | "removed") {
    setBusy(issueId);
    setError("");
    try {
      await call({ action: "review-flag", id: issueId, outcome });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const pending = flagged.filter((f) => !f.reviewedAt);

  return (
    <section className="flag-review">
      <h2>
        <Flag size={18} aria-hidden="true" /> {t("moderation.flagsTitle")}
      </h2>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!pending.length && !error && (
        <p className="muted">{t("moderation.flagsEmpty")}</p>
      )}
      {pending.map((entry) => (
        <article className="quarantine-item" key={entry.issueId}>
          <span className="small-label">
            {t("moderation.flagCount", { count: entry.flagCount })}
            {entry.hiddenAt ? ` · ${t("flag.hidden")}` : ""}
          </span>
          <h3>{entry.issue.location.label}</h3>
          <p>{entry.issue.message}</p>
          <p className="muted">
            {entry.issue.author} · {timeAgo(entry.issue.createdAt)}
          </p>
          <ul className="flag-reasons">
            {entry.reasons.map((reason) => (
              <li key={reason}>{t(`flag.reason.${reason}` as MessageKey)}</li>
            ))}
          </ul>
          <div className="team-buttons">
            <button
              className="button secondary"
              disabled={busy === entry.issueId}
              onClick={() => void review(entry.issueId, "restored")}
            >
              <RotateCcw size={15} /> {t("moderation.restore")}
            </button>
            <button
              className="button danger"
              disabled={busy === entry.issueId}
              onClick={() => void review(entry.issueId, "removed")}
            >
              <EyeOff size={15} /> {t("moderation.remove")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
