"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { departmentFor } from "@/lib/departments";
import type { Issue } from "@/lib/issues";
import DepartmentIdentity from "./department-identity";
export default function TeamActions({
  issue,
  onUpdate,
}: {
  issue: Issue;
  onUpdate: () => Promise<void>;
}) {
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
          throw new Error("Team verification is temporarily unavailable.");
        const result = await r.json();
        if (active) setDepartment(result.departmentId);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function call(url: string, data?: unknown, method = "POST") {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await res.json();
    if (!res.ok) {
      if (res.status === 401) setDepartment(null);
      throw new Error(result.error);
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
        action === "resolve"
          ? "Issue marked resolved. Your update is public."
          : "Verified reply published.",
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
        <ShieldCheck size={18} /> Team access
      </summary>
      <DepartmentIdentity id={issue.assignment.departmentId} compact />
      {department === issue.assignment.departmentId ? (
        <>
          <span className="verified-badge">
            <ShieldCheck size={14} /> Department password verified
          </span>
          <form
            className="reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              void update("reply");
            }}
          >
            <label>
              Official update
              <textarea
                required
                maxLength={500}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what your team has done or will do…"
              />
            </label>
            <div className="team-buttons">
              <button className="button secondary" disabled={busy}>
                Post verified reply
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
                {issue.status === "resolved" ? "Resolved" : "Mark resolved"}
              </button>
            </div>
            <p className="fine-print">
              Add an update before resolving. Verified replies pass the same
              moderation checks as community replies.
            </p>
          </form>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => void logout()}
          >
            Sign out of team access
          </button>
        </>
      ) : (
        <>
          {department && (
            <p className="fine-print">
              You are verified as {departmentFor(department).name}. This issue
              belongs to another team.
            </p>
          )}
          <form className="reply-form" onSubmit={verify}>
            <label>
              Department password
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
              {busy ? "Checking…" : "Verify team"}
            </button>
          </form>
          <p className="fine-print">
            For authorized representatives with a password issued by PafosLive.
            Verification confirms department access on this platform.
          </p>
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
