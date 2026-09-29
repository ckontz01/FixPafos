"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LocateFixed,
  MapPin,
  MessageSquare,
  Send,
} from "lucide-react";
import { useI18n } from "./i18n-provider";
import LanguageSwitcher from "./language-switcher";
import ChatPhoto from "./chat-photo";
import ChatVoice from "./chat-voice";
import { reportChatCopy } from "@/lib/report-chat-copy";
import { parseChatGuidance, type ChatTurn } from "@/lib/report-chat";
import { withinPafos, type IssueLocation, type Issue } from "@/lib/issues";
import { isMessageKey } from "@/lib/i18n";

function MapLoading() {
  const { t } = useI18n();
  return (
    <p className="chat-note" role="status">
      {t("map.loading")}
    </p>
  );
}
const IssueMap = dynamic(() => import("./issue-map"), {
  ssr: false,
  loading: MapLoading,
});
const stages = [
  "details",
  "photo",
  "location",
  "name",
  "review",
  "done",
] as const;
type Stage = (typeof stages)[number];

export default function ChatReporter() {
  const { locale, t } = useI18n(),
    c = reportChatCopy[locale];
  const [stage, setStage] = useState<Stage>("details"),
    [turns, setTurns] = useState<ChatTurn[]>([]),
    [journal, setJournal] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState(""),
    [description, setDescription] = useState(""),
    [aiDraft, setAiDraft] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [position, setPosition] = useState<IssueLocation>(),
    [landmark, setLandmark] = useState(""),
    [author, setAuthor] = useState("");
  const [mapOpen, setMapOpen] = useState(false),
    [locating, setLocating] = useState(false),
    [accuracy, setAccuracy] = useState<number>();
  const [busy, setBusy] = useState(false),
    [voiceActive, setVoiceActive] = useState(false),
    [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false),
    [session, setSession] = useState(0);
  const [retry, setRetry] = useState(false),
    [editing, setEditing] = useState(false);
  const [published, setPublished] = useState<string>(),
    [quarantined, setQuarantined] = useState(false);
  const log = useRef<HTMLDivElement>(null),
    actions = useRef<HTMLDivElement>(null),
    request = useRef<AbortController | null>(null);
  const gpsRun = useRef(0),
    submitting = useRef(false),
    previousStage = useRef(stage);
  const stepIndex = Math.min(stages.indexOf(stage), 4);

  useEffect(
    () => () => {
      request.current?.abort();
      gpsRun.current++;
    },
    [],
  );
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns, journal, busy]);
  useEffect(() => {
    if (previousStage.current !== stage)
      actions.current?.focus({ preventScroll: true });
    previousStage.current = stage;
  }, [stage]);

  function move(next: Stage, answer?: string) {
    gpsRun.current++;
    setLocating(false);
    setError("");
    setRetry(false);
    const prompt =
      next === "photo"
        ? c.photoPrompt
        : next === "location"
          ? c.locationPrompt
          : next === "name"
            ? c.namePrompt
            : next === "review"
              ? c.reviewPrompt
              : "";
    setJournal((current) => [
      ...current,
      ...(answer ? [{ role: "user" as const, content: answer }] : []),
      ...(prompt ? [{ role: "assistant" as const, content: prompt }] : []),
    ]);
    setStage(next);
  }
  async function ask(messages: ChatTurn[]) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 32000);
    setBusy(true);
    setError("");
    setRetry(false);
    try {
      const response = await fetch("/api/report-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          isMessageKey(result.code) && result.code === "error.rateLimited"
            ? t(result.code)
            : c.aiError,
        );
      const guidance = parseChatGuidance(result);
      if (!guidance) throw new Error(c.aiError);
      setTurns([...messages, { role: "assistant", content: guidance.reply }]);
      setDescription(guidance.summary);
      setAiDraft(true);
      if (guidance.ready) move("photo");
    } catch (err) {
      if (request.current === controller) {
        setError(
          controller.signal.aborted
            ? c.aiError
            : err instanceof Error
              ? err.message
              : c.aiError,
        );
        setRetry(true);
      }
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  function send(event: FormEvent) {
    event.preventDefault();
    if (busy || voiceActive || !input.trim() || retry || turns.length >= 12)
      return;
    const next: ChatTurn[] = [
      ...turns,
      { role: "user", content: input.trim() },
    ];
    setTurns(next);
    setInput("");
    void ask(next);
  }
  function ownWords() {
    const text = [
      ...turns
        .filter((turn) => turn.role === "user")
        .map((turn) => turn.content),
      input.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);
    if (!text) return;
    setDescription(text);
    setAiDraft(false);
    move("photo");
  }
  function locate() {
    if (!navigator.geolocation) {
      setError(c.gpsError);
      setMapOpen(true);
      return;
    }
    const run = ++gpsRun.current;
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (run !== gpsRun.current) return;
        setLocating(false);
        setMapOpen(true);
        const { longitude, latitude, accuracy } = result.coords;
        if (!withinPafos(longitude, latitude)) {
          setError(c.outside);
          return;
        }
        setPosition({ longitude, latitude, label: "" });
        setAccuracy(Math.round(accuracy));
      },
      () => {
        if (run === gpsRun.current) {
          setLocating(false);
          setError(c.gpsError);
          setMapOpen(true);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  function pick(location: IssueLocation) {
    gpsRun.current++;
    setLocating(false);
    setPosition(location);
    setAccuracy(undefined);
    setError("");
  }
  function confirmLocation(event: FormEvent) {
    event.preventDefault();
    if (
      !position ||
      !landmark.trim() ||
      !withinPafos(position.longitude, position.latitude)
    ) {
      setError(c.invalid);
      return;
    }
    move(
      editing ? "review" : "name",
      `${landmark.trim()} · ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`,
    );
    setEditing(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (
      !position ||
      !withinPafos(position.longitude, position.latitude) ||
      !author.trim() ||
      !description.trim() ||
      !landmark.trim()
    ) {
      setError(c.invalid);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const report = {
        author: author.trim(),
        message: description.trim(),
        category: "unsure",
        location: { ...position, label: landmark.trim() },
      };
      const form = new FormData();
      form.set("report", JSON.stringify(report));
      if (photo) form.set("photo", photo);
      // One publication path: all existing moderation, classification, photo
      // storage and visibility rules are enforced by the normal report API.
      const response = await fetch("/api/issues", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (
        response.status === 422 &&
        result.code === "error.moderationBlocked"
      ) {
        setQuarantined(true);
        setStage("done");
        return;
      }
      if (!response.ok)
        throw new Error(
          isMessageKey(result.code) ? t(result.code) : c.submitError,
        );
      const post = result.post as Issue;
      if (!post?.id) throw new Error(c.submitError);
      setPublished(post.id);
      setStage("done");
    } catch (err) {
      setError(
        err instanceof Error && err.name !== "TypeError"
          ? err.message
          : c.submitError,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function reset() {
    if (stage !== "done" && !window.confirm(c.restartConfirm)) return;
    request.current?.abort();
    request.current = null;
    gpsRun.current++;
    setSession((current) => current + 1);
    setStage("details");
    setTurns([]);
    setJournal([]);
    setInput("");
    setDescription("");
    setPhoto(null);
    setPreview("");
    setPosition(undefined);
    setLandmark("");
    setAuthor("");
    setAccuracy(undefined);
    setMapOpen(false);
    setLocating(false);
    setBusy(false);
    setError("");
    setRetry(false);
    setEditing(false);
    setPublished(undefined);
    setQuarantined(false);
    setAiDraft(false);
  }
  function edit(next: "photo" | "location") {
    setEditing(true);
    move(next);
  }

  return (
    <div className="chat-page">
      <a className="skip-link" href="#chat-main">
        {t("a11y.skipToContent")}
      </a>
      <header className="site-header chat-header">
        <Link href="/" className="wordmark" aria-label={t("nav.home")}>
          <span className="brand-symbol">
            <Image
              src="/fixpafos-logo.png"
              width={52}
              height={52}
              alt=""
              priority
            />
          </span>
          <span>
            Fix<span className="wordmark-light">Pafos</span>
          </span>
        </Link>
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          {c.back}
        </Link>
        <LanguageSwitcher />
      </header>
      <main id="chat-main" className="chat-layout">
        <aside className="chat-guide">
          <span className="chat-eyebrow">
            <MessageSquare size={16} />
            {c.experimental}
          </span>
          <h1>{c.title}</h1>
          <p className="chat-intro">{c.intro}</p>
          <ol className="chat-progress" aria-label={c.nav}>
            {c.steps.map((label, index) => (
              <li
                key={index}
                data-complete={index < stepIndex || stage === "done"}
                aria-current={
                  stage !== "done" && index === stepIndex ? "step" : undefined
                }
              >
                <span>
                  {index < stepIndex || stage === "done" ? (
                    <Check size={15} />
                  ) : (
                    index + 1
                  )}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <p className="chat-note">{c.privacy}</p>
          <Link className="back-link" href="/?report=1">
            {c.standard}
            <ArrowUpRight size={16} />
          </Link>
          <p className="chat-note chat-emergency">{c.emergency}</p>
        </aside>
        <section className="chat-panel" aria-label={c.assistant}>
          <div className="chat-panel-heading">
            <strong>{c.assistant}</strong>
            <span>{c.experimental}</span>
          </div>
          {stage !== "done" && (
            <div
              className="chat-log"
              ref={log}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {[
                { role: "assistant", content: c.greeting },
                ...turns,
                ...journal,
              ].map((turn, index) => (
                <div className={`chat-bubble ${turn.role}`} key={index}>
                  <span>{turn.role === "user" ? c.you : c.assistant}</span>
                  <p>{turn.content}</p>
                </div>
              ))}
              {busy && stage === "details" && (
                <p className="chat-thinking" role="status">
                  {c.thinking}
                </p>
              )}
            </div>
          )}
          <div
            className="chat-controls"
            ref={actions}
            tabIndex={-1}
            aria-label={c.steps[stepIndex]}
            aria-busy={busy}
          >
            {stage === "details" && (
              <>
                {!retry && turns.length < 12 && (
                  <form onSubmit={send} className="chat-composer">
                    <label>
                      {c.input}
                      <textarea
                        aria-label={c.input}
                        rows={3}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        maxLength={1200}
                        placeholder={c.placeholder}
                        disabled={busy || voiceActive}
                      />
                    </label>
                    <button
                      className="button"
                      disabled={busy || voiceActive || !input.trim()}
                    >
                      <Send size={17} />
                      {c.send}
                    </button>
                  </form>
                )}
                {!busy && !retry && turns.length < 12 && (
                  <ChatVoice
                    key={session}
                    onText={(text) =>
                      setInput((current) =>
                        (current ? `${current} ${text}` : text).slice(0, 1200),
                      )
                    }
                    onActive={setVoiceActive}
                  />
                )}
                {turns.length >= 12 && <p>{c.limit}</p>}
                {!busy && !voiceActive && (
                  <div className="chat-actions">
                    {retry && (
                      <button
                        className="button"
                        onClick={() => void ask(turns)}
                      >
                        {c.retry}
                      </button>
                    )}
                    {!!description && (
                      <button
                        className="button secondary"
                        onClick={() => move("photo")}
                      >
                        {c.continue}
                      </button>
                    )}
                    {(retry || turns.length >= 12) && (
                      <button className="button secondary" onClick={ownWords}>
                        {c.useOwn}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {stage === "photo" && (
              <>
                <ChatPhoto
                  file={photo}
                  onChange={setPhoto}
                  onActive={setCameraActive}
                />
                <div className="chat-actions">
                  {photo && (
                    <button
                      className="button"
                      disabled={cameraActive}
                      onClick={() => {
                        move(editing ? "review" : "location", c.photoAdded);
                        setEditing(false);
                      }}
                    >
                      {c.photoContinue}
                      <ArrowUpRight size={17} />
                    </button>
                  )}
                  <button
                    className="button secondary"
                    disabled={cameraActive}
                    onClick={() => {
                      setPhoto(null);
                      move(editing ? "review" : "location", c.photoSkipped);
                      setEditing(false);
                    }}
                  >
                    {c.photoSkip}
                  </button>
                </div>
              </>
            )}
            {stage === "location" && (
              <form onSubmit={confirmLocation}>
                <div className="chat-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={locate}
                    disabled={locating}
                  >
                    <LocateFixed size={18} />
                    {locating ? c.locating : c.gps}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setMapOpen(true)}
                  >
                    <MapPin size={18} />
                    {c.map}
                  </button>
                </div>
                <p className="chat-note">{c.locationNote}</p>
                {mapOpen && (
                  <div className="chat-location-map">
                    <IssueMap
                      issues={[]}
                      picking
                      focusDraft
                      draft={position}
                      onSelect={() => {}}
                      onPick={pick}
                    />
                  </div>
                )}
                {position && (
                  <p className="chat-location-value" role="status">
                    {c.coordinates}: {position.latitude.toFixed(5)},{" "}
                    {position.longitude.toFixed(5)}
                    {accuracy !== undefined && (
                      <small>
                        {c.accuracy} {accuracy} {c.metres}
                      </small>
                    )}
                  </p>
                )}
                <label>
                  {c.landmark}
                  <input
                    required
                    maxLength={100}
                    value={landmark}
                    onChange={(event) => setLandmark(event.target.value)}
                    placeholder={c.landmarkPlaceholder}
                  />
                </label>
                <button
                  className="button"
                  disabled={!position || !landmark.trim() || locating}
                >
                  {c.locationConfirm}
                  <Check size={17} />
                </button>
              </form>
            )}
            {stage === "name" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (author.trim()) move("review", author.trim());
                }}
              >
                <label>
                  {c.name}
                  <input
                    required
                    maxLength={40}
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    autoComplete="nickname"
                  />
                </label>
                <button className="button" disabled={!author.trim()}>
                  {c.nameContinue}
                  <ArrowUpRight size={17} />
                </button>
              </form>
            )}
            {stage === "review" && (
              <form onSubmit={submit}>
                <fieldset disabled={busy}>
                  <p className="chat-draft-label">
                    {aiDraft ? c.aiDraft : c.ownDraft}
                  </p>
                  <label>
                    {c.description}
                    <textarea
                      aria-label={c.description}
                      required
                      rows={5}
                      maxLength={500}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                    <span className="field-count">
                      {description.length}/500
                    </span>
                  </label>
                  <label>
                    {c.name}
                    <input
                      required
                      maxLength={40}
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                    />
                  </label>
                  <label>
                    {c.landmark}
                    <input
                      required
                      maxLength={100}
                      value={landmark}
                      onChange={(event) => setLandmark(event.target.value)}
                    />
                  </label>
                  <p className="chat-location-value">
                    <MapPin size={16} />
                    {position?.latitude.toFixed(5)},{" "}
                    {position?.longitude.toFixed(5)}
                  </p>
                  {photo &&
                    preview /* Local user-selected blob, never an external image URL. */ && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="chat-photo-review"
                        src={preview}
                        alt={c.photoAdded}
                      />
                    )}
                  <div className="chat-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => edit("photo")}
                    >
                      {c.editPhoto}
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => edit("location")}
                    >
                      {c.editLocation}
                    </button>
                    <button
                      className="back-link"
                      type="button"
                      onClick={() => {
                        setJournal([]);
                        move("details");
                      }}
                    >
                      {c.editDetails}
                    </button>
                  </div>
                  <p className="chat-note">{c.publishNote}</p>
                  <button className="button full" disabled={busy}>
                    {busy ? c.submitting : c.submit}
                    {!busy && <Send size={17} />}
                  </button>
                </fieldset>
              </form>
            )}
            {stage === "done" && (
              <div className="chat-complete" role="status">
                <Check size={32} />
                <h2>{quarantined ? c.quarantined : c.success}</h2>
                {photo && !quarantined && <p>{c.photoPending}</p>}
                <div className="chat-actions">
                  {published ? (
                    <Link
                      className="button"
                      href={`/?issue=${encodeURIComponent(published)}`}
                    >
                      {c.view}
                      <ArrowUpRight size={18} />
                    </Link>
                  ) : (
                    <Link className="button" href="/">
                      {c.back}
                    </Link>
                  )}
                  <button className="button secondary" onClick={reset}>
                    {c.another}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </div>
          {stage !== "done" && (
            <div className="chat-bottom">
              <span>{c.online}</span>
              <button
                className="back-link"
                onClick={reset}
                disabled={busy || voiceActive}
              >
                {c.newChat}
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="chat-footer">
        FixPafos · {t("app.independent")} · {t("app.logoDisclosure")}
      </footer>
    </div>
  );
}
