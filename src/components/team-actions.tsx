"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { departmentKey } from "@/lib/departments";
import type { Issue } from "@/lib/issues";
import DepartmentIdentity from "./department-identity";
import { useI18n } from "./i18n-provider";
import { isMessageKey } from "@/lib/i18n";
export default function TeamActions({
  issue,
  onUpdate,
}: {
  issue: Issue;
  onUpdate: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [department, setDepartment] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/team/session", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(t("team.unavailable"));
        const result = await r.json();
        if (active) setDepartment(result.departmentId);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [t]);
  async function call(url: string, data?: unknown, method = "POST") {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await res.json();
    if (!res.ok) {
      if (res.status === 401) setDepartment(null);
      throw new Error(
        isMessageKey(result.code) ? t(result.code) : result.error,
      );
    }
    return result;
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await call("/api/team/session", {
        departmentId: issue.assignment.departmentId,
        password,
      });
      setDepartment(result.departmentId);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function update(action: "reply" | "resolve") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await call(`/api/issues/${issue.id}/team`, { action, message });
      setMessage("");
      await onUpdate();
      setNotice(
        action === "resolve" ? t("team.resolveNotice") : t("team.replyNotice"),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await call("/api/team/session", undefined, "DELETE");
      setDepartment(null);
      setNotice("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="team-panel">
      <summary>
        <ShieldCheck size={18} /> {t("team.access")}
      </summary>
      <DepartmentIdentity id={issue.assignment.departmentId} compact />
      {department === issue.assignment.departmentId ? (
        <>
          <span className="verified-badge">
            <ShieldCheck size={14} /> {t("team.verified")}
          </span>
          <form
            className="reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              void update("reply");
            }}
          >
            <label>
              {t("team.update")}
              <textarea
                required
                maxLength={500}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("team.replyPlaceholder")}
              />
            </label>
            <div className="team-buttons">
              <button className="button secondary" disabled={busy}>
                {t("team.postReply")}
              </button>
              <button
                type="button"
                className="button"
                disabled={
                  busy || issue.status === "resolved" || !message.trim()
                }
                onClick={() => void update("resolve")}
              >
                <Check size={16} />
                {issue.status === "resolved"
                  ? t("team.resolvedState")
                  : t("team.resolve")}
              </button>
            </div>
            <p className="fine-print">{t("team.updateHint")}</p>
          </form>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => void logout()}
          >
            {t("team.signOutFull")}
          </button>
        </>
      ) : (
        <>
          {department && (
            <p className="fine-print">
              {t("team.otherTeam", {
                department: t(departmentKey(department)),
              })}
            </p>
          )}
          <form className="reply-form" onSubmit={verify}>
            <label>
              {t("team.password")}
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              {busy ? t("moderation.checking") : t("team.verify")}
            </button>
          </form>
          <p className="fine-print">{t("team.eligibility")}</p>
        </>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success-message">
          {notice}
        </p>
      )}
    </details>
  );
}
