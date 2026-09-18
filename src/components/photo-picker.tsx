"use client";
import { useEffect, useRef, useState } from "react";
export default function PhotoPicker({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="photo-picker">
      <label>
        Photo (optional)
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setError("");
            if (
              selected &&
              (selected.size > 4 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(
                  selected.type,
                ))
            ) {
              setError("Choose a JPEG, PNG or WebP photo up to 4 MB.");
              e.target.value = "";
              onChange(null);
              return;
            }
            onChange(selected);
          }}
        />
      </label>
      {file && preview && (
        <>
          {/* Local file preview; Next Image cannot optimize blob URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="issue-photo"
            src={preview}
            alt="Selected photo preview"
          />
          <button
            className="text-link"
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              if (input.current) input.current.value = "";
            }}
          >
            Remove photo
          </button>
        </>
      )}
      <p className="fine-print">
        JPEG, PNG or WebP, up to 4 MB. Photos become public after moderator
        approval. Avoid faces, number plates and personal information.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
