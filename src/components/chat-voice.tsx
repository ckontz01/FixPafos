"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { reportChatCopy } from "@/lib/report-chat-copy";
import { useI18n } from "./i18n-provider";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<{
          isFinal: boolean;
          [key: number]: { transcript: string };
        }>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function ChatVoice({
  onText,
  onActive,
}: {
  onText: (text: string) => void;
  onActive: (active: boolean) => void;
}) {
  const { locale } = useI18n(),
    c = reportChatCopy[locale];
  const [state, setState] = useState<
    "idle" | "starting" | "recording" | "review"
  >("idle");
  const [transcript, setTranscript] = useState(""),
    [audio, setAudio] = useState<Blob | null>(null),
    [url, setUrl] = useState("");
  const [error, setError] = useState(""),
    [speechUnavailable, setSpeechUnavailable] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    speech = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  const activeCallback = useRef(onActive);
  useEffect(() => {
    activeCallback.current = onActive;
  }, [onActive]);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      speech.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      activeCallback.current(false);
    },
    [],
  );
  useEffect(() => {
    if (!audio) return;
    const objectUrl = URL.createObjectURL(audio);
    // Object URL lifetime follows its blob, including discard and unmount.
    queueMicrotask(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [audio]);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    speech.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    setState("review");
    onActive(false);
  }
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(c.voiceUnsupported);
      return;
    }
    const run = ++generation.current;
    setState("starting");
    onActive(true);
    setError("");
    setTranscript("");
    setAudio(null);
    setUrl("");
    setSpeechUnavailable(false);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (run !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const recording = new MediaRecorder(media),
        chunks: Blob[] = [];
      recorder.current = recording;
      recording.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recording.onstop = () => {
        if (run === generation.current && chunks.length)
          setAudio(
            new Blob(chunks, { type: recording.mimeType || chunks[0].type }),
          );
      };
      recording.onerror = () => {
        if (run === generation.current) {
          setError(c.micError);
          stop();
        }
      };
      recording.start(1000);
      setState("recording");
      const Speech =
        (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition;
      if (Speech) {
        const recognition = new Speech();
        speech.current = recognition;
        recognition.lang = LOCALE_TAGS[locale];
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          if (run !== generation.current) return;
          setTranscript(
            Array.from(event.results, (result) => result[0].transcript)
              .join(" ")
              .trim()
              .slice(0, 1200),
          );
        };
        recognition.onerror = () => {
          if (run === generation.current) setSpeechUnavailable(true);
        };
        recognition.onend = () => {
          if (run === generation.current && recording.state === "recording")
            stop();
        };
        try {
          recognition.start();
        } catch {
          setSpeechUnavailable(true);
        }
      } else setSpeechUnavailable(true);
      timer.current = setTimeout(stop, 90000);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (run === generation.current) {
        setState("idle");
        onActive(false);
        setError(c.micError);
      }
    }
  }
  function discard() {
    generation.current++;
    speech.current?.abort();
    setAudio(null);
    setUrl("");
    setTranscript("");
    setState("idle");
    setError("");
    onActive(false);
  }
  return (
    <section className="chat-voice" aria-label={c.record}>
      <div className="chat-actions">
        {state === "idle" && (
          <button type="button" className="button secondary" onClick={start}>
            <Mic size={18} />
            {c.record}
          </button>
        )}
        {state === "starting" && (
          <>
            <span role="status">{c.starting}</span>
            <button
              type="button"
              className="button secondary"
              onClick={discard}
            >
              {c.discard}
            </button>
          </>
        )}
        {state === "recording" && (
          <>
            <button type="button" className="button" onClick={stop}>
              <Square size={16} />
              {c.stop}
            </button>
            <span role="status">{c.recording}</span>
          </>
        )}
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {state !== "idle" && (
        <>
          {audio && url && <audio controls src={url} aria-label={c.playback} />}
          {speechUnavailable && (
            <p className="chat-note" role="status">
              {c.transcriptUnavailable}
            </p>
          )}
          <label>
            {c.transcript}
            <textarea
              aria-label={c.transcript}
              rows={3}
              maxLength={1200}
              value={transcript}
              readOnly={state !== "review"}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={c.transcriptPlaceholder}
            />
          </label>
          {state === "review" && (
            <div className="chat-actions">
              <button
                type="button"
                className="button"
                disabled={!transcript.trim()}
                onClick={() => {
                  onText(transcript.trim());
                  discard();
                }}
              >
                {c.useTranscript}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={discard}
              >
                {c.discard}
              </button>
            </div>
          )}
        </>
      )}
      <p className="chat-note">{c.voiceNote}</p>
    </section>
  );
}
