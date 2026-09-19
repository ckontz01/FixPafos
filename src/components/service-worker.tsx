"use client";
import { useEffect } from "react";

/**
 * Registers the service worker that caches the application shell, so the
 * reporting form opens on a poor connection.
 *
 * Registration failure is not an error worth showing anyone: the application
 * works normally without it, and every offline guarantee that matters lives in
 * the page's own outbox rather than in the worker.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registration is deferred to idle so it never competes with first paint.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
