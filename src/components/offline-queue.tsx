"use client";
import { useCallback, useEffect, useState } from "react";
import { CloudOff, Send, Trash2 } from "lucide-react";
import { useI18n } from "./i18n-provider";
import {
  flushOne,
  listPending,
  removePending,
  markAttempt,
  type PendingReport,
} from "@/lib/outbox";
import { isMessageKey } from "@/lib/i18n";

/**
 * Shows reports that are stored on this device and have not reached the server.
 *
 * The wording is deliberate: these are "not submitted yet". They are sent when
 * a connection returns, and each one only disappears from here once the server
 * has accepted it, so the queue can never imply that a report was filed when it
 * was not.
 */
export default function OfflineQueue({ onSent }: { onSent: () => void }) {
  const { t, tp, timeAgo } = useI18n();
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setPending(await listPending());
  }, []);

  const flush = useCallback(async () => {
    if (sending || typeof navigator !== "undefined" && !navigator.onLine) return;
    const queue = await listPending();
    if (!queue.length) return;
    setSending(true);
    let sent = 0;
    let rejected = "";
    try {
      for (const entry of queue) {
        const result = await flushOne(entry);
        if (result.status === "sent") sent += 1;
        else if (result.status === "rejected") {
          rejected = isMessageKey(result.message)
            ? t(result.message)
            : (result.message ?? t("error.generic"));
        } else {
          // Still offline: stop trying and keep the rest queued.
          await markAttempt(entry, "offline");
          break;
        }
      }
    } finally {
      setSending(false);
      await refresh();
      if (sent) {
        setNotice(t("offline.sent"));
        onSent();
      } else if (rejected) {
        setNotice(rejected);
      }
    }
  }, [sending, refresh, t, onSent]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [refresh, flush]);

  if (!pending.length) return null;

  return (
    <section className="offline-queue" aria-live="polite">
      <h2>
        <CloudOff size={16} aria-hidden="true" />{" "}
        {tp("offline.pending", pending.length)}
      </h2>
      <p className="fine-print">{t("offline.queued")}</p>
      <ul>
        {pending.map((entry) => (
          <li key={entry.id}>
            <div>
              <strong>{entry.report.location.label}</strong>
              <span className="muted">{entry.report.message.slice(0, 80)}</span>
              <span className="pending-tag">{t("offline.notSubmitted")}</span>
              <span className="muted">{timeAgo(entry.createdAt)}</span>
            </div>
            <button
              className="icon-button"
              aria-label={t("offline.discard")}
              title={t("offline.discard")}
              onClick={async () => {
                await removePending(entry.id);
                await refresh();
              }}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      <button
        className="button secondary"
        disabled={sending}
        onClick={() => void flush()}
      >
        <Send size={15} />
        {sending ? t("offline.sending") : t("common.retry")}
      </button>
      {notice && (
        <p className="fine-print" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
