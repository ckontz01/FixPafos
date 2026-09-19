"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { LOCALE_TAGS } from "@/lib/i18n";

/**
 * Dictation for the report description.
 *
 * This exists for accessibility: typing a paragraph on a phone, outdoors,
 * standing next to the problem, excludes people with limited dexterity or
 * vision and anyone less comfortable writing. Speech recognition runs in the
 * browser using the reader's own interface language, so Greek, English and
 * Russian all work without sending audio anywhere.
 *
 * The transcript is appended to the existing text for the person to read and
 * correct. It is never submitted on their behalf: dictation only fills the
 * field, and the ordinary submit button remains the only way to publish.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

/** Support never changes during a session, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};

const speechRecognitionCtor = () => {
  if (typeof window === "undefined") return undefined;
  const speech = window as SpeechWindow;
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
};

export default function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  // Browser-only capability read through useSyncExternalStore, so the server
  // render (unsupported) and the first client render agree and no state is set
  // from an effect.
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => Boolean(speechRecognitionCtor()),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  // Stop any active recognition when the form is closed.
  useEffect(() => () => recognition.current?.stop(), []);

  function start() {
    const Recognition = speechRecognitionCtor();
    if (!Recognition) return;
    setError("");

    const instance = new Recognition();
    instance.lang = LOCALE_TAGS[locale];
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) text += `${result[0].transcript} `;
      }
      if (text.trim()) onTranscript(text.trim());
    };
    instance.onerror = () => {
      setError(t("voice.error"));
      setListening(false);
    };
    instance.onend = () => setListening(false);

    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      setError(t("voice.error"));
    }
  }

  function stop() {
    recognition.current?.stop();
    setListening(false);
  }

  if (!supported)
    return <p className="fine-print">{t("voice.unsupported")}</p>;

  return (
    <div className="voice-input">
      <button
        type="button"
        className={`button secondary${listening ? " listening" : ""}`}
        disabled={disabled}
        aria-pressed={listening}
        onClick={listening ? stop : start}
      >
        {listening ? <Square size={15} /> : <Mic size={15} />}
        {listening ? t("voice.stop") : t("voice.start")}
      </button>
      <p className="fine-print" role="status">
        {listening ? t("voice.listening") : t("voice.review")}
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
