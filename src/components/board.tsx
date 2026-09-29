"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  Flag,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ThumbsUp,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  categoryIds,
  flagReasons,
  type Category,
  type FlagReason,
  type ReportedCategory,
  type Issue,
  type IssueLocation,
} from "@/lib/issues";
import { departmentFor, departmentKey } from "@/lib/departments";
import TeamActions from "./team-actions";
import PhotoPicker from "./photo-picker";
import DepartmentIdentity from "./department-identity";
import CategoryIcon from "./category-icon";
import ServicesDirectory from "./services-directory";
import LanguageSwitcher from "./language-switcher";
import { SeverityPanel, ClusterPanel } from "./issue-signals";
import OfflineQueue from "./offline-queue";
import VoiceInput from "./voice-input";
import { queueReport } from "@/lib/outbox";
import { useI18n } from "./i18n-provider";
import { isMessageKey, type MessageKey } from "@/lib/i18n";
import type { IssueCursor, IssuePage } from "@/lib/db";

/** Typed translation keys for canonical category identifiers. */
const categoryKey = (category: Category): MessageKey =>
  `category.${category}` as MessageKey;
const IssueMap = dynamic(() => import("./issue-map"), {
  ssr: false,
  loading: () => (
    <section className="map-panel map-placeholder" />
  ),
});
/**
 * API failures carry a stable `code` alongside a human-readable fallback, so the
 * interface can render the message in the reader's language without the server
 * needing to know which language that is.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: data ? "POST" : "GET",
    cache: "no-store",
    headers:
      data && !(data instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new ApiError(result?.error ?? "The request failed.", result?.code);
  return result as T;
}
export default function Board() {
  const { t, tp, timeAgo } = useI18n();
  // Prefer the server's stable error code so the message appears in the
  // reader's language; fall back to the server text for unrecognised codes.
  const describe = useCallback(
    (error: unknown) => {
      const code = error instanceof ApiError ? error.code : undefined;
      return isMessageKey(code) ? t(code) : (error as Error).message;
    },
    [t],
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [flagReason, setFlagReason] = useState<FlagReason>("offensive");
  const [statusFilter, setStatusFilter] = useState("all");
  const [posts, setPosts] = useState<Issue[]>([]),
    [seconded, setSeconded] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all"),
    [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(),
    [mode, setMode] = useState<"board" | "report" | "services">("board");
  const [draft, setDraft] = useState<IssueLocation>(),
    [category, setCategory] = useState<ReportedCategory>("roads");
  const [author, setAuthor] = useState(""),
    [message, setMessage] = useState(""),
    [locationLabel, setLocationLabel] = useState("");
  const [busy, setBusy] = useState(false),
    [reply, setReply] = useState(""),
    [formError, setFormError] = useState("");
  const [queueVersion, setQueueVersion] = useState(0);
  const [cursor, setCursor] = useState<IssueCursor | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [debouncedQuery, setDebouncedQuery] = useState("");
  const voterId = useRef(""),
    flagDialog = useRef<HTMLDialogElement>(null),
    sidebar = useRef<HTMLElement>(null);
  /**
   * Pseudonymous, browser-local identifier used only to keep one support vote
   * and one flag per person. Created on first use so it never runs during
   * server rendering, and regenerated per session when storage is unavailable.
   */
  const voterKey = useCallback(() => {
    if (voterId.current) return voterId.current;
    try {
      voterId.current =
        localStorage.getItem("pafoslive-voter") || crypto.randomUUID();
      localStorage.setItem("pafoslive-voter", voterId.current);
    } catch {
      voterId.current = crypto.randomUUID();
    }
    return voterId.current;
  }, []);
  const selected = posts.find((p) => p.id === selectedId);
  // Filtering and paging happen server-side, so the loaded page is already the
  // visible set. Filtering here as well would only hide rows the server had
  // deliberately returned, and would silently under-report once paginated.
  const visible = posts;
  const openCount = useMemo(
    () => posts.filter((p) => p.status !== "resolved").length,
    [posts],
  );
  const resolvedCount = posts.length - openCount;

  const queryString = useCallback(
    (cursor?: IssueCursor) => {
      const params = new URLSearchParams({ voterId: voterKey() });
      if (filter !== "all") params.set("category", filter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (cursor) {
        params.set("cursorAt", String(cursor.createdAt));
        params.set("cursorId", cursor.id);
      }
      return params.toString();
    },
    [filter, statusFilter, debouncedQuery, voterKey],
  );

  const refresh = useCallback(async () => {
    try {
      const result = await request<IssuePage>(`/api/issues?${queryString()}`);
      setPosts(result.posts);
      setSeconded(result.seconded);
      setCursor(result.nextCursor);
      setLoaded(true);
      setError("");
    } catch (e) {
      setError(describe(e));
    }
  }, [describe, queryString]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await request<IssuePage>(
        `/api/issues?${queryString(cursor)}`,
      );
      // Guard against a report arriving twice if it shifted between pages.
      setPosts((current) => {
        const known = new Set(current.map((p) => p.id));
        return [...current, ...result.posts.filter((p) => !known.has(p.id))];
      });
      setSeconded((current) => [...new Set([...current, ...result.seconded])]);
      setCursor(result.nextCursor);
    } catch (e) {
      setError(describe(e));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, queryString, describe]);
  useEffect(() => {
    // Debounce typing so a search issues one request, not one per keystroke.
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  // Open any report named in the URL, deferred so the server-rendered markup
  // and the first client render still match.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("issue");
    if (id) queueMicrotask(() => setSelectedId(id));
    else if (params.get("report") === "1") queueMicrotask(() => setMode("report"));
  }, []);

  // Reload whenever the server-side query changes, and poll while visible.
  useEffect(() => {
    queueMicrotask(() => void refresh());
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const visibleAgain = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visibleAgain);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibleAgain);
    };
  }, [refresh]);
  function choose(id: string) {
    if (busy) return;
    setSelectedId(id);
    setMode("board");
    setFormError("");
    setReply("");
    history.replaceState(null, "", `/?issue=${encodeURIComponent(id)}`);
    if (window.innerWidth < 960)
      sidebar.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function startReport() {
    setMode("report");
    setSelectedId(undefined);
    setFormError("");
    setNotice("");
    history.replaceState(null, "", "/");
    if (window.innerWidth < 960)
      sidebar.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function back() {
    setMode("board");
    setSelectedId(undefined);
    setFormError("");
    history.replaceState(null, "", "/");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!draft) {
      setFormError(t("report.locationPrompt"));
      return;
    }
    setBusy(true);
    try {
      const report = {
        author,
        message,
        category,
        location: { ...draft, label: locationLabel },
      };
      const payload = new FormData();
      payload.append("report", JSON.stringify(report));
      if (photo) payload.append("photo", photo);

      let result: { post: Issue };
      try {
        result = await request<{ post: Issue }>("/api/issues", payload);
      } catch (error) {
        // A transport failure means the report never reached the server. Keep
        // it on the device and say so plainly, rather than losing what the
        // person wrote or implying it was filed.
        if (error instanceof TypeError || !navigator.onLine) {
          const queued = await queueReport({
            report,
            photo: photo ?? undefined,
          });
          if (queued) {
            setMode("board");
            setMessage("");
            setPhoto(null);
            setDraft(undefined);
            setLocationLabel("");
            setNotice(t("offline.queued"));
            setQueueVersion((v) => v + 1);
            return;
          }
        }
        throw error;
      }
      setPosts((p) => [result.post, ...p]);
      setLoaded(true);
      setSelectedId(result.post.id);
      setMode("board");
      setMessage("");
      setPhoto(null);
      setStatusFilter("all");
      setDraft(undefined);
      setLocationLabel("");
      setFilter("all");
      setQuery("");
      setNotice(t("report.published"));
      history.replaceState(null, "", `/?issue=${result.post.id}`);
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  async function vote() {
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      await request(`/api/issues/${selected.id}/second`, {
        voterId: voterKey(),
        seconded: !seconded.includes(selected.id),
      });
      await refresh();
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      await request(`/api/issues/${selected.id}/replies`, {
        author,
        message: reply,
      });
      setReply("");
      await refresh();
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  async function flag() {
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      const result = await request<{ hidden: boolean }>(
        `/api/issues/${selected.id}/flag`,
        { reason: flagReason, voterId: voterKey() },
      );
      flagDialog.current?.close();
      // A flag only removes the report from view once enough distinct people
      // raise it; otherwise it stays visible while a moderator reviews it.
      if (result?.hidden) {
        setPosts((p) => p.filter((i) => i.id !== selected.id));
        back();
        setNotice(t("flag.hidden"));
      } else {
        setNotice(t("flag.received"));
      }
    } catch (e) {
      flagDialog.current?.close();
      setFormError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("a11y.skipToContent")}
      </a>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label={t("nav.home")}>
          <span className="brand-symbol">
            <Image src="/fixpafos-logo.png" width={52} height={52} alt="" priority />
          </span>
          <span>
            Fix<span className="wordmark-light">Pafos</span>
          </span>
        </Link>
        <nav className="app-nav" aria-label={t("nav.main")}>
          <button
            aria-current={mode !== "services" ? "page" : undefined}
            onClick={back}
            disabled={busy}
          >
            {t("nav.map")}
          </button>
          <button
            aria-current={mode === "services" ? "page" : undefined}
            onClick={() => {
              setMode("services");
              setSelectedId(undefined);
              history.replaceState(null, "", "/");
              if (window.innerWidth < 960)
                sidebar.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
            disabled={busy}
          >
            {t("nav.services")}
          </button>
          <Link href="/report/chat">{t("nav.chat")}</Link>
        </nav>
        <span className="header-location">
          <span className="live-dot" /> {t("nav.location")}
        </span>
        <LanguageSwitcher />
        <button className="button" onClick={startReport} disabled={busy}>
          <Plus size={18} />
          <span>{t("nav.report")}</span>
        </button>
      </header>
      <main className="workspace" id="main-content" tabIndex={-1}>
        <IssueMap
          issues={visible}
          selected={selected}
          picking={mode === "report"}
          draft={mode === "report" ? draft : undefined}
          onSelect={choose}
          onPick={setDraft}
        />
        <aside
          className="board-panel"
          ref={sidebar}
          aria-label={t("board.label")}
        >
          {mode === "services" ? (
            <ServicesDirectory />
          ) : mode === "report" ? (
            <>
              <div className="panel-heading">
                <button className="back-link" onClick={back} disabled={busy}>
                  <ArrowLeft size={17} /> {t("report.backToBoard")}
                </button>
                <h1>{t("report.title")}</h1>
                <p>{t("report.subtitle")}</p>
                <Link className="chat-entry-link" href="/report/chat"><MessageSquare size={18} />{t("report.chatHint")}<ArrowUpRight size={16} /></Link>
              </div>
              <form className="report-form" onSubmit={submit}>
                <label>
                  {t("report.type")}
                  <select
                    value={category}
                    aria-label={t("report.type")}
                    onChange={(e) =>
                      setCategory(e.target.value as ReportedCategory)
                    }
                    aria-describedby={
                      category === "unsure"
                        ? "auto-classification-help"
                        : undefined
                    }
                  >
                    <option value="unsure">{t("report.unsure")}</option>
                    {categoryIds.map((id) => (
                      <option key={id} value={id}>
                        {t(categoryKey(id))}
                      </option>
                    ))}
                  </select>
                </label>
                {category === "unsure" && (
                  <p
                    id="auto-classification-help"
                    className="classification-note"
                  >
                    {t("report.autoClassifyNote")}
                  </p>
                )}
                <div className={`location-step ${draft ? "complete" : ""}`}>
                  <MapPin size={20} />
                  <div>
                    <strong>
                      {draft
                        ? t("report.locationChosen")
                        : t("report.locationPrompt")}
                    </strong>
                    <span>
                      {draft
                        ? t("report.locationChosenHint", {
                            coords: `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}`,
                          })
                        : t("report.locationPromptHint")}
                    </span>
                  </div>
                  {draft && <Check size={18} />}
                </div>
                <label>
                  {t("report.landmark")}
                  <input
                    required
                    maxLength={100}
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    placeholder={t("report.landmarkPlaceholder")}
                    autoComplete="off"
                  />
                </label>
                <label>
                  {t("report.author")}
                  <input
                    required
                    maxLength={40}
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t("report.authorPlaceholder")}
                    autoComplete="nickname"
                  />
                </label>
                <label>
                  {t("report.message")}
                  <textarea
                    required
                    maxLength={500}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("report.messagePlaceholder")}
                  />
                  <span className="field-count">
                    {t("report.charCount", { count: message.length })}
                  </span>
                </label>
                <VoiceInput
                  disabled={busy}
                  onTranscript={(text) =>
                    // Appended for the person to read and correct. Dictation
                    // fills the field; it never submits.
                    setMessage((current) =>
                      (current ? `${current} ${text}` : text).slice(0, 500),
                    )
                  }
                />
                <PhotoPicker file={photo} onChange={setPhoto} disabled={busy} />
                <p className="privacy-note">{t("report.privacyNote")}</p>
                <div className="routing-note">
                  <ArrowUpRight size={18} />
                  <p>{t("report.routingNote")}</p>
                </div>
                {formError && (
                  <p className="error-message" role="alert">
                    {formError}
                  </p>
                )}
                <button className="button full" disabled={busy}>
                  {busy ? t("report.submitting") : t("report.submit")}
                  {!busy && <ArrowUpRight size={18} />}
                </button>
                <p className="fine-print">{t("report.finePrint")}</p>
              </form>
            </>
          ) : selected ? (
            <>
              <div className="panel-heading detail-heading">
                <button className="back-link" onClick={back} disabled={busy}>
                  <ArrowLeft size={17} /> {t("issue.backToAll")}
                </button>
                <div
                  className="category-label"
                  data-category={selected.category}
                >
                  <CategoryIcon category={selected.category} />
                  {t(categoryKey(selected.category))}
                </div>
                {selected.assignment.source === "deepseek" && (
                  <span className="classification-note">
                    {t("issue.autoClassified")}
                  </span>
                )}
                <h1>{selected.location.label}</h1>
                <div className="report-author">
                  <span className="author-avatar">
                    {selected.author.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{selected.author}</strong>
                    <span>
                      {t("issue.reportedBy", {
                        time: timeAgo(selected.createdAt).toLowerCase(),
                      })}
                    </span>
                  </span>
                </div>
              </div>
              <div className="issue-detail">
                {notice && (
                  <div className="success-message" role="status">
                    <Check size={18} />
                    {notice}
                  </div>
                )}
                <p className="issue-message">{selected.message}</p>
                <span
                  className={`status-badge ${selected.status === "resolved" ? "resolved" : ""}`}
                >
                  {selected.status === "resolved"
                    ? t("status.resolved")
                    : t("status.open")}
                </span>
                {selected.resolution && (
                  <p className="fine-print">
                    {t("issue.resolvedBy", {
                      department: t(
                        departmentKey(selected.resolution.departmentId),
                      ),
                      time: timeAgo(selected.resolution.at),
                    })}
                  </p>
                )}
                {selected.photo?.url && (
                  // The authorized photo endpoint must be checked on every request.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="issue-photo"
                    src={selected.photo.url}
                    alt={t("issue.photoAlt", {
                      location: selected.location.label,
                    })}
                  />
                )}
                {selected.photo?.status === "pending" && (
                  <p className="photo-status">{t("issue.photoPending")}</p>
                )}
                <SeverityPanel issue={selected} />
                <ClusterPanel issue={selected} />
                <div className="assignment-block">
                  <span className="small-label">
                    {t("issue.suggestedService")}
                  </span>
                  <DepartmentIdentity id={selected.assignment.departmentId} />
                  <p>
                    {selected.assignment.source === "fallback"
                      ? t("demo.aiUnavailable")
                      : selected.assignment.confidence === "low"
                        ? t("issue.assignmentLow")
                        : t("issue.assignmentAuto")}
                  </p>
                  <a
                    className="text-link"
                    href={departmentFor(selected.assignment.departmentId).url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("issue.officialContact")} <ArrowUpRight size={16} />
                  </a>
                  <span className="fine-print">{t("issue.notSent")}</span>
                </div>
                <div className="detail-actions">
                  <button
                    className={`button secondary ${seconded.includes(selected.id) ? "supported" : ""}`}
                    onClick={vote}
                    disabled={busy}
                  >
                    <ThumbsUp size={17} />
                    {seconded.includes(selected.id)
                      ? t("issue.supported")
                      : t("issue.support")}
                    <span>{selected.seconds}</span>
                  </button>
                  <button
                    className="icon-button"
                    title={t("flag.action")}
                    aria-label={t("flag.action")}
                    onClick={() => flagDialog.current?.showModal()}
                    disabled={busy}
                  >
                    <Flag size={17} />
                  </button>
                </div>
                <TeamActions
                  key={selected.id}
                  issue={selected}
                  onUpdate={refresh}
                />
                <div className="replies">
                  <h2>
                    {t("reply.heading")}{" "}
                    <span>{selected.replies.length}</span>
                  </h2>
                  {selected.replies.length === 0 && (
                    <p className="muted">{t("reply.empty")}</p>
                  )}
                  {selected.replies.map((r) => (
                    <article className="reply" key={r.id}>
                      {r.verifiedDepartmentId ? (
                        <DepartmentIdentity
                          id={r.verifiedDepartmentId}
                          compact
                        />
                      ) : (
                        <strong>{r.author}</strong>
                      )}
                      {r.verifiedDepartmentId && (
                        <span
                          className="verified-badge"
                          title={t("reply.verifiedTitle")}
                        >
                          <ShieldCheck size={14} />{" "}
                          {r.kind === "resolution"
                            ? t("reply.verifiedResolved")
                            : t("reply.verified")}
                        </span>
                      )}
                      <span>{timeAgo(r.createdAt)}</span>
                      <p>{r.message}</p>
                    </article>
                  ))}
                </div>
                <form className="reply-form" onSubmit={sendReply}>
                  <label>
                    {t("reply.author")}
                    <input
                      required
                      maxLength={40}
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      autoComplete="nickname"
                    />
                  </label>
                  <label>
                    {t("reply.add")}
                    <textarea
                      required
                      maxLength={500}
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t("reply.placeholder")}
                    />
                  </label>
                  <p className="fine-print">{t("reply.finePrint")}</p>
                  {formError && (
                    <p className="error-message" role="alert">
                      {formError}
                    </p>
                  )}
                  <button className="button secondary" disabled={busy}>
                    {busy ? t("common.pleaseWait") : t("reply.submit")}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading overview-heading">
                <div className="board-kicker">
                  <span className="live-dot" /> {t("board.kicker")}
                </div>
                <h1>{t("board.title")}</h1>
                <p>{t("board.subtitle")}</p>
                <div className="board-counts" aria-label={t("board.totals")}>
                  <span>
                    <strong>
                      {loaded ? openCount : t("common.notAvailable")}
                    </strong>{" "}
                    {tp("board.openReports", openCount)}
                  </span>
                  <span>
                    <strong>
                      {loaded ? resolvedCount : t("common.notAvailable")}
                    </strong>{" "}
                    {t("board.resolvedCount")}
                  </span>
                </div>
                <label className="status-filter">
                  {t("board.statusFilter")}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">{t("board.statusAll")}</option>
                    <option value="open">{t("status.openPlain")}</option>
                    <option value="resolved">
                      {t("status.resolvedPlain")}
                    </option>
                  </select>
                </label>
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label={t("board.search")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("board.searchPlaceholder")}
                  />
                  {query && (
                    <button
                      aria-label={t("board.clearSearch")}
                      onClick={() => setQuery("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <label className="filter-label">
                  {t("board.typeFilter")}
                  <select
                    aria-label={t("board.typeFilterAria")}
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as Category | "all")
                    }
                  >
                    <option value="all">{t("board.allTypes")}</option>
                    {categoryIds.map((id) => (
                      <option key={id} value={id}>
                        {t(categoryKey(id))}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <OfflineQueue
                key={queueVersion}
                onSent={() => {
                  setQueueVersion((v) => v + 1);
                  void refresh();
                }}
              />
              <div className="list-bar">
                <span>
                  {loaded
                    ? tp("board.reportCount", visible.length)
                    : t("board.loadingReports")}
                </span>
                <button
                  className="refresh-button"
                  onClick={() => void refresh()}
                  aria-label={t("board.refreshAria")}
                >
                  <RefreshCw size={14} /> {t("common.refresh")}
                </button>
              </div>
              {notice && (
                <p className="success-message" role="status">
                  {notice}
                </p>
              )}
              {error ? (
                <div className="empty-state">
                  <h2>{t("board.loadErrorTitle")}</h2>
                  <p role="alert">{error}</p>
                  <button
                    className="button secondary"
                    onClick={() => void refresh()}
                  >
                    {t("common.retry")}
                  </button>
                </div>
              ) : !loaded ? (
                <div
                  className="loading-list"
                  aria-label={t("board.loadingReports")}
                >
                  <div />
                  <div />
                  <div />
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <MapPin size={34} strokeWidth={1.3} />
                  <h2>
                    {posts.length
                      ? t("board.emptyMatchTitle")
                      : t("board.emptyFirstTitle")}
                  </h2>
                  <p>
                    {posts.length
                      ? t("board.emptyMatchBody")
                      : t("board.emptyFirstBody")}
                  </p>
                  <button
                    className="button secondary"
                    onClick={
                      posts.length
                        ? () => {
                            setFilter("all");
                            setStatusFilter("all");
                            setQuery("");
                          }
                        : startReport
                    }
                  >
                    {posts.length
                      ? t("common.clearFilters")
                      : t("board.addFirst")}
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <div className="issue-list">
                  {visible.map((p) => (
                    <button
                      key={p.id}
                      className="issue-row"
                      onClick={() => choose(p.id)}
                    >
                      <div className="issue-row-top">
                        <span
                          className="category-label"
                          data-category={p.category}
                        >
                          <CategoryIcon category={p.category} size={16} />
                          {t(categoryKey(p.category))}
                        </span>
                        <time>{timeAgo(p.createdAt)}</time>
                      </div>
                      <h2>{p.location.label}</h2>
                      {p.assignment.source === "deepseek" && (
                        <span className="classification-note">
                          {t("issue.autoClassified")}
                        </span>
                      )}
                      {p.severity && (
                        <span
                          className="severity-chip"
                          data-severity={p.severity.level}
                        >
                          {t(`severity.${p.severity.level}` as MessageKey)}
                        </span>
                      )}
                      {p.status !== "resolved" && (
                        <span className="status-badge">{t("status.open")}</span>
                      )}
                      {p.status === "resolved" && (
                        <span className="status-badge resolved">
                          {t("status.resolved")}
                        </span>
                      )}
                      <p>{p.message}</p>
                      <DepartmentIdentity
                        id={p.assignment.departmentId}
                        compact
                      />
                      <div className="issue-row-bottom">
                        <span>
                          <ThumbsUp size={14} />
                          {t("board.supporting", { count: p.seconds })}
                          <MessageSquare size={14} />
                          {t("board.replies", { count: p.replies.length })}
                        </span>
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {cursor && (
                <button
                  className="button secondary load-more"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? t("common.loading") : t("board.loadMore")}
                </button>
              )}
              <div className="board-explainer">
                <span className="explainer-mark">
                  <MapPin size={21} />
                </span>
                <div>
                  <strong>{t("board.explainerTitle")}</strong>
                  <p>{t("board.explainerBody")}</p>
                </div>
              </div>
            </>
          )}
          {error && selected && (
            <p className="error-message" role="alert">
              {t("board.updatesPaused", { message: error })}
            </p>
          )}
          <footer className="panel-footer">
            <div className="footer-actions">
              <Link href="/insights"><BarChart3 size={18} aria-hidden="true" />{t("nav.insights")}</Link>
              <Link href="/moderation"><ShieldCheck size={18} aria-hidden="true" />{t("nav.moderation")}</Link>
            </div>
            <span>{t("app.independent")}</span>
            <span>{t("app.logoDisclosure")}</span>
          </footer>
        </aside>
      </main>
      <dialog ref={flagDialog} className="dialog" aria-labelledby="flag-title">
        <h2 id="flag-title">{t("flag.title")}</h2>
        <p>{t("flag.body")}</p>
        <label className="flag-reason">
          {t("flag.reason")}
          <select
            value={flagReason}
            onChange={(event) => setFlagReason(event.target.value as FlagReason)}
          >
            {flagReasons.map((reason) => (
              <option key={reason} value={reason}>
                {t(`flag.reason.${reason}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <div className="dialog-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => flagDialog.current?.close()}
          >
            {t("common.cancel")}
          </button>
          <button className="button danger" disabled={busy} onClick={flag}>
            {busy ? t("flag.submitting") : t("flag.submit")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
