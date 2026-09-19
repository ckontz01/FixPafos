"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Unlink } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { isMessageKey } from "@/lib/i18n";
import type { Issue } from "@/lib/issues";

type Suggestion = { issue: Issue; primary: Issue | null };

/**
 * Moderation queue for suggested duplicates.
 *
 * Only links the system was not confident enough to apply on its own appear
 * here. Both reports are shown side by side with the reason and the distance,
 * so the decision is made on evidence rather than on trust in the suggestion.
 */
export default function ClusterReview({ password }: { password: string }) {
  const { t, timeAgo } = useI18n();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
      setSuggestions((await call({ action: "clusters" })).clusters);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  async function review(id: string, outcome: "confirmed" | "separated") {
    setBusy(id);
    setError("");
    try {
      await call({ action: "review-cluster", id, outcome });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="cluster-review">
      <h2>
        <Copy size={18} aria-hidden="true" /> {t("moderation.clusterTitle")}
      </h2>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!suggestions.length && !error && (
        <p className="muted">{t("moderation.clusterEmpty")}</p>
      )}
      {suggestions.map(({ issue, primary }) => (
        <article className="quarantine-item" key={issue.id}>
          <span className="small-label">
            {t("cluster.pendingReview")}
            {issue.cluster
              ? ` · ${t("cluster.distance", { metres: issue.cluster.distanceMetres })}`
              : ""}
          </span>
          <div className="cluster-pair">
            <div>
              <strong>{issue.location.label}</strong>
              <p>{issue.message}</p>
              <span className="muted">
                {issue.author} · {timeAgo(issue.createdAt)}
              </span>
            </div>
            <div>
              <strong>{primary?.location.label ?? t("common.notAvailable")}</strong>
              <p>{primary?.message ?? ""}</p>
              {primary && (
                <span className="muted">
                  {primary.author} · {timeAgo(primary.createdAt)}
                </span>
              )}
            </div>
          </div>
          {issue.cluster?.reason && (
            <p className="fine-print">
              {t("cluster.why")} {issue.cluster.reason}
            </p>
          )}
          <div className="team-buttons">
            <button
              className="button"
              disabled={busy === issue.id || !primary}
              onClick={() => void review(issue.id, "confirmed")}
            >
              <Check size={15} /> {t("moderation.clusterConfirm")}
            </button>
            <button
              className="button secondary"
              disabled={busy === issue.id}
              onClick={() => void review(issue.id, "separated")}
            >
              <Unlink size={15} /> {t("moderation.clusterSeparate")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
