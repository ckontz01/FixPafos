"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { reportChatCopy } from "@/lib/report-chat-copy";
import PhotoPicker from "./photo-picker";

export default function ChatPhoto({
  file,
  onChange,
  onActive,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  onActive: (active: boolean) => void;
}) {
  const { locale, t } = useI18n(),
    c = reportChatCopy[locale];
  const [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    generation = useRef(0);
  const captureInput = useRef<HTMLInputElement>(null);
  const activeCallback = useRef(onActive);
  useEffect(() => {
    activeCallback.current = onActive;
  }, [onActive]);
  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
      activeCallback.current(false);
    },
    [],
  );
  useEffect(() => {
    if (camera && video.current) video.current.srcObject = stream.current;
  }, [camera]);
  function close() {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCamera(false);
    setReady(false);
    setBusy(false);
    onActive(false);
  }
  async function open() {
    if (!navigator.mediaDevices?.getUserMedia) {
      captureInput.current?.click();
      return;
    }
    const run = ++generation.current;
    setError("");
    setBusy(true);
    onActive(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 } },
        audio: false,
      });
      if (run !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
    } catch {
      if (run === generation.current) {
        setError(c.cameraError);
        onActive(false);
      }
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  async function capture() {
    const frame = video.current;
    if (!frame?.videoWidth) return;
    setBusy(true);
    const run = generation.current;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1600 / Math.max(frame.videoWidth, frame.videoHeight),
      );
      canvas.width = Math.round(frame.videoWidth * scale);
      canvas.height = Math.round(frame.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(frame, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (run !== generation.current) return;
      if (!blob) throw new Error();
      onChange(new File([blob], "issue-camera.jpg", { type: "image/jpeg" }));
      close();
    } catch {
      setError(c.cameraError);
      setBusy(false);
    }
  }
  return (
    <div className="chat-media">
      {!camera && (
        <button type="button" className="button" onClick={open} disabled={busy}>
          <Camera size={18} />
          {busy ? c.cameraStarting : c.camera}
        </button>
      )}
      {!camera && busy && (
        <button type="button" className="button secondary" onClick={close}>
          {c.closeCamera}
        </button>
      )}
      <input
        ref={captureInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(event) => {
          const photo = event.target.files?.[0];
          if (
            photo &&
            photo.size <= 4 * 1024 * 1024 &&
            ["image/jpeg", "image/png", "image/webp"].includes(photo.type)
          ) {
            setError("");
            onChange(photo);
          } else if (photo) setError(t("photo.invalidChoice"));
          event.target.value = "";
        }}
      />
      {camera && (
        <div className="chat-camera">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-label={c.cameraPreview}
            onLoadedData={() => setReady(true)}
          />
          <div className="chat-actions">
            <button
              type="button"
              className="button"
              disabled={!ready || busy}
              onClick={capture}
            >
              <Camera size={18} />
              {c.capture}
            </button>
            <button type="button" className="button secondary" onClick={close}>
              <X size={18} />
              {c.closeCamera}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <PhotoPicker file={file} onChange={onChange} disabled={camera || busy} />
      <p className="chat-note">{c.photoNote}</p>
    </div>
  );
}
