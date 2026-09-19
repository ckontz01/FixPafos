"use client";
import { useCallback, useEffect, useState } from "react";
import type { PhotoReview } from "@/lib/photo-review";
import { useI18n } from "./i18n-provider";
import { isMessageKey } from "@/lib/i18n";
type Photo = {
  id: string;
  status: string;
  aiReview?: PhotoReview | null;
  reviewedBy?: string | null;
  report: { message: string; location: { label: string } };
};
function ReviewPhoto({
  photo,
  password,
  refresh,
}: {
  photo: Photo;
  password: string;
  refresh: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function action(action: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/moderation/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id: photo.id, action }),
      });
      if (!res.ok) {
        const failure = await res.json();
        throw new Error(
          isMessageKey(failure.code) ? t(failure.code) : failure.error,
        );
      }
      if (action === "view") setPreview(URL.createObjectURL(await res.blob()));
      else await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="quarantine-item">
      <span className="small-label">
        {photo.status === "approved"
          ? t("photo.approved")
          : photo.status === "rejected"
            ? t("photo.rejected")
            : t("photo.pending")}
      </span>
      <h3>{photo.report.location.label}</h3>
      <p>{photo.report.message}</p>
      <p className="fine-print">
        {photo.reviewedBy === "deepseek"
          ? t("photo.autoApproved")
          : photo.status !== "pending"
            ? t("photo.reviewedByModerator")
            : t("photo.needsReview")}
        {photo.aiReview ? (
          <>
            {photo.aiReview.source === "deepseek" &&
              t("photo.aiAssessment", {
                category: photo.aiReview.category,
                confidence: photo.aiReview.confidence,
              })}
            {photo.aiReview.reason}
          </>
        ) : (
          t("photo.noAssessment")
        )}
      </p>
      {preview ? (
        // Authenticated private preview uses a short-lived browser object URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="issue-photo"
          src={preview}
          alt={t("photo.awaitingAlt")}
        />
      ) : (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void action("view")}
        >
          {t("photo.view")}
        </button>
      )}
      <div className="team-buttons">
        <button
          className="button"
          disabled={busy || !preview || photo.status === "approved"}
          onClick={() => void action("approve")}
        >
          {t("photo.approve")}
        </button>
        <button
          className="button secondary"
          disabled={busy || photo.status === "rejected"}
          onClick={() => void action("reject")}
        >
          {t("photo.reject")}
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
export default function PhotoModeration({ password }: { password: string }) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/moderation/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(
          isMessageKey(result.code) ? t(result.code) : result.error,
        );
      setPhotos(result.photos);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [password, t]);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  return (
    <section className="photo-review">
      <h2>{t("photo.reviewTitle")}</h2>
      <p>{t("moderation.photoIntro")}</p>
      <button className="button secondary" onClick={() => void refresh()}>
        {t("moderation.refreshPhotos")}
      </button>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!photos.length && !error && (
        <p className="muted">{t("photo.noneToReview")}</p>
      )}
      {photos.map((photo) => (
        <ReviewPhoto
          key={photo.id}
          photo={photo}
          password={password}
          refresh={refresh}
        />
      ))}
    </section>
  );
}
