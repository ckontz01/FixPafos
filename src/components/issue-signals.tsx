"use client";
import { AlertTriangle, Copy, Info } from "lucide-react";
import { useI18n } from "./i18n-provider";
import type { MessageKey } from "@/lib/i18n";
import type { Issue, Severity } from "@/lib/issues";

/**
 * The AI-derived signals attached to a report, shown to citizens.
 *
 * Both are presented as estimates with their reasoning visible, never as
 * municipal decisions. The severity panel names the factors behind the level
 * and states plainly that the response window is a suggestion; the cluster
 * panel explains why reports were linked and makes clear that each underlying
 * report is preserved.
 */

const SEVERITY_SLA_KEY: Record<Severity, MessageKey> = {
  low: "severity.sla.low",
  medium: "severity.sla.medium",
  high: "severity.sla.high",
  critical: "severity.sla.critical",
};

export function SeverityPanel({ issue }: { issue: Issue }) {
  const { t } = useI18n();
  const severity = issue.severity;
  if (!severity) return null;
  return (
    <div className="severity-panel" data-severity={severity.level}>
      <span className="small-label">
        <AlertTriangle size={14} aria-hidden="true" /> {t("severity.label")}
      </span>
      <strong className="severity-level">
        {t(`severity.${severity.level}` as MessageKey)}
      </strong>
      <p className="severity-sla">
        {t("severity.slaSuggested", {
          window: t(SEVERITY_SLA_KEY[severity.level]),
        })}
      </p>
      {severity.factors.length > 0 && (
        <ul className="severity-factors">
          {severity.factors.map((factor) => (
            <li key={factor}>{t(`severity.factor.${factor}` as MessageKey)}</li>
          ))}
        </ul>
      )}
      <p className="fine-print">{t("severity.advisory")}</p>
      {severity.needsReview && (
        <p className="fine-print needs-review">
          <Info size={13} aria-hidden="true" /> {t("severity.needsReview")}
        </p>
      )}
    </div>
  );
}

export function ClusterPanel({ issue }: { issue: Issue }) {
  const { t, tp } = useI18n();
  const cluster = issue.cluster;
  // A cluster of one is not a duplicate, and a separated report is no longer in
  // one, so neither is worth showing.
  if (!cluster || cluster.status === "separated") return null;
  const size = issue.clusterSize ?? 0;
  if (size < 2) return null;

  return (
    <div className="cluster-panel">
      <span className="small-label">
        <Copy size={14} aria-hidden="true" /> {t("cluster.label")}
      </span>
      <strong>{tp("cluster.count", size)}</strong>
      <p>{t("cluster.explain")}</p>
      {cluster.status === "suggested" && (
        <p className="fine-print needs-review">{t("cluster.pendingReview")}</p>
      )}
      {cluster.reason && (
        <p className="fine-print">
          {t("cluster.why")} {cluster.reason}
        </p>
      )}
      {cluster.distanceMetres > 0 && (
        <p className="fine-print">
          {t("cluster.distance", { metres: cluster.distanceMetres })}
        </p>
      )}
    </div>
  );
}
