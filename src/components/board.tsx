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
import {
  ArrowLeft,
  ArrowUpRight,
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
  categories,
  timeAgo,
  type Category,
  type Issue,
  type IssueLocation,
} from "@/lib/issues";
import { departmentFor } from "@/lib/departments";
import TeamActions from "./team-actions";
import PhotoPicker from "./photo-picker";
import DepartmentIdentity from "./department-identity";
import CategoryIcon from "./category-icon";
import ServicesDirectory from "./services-directory";
const IssueMap = dynamic(() => import("./issue-map"), {
  ssr: false,
  loading: () => (
    <section className="map-panel map-placeholder">
      Opening the Pafos map…
    </section>
  ),
});
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
    throw new Error(result?.error ?? "The request failed. Please try again.");
  return result as T;
}
export default function Board() {
  const [photo, setPhoto] = useState<File | null>(null);
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
    [category, setCategory] = useState<Category>("roads");
  const [author, setAuthor] = useState(""),
    [message, setMessage] = useState(""),
    [locationLabel, setLocationLabel] = useState("");
  const [busy, setBusy] = useState(false),
    [reply, setReply] = useState(""),
    [formError, setFormError] = useState("");
  const voterId = useRef(""),
    flagDialog = useRef<HTMLDialogElement>(null),
    sidebar = useRef<HTMLElement>(null);
  const selected = posts.find((p) => p.id === selectedId);
  const visible = useMemo(
    () =>
      posts.filter(
        (p) =>
          (filter === "all" || p.category === filter) &&
          (statusFilter === "all" || (p.status ?? "open") === statusFilter) &&
          `${p.message} ${p.location.label} ${departmentFor(p.assignment.departmentId).name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [posts, filter, query, statusFilter],
  );
  const refresh = useCallback(async () => {
    try {
      const result = await request<{ posts: Issue[]; seconded: string[] }>(
        `/api/issues?voterId=${encodeURIComponent(voterId.current)}`,
      );
      setPosts(result.posts);
      setSeconded(result.seconded);
      setLoaded(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    try {
      voterId.current =
        localStorage.getItem("pafoslive-voter") || crypto.randomUUID();
      localStorage.setItem("pafoslive-voter", voterId.current);
    } catch {
      voterId.current = crypto.randomUUID();
    }
    const id = new URLSearchParams(location.search).get("issue");
    if (id) queueMicrotask(() => setSelectedId(id));
    void refresh();
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
      setFormError("Choose the issue location on the map first.");
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
      const result = await request<{ post: Issue }>("/api/issues", payload);
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
      setNotice("Your report is published and visible to everyone on the map.");
      history.replaceState(null, "", `/?issue=${result.post.id}`);
    } catch (e) {
      setFormError((e as Error).message);
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
        voterId: voterId.current,
        seconded: !seconded.includes(selected.id),
      });
      await refresh();
    } catch (e) {
      setFormError((e as Error).message);
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
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function flag() {
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      await request(`/api/issues/${selected.id}/flag`, {});
      setPosts((p) => p.filter((i) => i.id !== selected.id));
      flagDialog.current?.close();
      back();
      setNotice(
        "The flagged report and its replies have been removed from the public board.",
      );
    } catch (e) {
      flagDialog.current?.close();
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="PafosLive home">
          <span className="brand-symbol">
            <MapPin size={23} strokeWidth={2.1} />
          </span>
          <span>
            Pafos<span className="wordmark-light">Live</span>
          </span>
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          <button
            aria-current={mode !== "services" ? "page" : undefined}
            onClick={back}
            disabled={busy}
          >
            Community map
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
            Local services
          </button>
        </nav>
        <span className="header-location">
          <span className="live-dot" /> Pafos, Cyprus
        </span>
        <button className="button" onClick={startReport} disabled={busy}>
          <Plus size={18} />
          <span>Report an issue</span>
        </button>
      </header>
      <main className="workspace">
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
          aria-label="Community board"
        >
          {mode === "services" ? (
            <ServicesDirectory />
          ) : mode === "report" ? (
            <>
              <div className="panel-heading">
                <button className="back-link" onClick={back} disabled={busy}>
                  <ArrowLeft size={17} /> Community board
                </button>
                <h1>What needs fixing?</h1>
                <p>
                  A clear description and an exact location help everyone
                  understand the issue.
                </p>
              </div>
              <form className="report-form" onSubmit={submit}>
                <label>
                  Issue type
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                  >
                    {Object.entries(categories).map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={`location-step ${draft ? "complete" : ""}`}>
                  <MapPin size={20} />
                  <div>
                    <strong>
                      {draft ? "Location selected" : "Choose a spot on the map"}
                    </strong>
                    <span>
                      {draft
                        ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)} · click again to move`
                        : "Click the exact spot, or use the map centre button."}
                    </span>
                  </div>
                  {draft && <Check size={18} />}
                </div>
                <label>
                  Street or nearby landmark
                  <input
                    required
                    maxLength={100}
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    placeholder="e.g. Apostolou Pavlou Avenue"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Your name or nickname
                  <input
                    required
                    maxLength={40}
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="How you want to appear publicly"
                    autoComplete="nickname"
                  />
                </label>
                <label>
                  What is happening?
                  <textarea
                    required
                    maxLength={500}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the problem and what needs attention. English, Ελληνικά and other languages are welcome."
                  />
                  <span className="field-count">{message.length}/500</span>
                </label>
                <PhotoPicker file={photo} onChange={setPhoto} disabled={busy} />
                <p className="privacy-note">
                  Your name, report and location will be public. Leave out phone
                  numbers, private addresses and other personal details.
                </p>
                <div className="routing-note">
                  <ArrowUpRight size={18} />
                  <p>
                    We’ll suggest the responsible service automatically.
                    Publishing here does not send an official request to the
                    authority.
                  </p>
                </div>
                {formError && (
                  <p className="error-message" role="alert">
                    {formError}
                  </p>
                )}
                <button className="button full" disabled={busy}>
                  {busy ? "Checking & assigning…" : "Publish report"}
                  {!busy && <ArrowUpRight size={18} />}
                </button>
                <p className="fine-print">
                  Reports are checked before publication. If a report is
                  blocked, a moderator can review it.
                </p>
              </form>
            </>
          ) : selected ? (
            <>
              <div className="panel-heading detail-heading">
                <button className="back-link" onClick={back} disabled={busy}>
                  <ArrowLeft size={17} /> All reports
                </button>
                <div
                  className="category-label"
                  data-category={selected.category}
                >
                  <CategoryIcon category={selected.category} />
                  {categories[selected.category].label}
                </div>
                <h1>{selected.location.label}</h1>
                <div className="report-author">
                  <span className="author-avatar">
                    {selected.author.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{selected.author}</strong>
                    <span>
                      Reported {timeAgo(selected.createdAt).toLowerCase()}
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
                  {selected.status === "resolved" ? "✓ Resolved" : "Open"}
                </span>
                {selected.resolution && (
                  <p className="fine-print">
                    Marked resolved by{" "}
                    {departmentFor(selected.resolution.departmentId).name} ·{" "}
                    {timeAgo(selected.resolution.at)}
                  </p>
                )}
                {selected.photo?.url && (
                  // The authorized photo endpoint must be checked on every request.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="issue-photo"
                    src={selected.photo.url}
                    alt={`Reported issue at ${selected.location.label}`}
                  />
                )}
                {selected.photo?.status === "pending" && (
                  <p className="photo-status">
                    Photo awaiting moderator review.
                  </p>
                )}
                <div className="assignment-block">
                  <span className="small-label">
                    Suggested responsible service
                  </span>
                  <DepartmentIdentity id={selected.assignment.departmentId} />
                  <p>
                    {selected.assignment.confidence === "low"
                      ? "Responsibility is unclear. A person should review the routing."
                      : "Automatically assigned with DeepSeek. Responsibility should be confirmed by the service."}
                  </p>
                  <a
                    className="text-link"
                    href={departmentFor(selected.assignment.departmentId).url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official contact page <ArrowUpRight size={16} />
                  </a>
                  <span className="fine-print">Not sent to the authority.</span>
                </div>
                <div className="detail-actions">
                  <button
                    className={`button secondary ${seconded.includes(selected.id) ? "supported" : ""}`}
                    onClick={vote}
                    disabled={busy}
                  >
                    <ThumbsUp size={17} />
                    {seconded.includes(selected.id)
                      ? "Supported"
                      : "I see this too"}
                    <span>{selected.seconds}</span>
                  </button>
                  <button
                    className="icon-button"
                    title="Flag inappropriate report"
                    aria-label="Flag inappropriate report"
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
                    Community replies <span>{selected.replies.length}</span>
                  </h2>
                  {selected.replies.length === 0 && (
                    <p className="muted">
                      Add useful details or an update from the area.
                    </p>
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
                          title="Posted using this department’s PafosLive password"
                        >
                          <ShieldCheck size={14} /> Verified team
                          {r.kind === "resolution" ? " · Resolved" : ""}
                        </span>
                      )}
                      <span>{timeAgo(r.createdAt)}</span>
                      <p>{r.message}</p>
                    </article>
                  ))}
                </div>
                <form className="reply-form" onSubmit={sendReply}>
                  <label>
                    Your name or nickname
                    <input
                      required
                      maxLength={40}
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      autoComplete="nickname"
                    />
                  </label>
                  <label>
                    Add a reply
                    <textarea
                      required
                      maxLength={500}
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Share an update…"
                    />
                  </label>
                  <p className="fine-print">
                    Replies are public and checked before publication.
                  </p>
                  {formError && (
                    <p className="error-message" role="alert">
                      {formError}
                    </p>
                  )}
                  <button className="button secondary" disabled={busy}>
                    {busy ? "Please wait…" : "Post reply"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading overview-heading">
                <div className="board-kicker">
                  <span className="live-dot" /> YOUR NEIGHBOURHOOD, CONNECTED
                </div>
                <h1>
                  A better Pafos
                  <br />
                  starts here.
                </h1>
                <p>
                  Spot an issue. Share it on the map.
                  <br />
                  Follow the progress together.
                </p>
                <div
                  className="board-counts"
                  aria-label="Community report totals"
                >
                  <span>
                    <strong>
                      {loaded
                        ? posts.filter((p) => p.status !== "resolved").length
                        : "—"}
                    </strong>{" "}
                    {posts.filter((p) => p.status !== "resolved").length === 1
                      ? "open report"
                      : "open reports"}
                  </span>
                  <span>
                    <strong>
                      {loaded
                        ? posts.filter((p) => p.status === "resolved").length
                        : "—"}
                    </strong>{" "}
                    resolved
                  </span>
                </div>
                <label className="status-filter">
                  Report status
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All reports</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Search reports"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search reports or places"
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <label className="filter-label">
                  Issue type
                  <select
                    aria-label="Filter issue type"
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as Category | "all")
                    }
                  >
                    <option value="all">All issue types</option>
                    {Object.entries(categories).map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="list-bar">
                <span>
                  {loaded
                    ? `${visible.length} ${visible.length === 1 ? "report" : "reports"}`
                    : "Loading reports…"}
                </span>
                <button
                  className="refresh-button"
                  onClick={() => void refresh()}
                  aria-label="Refresh reports"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              {notice && (
                <p className="success-message" role="status">
                  {notice}
                </p>
              )}
              {error ? (
                <div className="empty-state">
                  <h2>We couldn’t load the board</h2>
                  <p role="alert">{error}</p>
                  <button
                    className="button secondary"
                    onClick={() => void refresh()}
                  >
                    Try again
                  </button>
                </div>
              ) : !loaded ? (
                <div className="loading-list" aria-label="Loading reports">
                  <div />
                  <div />
                  <div />
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <MapPin size={34} strokeWidth={1.3} />
                  <h2>
                    {posts.length
                      ? "No matching reports"
                      : "Be the first to put it on the map."}
                  </h2>
                  <p>
                    {posts.length
                      ? "Try another search or issue type."
                      : "A broken pavement. A blocked drain. A streetlight that’s gone dark. Start with what you see."}
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
                    {posts.length ? "Clear filters" : "Add the first report"}
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
                          {categories[p.category].label}
                        </span>
                        <time>{timeAgo(p.createdAt)}</time>
                      </div>
                      <h2>{p.location.label}</h2>
                      {p.status !== "resolved" && (
                        <span className="status-badge">Open</span>
                      )}
                      {p.status === "resolved" && (
                        <span className="status-badge resolved">
                          ✓ Resolved
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
                          {p.seconds} supporting
                          <MessageSquare size={14} />
                          {p.replies.length} replies
                        </span>
                        <ChevronRight size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="board-explainer">
                <span className="explainer-mark">
                  <MapPin size={21} />
                </span>
                <div>
                  <strong>A small report. A shared improvement.</strong>
                  <p>
                    From a broken streetlight to a blocked drain, help put your
                    neighbourhood’s needs on the map.
                  </p>
                </div>
              </div>
            </>
          )}
          {error && selected && (
            <p className="error-message" role="alert">
              Updates paused: {error}
            </p>
          )}
          <footer className="panel-footer">
            <span>Independent community platform</span>
            <Link href="/moderation">Moderation</Link>
          </footer>
        </aside>
      </main>
      <dialog ref={flagDialog} className="dialog" aria-labelledby="flag-title">
        <h2 id="flag-title">Flag this report?</h2>
        <p>
          As on the original community board, flagging removes the report and
          its replies from public view. This cannot be undone.
        </p>
        <div className="dialog-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => flagDialog.current?.close()}
          >
            Cancel
          </button>
          <button className="button danger" disabled={busy} onClick={flag}>
            {busy ? "Removing…" : "Flag & remove"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
