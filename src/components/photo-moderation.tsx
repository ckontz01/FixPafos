"use client";
import { useCallback, useEffect, useState } from "react";
type Photo = {
  id: string;
  status: string;
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
      if (!res.ok) throw new Error((await res.json()).error);
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
      <span className="small-label">Photo · {photo.status}</span>
      <h3>{photo.report.location.label}</h3>
      <p>{photo.report.message}</p>
      {preview ? (
        // Authenticated private preview uses a short-lived browser object URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="issue-photo"
          src={preview}
          alt="Photo awaiting moderation"
        />
      ) : (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void action("view")}
        >
          View private photo
        </button>
      )}
      <div className="team-buttons">
        <button
          className="button"
          disabled={busy || !preview || photo.status === "approved"}
          onClick={() => void action("approve")}
        >
          Approve photo
        </button>
        <button
          className="button secondary"
          disabled={busy || photo.status === "rejected"}
          onClick={() => void action("reject")}
        >
          Reject photo
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
      if (!res.ok) throw new Error(result.error);
      setPhotos(result.photos);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [password]);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  return (
    <section className="photo-review">
      <h2>Photo review</h2>
      <p>
        Check for inappropriate content and personal information before
        publishing. Approving a photo only makes it public when its report is
        also published.
      </p>
      <button className="button secondary" onClick={() => void refresh()}>
        Refresh photos
      </button>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!photos.length && !error && (
        <p className="muted">No photos to review.</p>
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
