/**
 * Local outbox for reports submitted without a working connection.
 *
 * A queued report is NOT a submitted report. Nothing here talks to the server,
 * nothing here is visible to anyone else, and nothing is treated as published
 * until the server has accepted it and returned the stored issue. The interface
 * says so explicitly, because a citizen who believes a hazard has been reported
 * when it has not is worse off than one who knows it is still waiting.
 *
 * Queued entries hold only what the person typed and optionally chose: name,
 * text, category, coordinates and a photo. Nothing is derived, no identifier is
 * added, and the entry is deleted the moment the server accepts it. IndexedDB
 * is used rather than localStorage because a photo is a Blob.
 */

const DB_NAME = "pafoslive-outbox";
const STORE = "pending";
const VERSION = 1;

export type PendingReport = {
  id: string;
  createdAt: number;
  report: {
    author: string;
    message: string;
    category: string;
    location: { longitude: number; latitude: number; label: string };
  };
  photo?: Blob;
  /** Set after a failed attempt, so a permanently rejected report is not retried forever. */
  lastError?: string;
  attempts: number;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Every storage call is guarded: blocked or unavailable storage must not throw into the UI. */
async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
  fallback: T,
): Promise<T> {
  if (typeof indexedDB === "undefined") return fallback;
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return fallback;
  }
}

export async function queueReport(
  entry: Omit<PendingReport, "id" | "createdAt" | "attempts">,
): Promise<PendingReport | null> {
  const pending: PendingReport = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
  };
  const stored = await withStore<IDBValidKey | null>(
    "readwrite",
    (store) => store.add(pending),
    null,
  );
  return stored === null ? null : pending;
}

export async function listPending(): Promise<PendingReport[]> {
  const all = await withStore<PendingReport[]>(
    "readonly",
    (store) => store.getAll(),
    [],
  );
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePending(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id), undefined);
}

export async function markAttempt(entry: PendingReport, error: string) {
  await withStore(
    "readwrite",
    (store) =>
      store.put({ ...entry, attempts: entry.attempts + 1, lastError: error }),
    undefined,
  );
}

/**
 * Attempts to send one queued report.
 *
 * A network failure leaves the entry queued for the next attempt. A rejection
 * by the server (validation, moderation, rate limit) is final for that entry:
 * retrying would not change the outcome, so it is removed and reported, rather
 * than retried forever in the background.
 */
export async function flushOne(
  entry: PendingReport,
): Promise<{ status: "sent" | "rejected" | "offline"; message?: string }> {
  const payload = new FormData();
  payload.append("report", JSON.stringify(entry.report));
  if (entry.photo) payload.append("photo", entry.photo, "photo.jpg");

  let response: Response;
  try {
    response = await fetch("/api/issues", { method: "POST", body: payload });
  } catch {
    return { status: "offline" };
  }

  if (response.ok) {
    await removePending(entry.id);
    return { status: "sent" };
  }

  // 5xx may be transient, so those stay queued; 4xx will not succeed on retry.
  if (response.status >= 500) return { status: "offline" };

  const body = await response.json().catch(() => ({}));
  await removePending(entry.id);
  return { status: "rejected", message: body?.code ?? body?.error };
}
