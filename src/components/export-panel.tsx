"use client";
import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { departmentIds } from "@/lib/departments";
import { isMessageKey, type MessageKey } from "@/lib/i18n";

/**
 * Operational export for municipal staff.
 *
 * Produces a file the person downloads and forwards themselves. Nothing is sent
 * anywhere by the platform, so no external communication leaves without a human
 * deciding to send it.
 */
export default function ExportPanel({ password }: { password: string }) {
  const { t } = useI18n();
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download(format: "csv" | "digest") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          format,
          department: department || undefined,
        }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(
          isMessageKey(failure.code) ? t(failure.code) : (failure.error ?? ""),
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        format === "digest" ? `pafoslive-digest-${department}.txt` : "pafoslive.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message || t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="export-panel">
      <h2>
        <Download size={18} aria-hidden="true" /> {t("insights.export")}
      </h2>
      <label>
        {t("insights.department")}
        <select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">{t("insights.allDepartments")}</option>
          {departmentIds.map((id) => (
            <option key={id} value={id}>
              {t(`department.${id}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <div className="team-buttons">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void download("csv")}
        >
          <Download size={15} /> {t("insights.export")}
        </button>
        <button
          className="button secondary"
          disabled={busy || !department}
          onClick={() => void download("digest")}
        >
          <Mail size={15} /> {t("insights.exportDigest")}
        </button>
      </div>
      <p className="fine-print">{t("issue.notSent")}</p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
