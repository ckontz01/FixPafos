"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useI18n } from "./i18n-provider";

export function InsightsHeader() {
  const { t } = useI18n();
  return (
    <header className="insights-header">
      <Link className="back-link" href="/">
        <Image src="/fixpafos-logo.png" alt="" width={28} height={28} />
        <ArrowLeft size={17} /> {t("insights.backToMap")}
      </Link>
      <div className="insights-title">
        <BarChart3 size={26} aria-hidden="true" />
        <div>
          <h1>{t("insights.title")}</h1>
          <p>{t("insights.subtitle")}</p>
        </div>
      </div>
    </header>
  );
}

export function InsightsPending() {
  const { t } = useI18n();
  return (
    <section className="insights-pending" aria-busy="true">
      <p role="status">{t("common.loading")}</p>
      <div className="stat-row" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="stat-tile skeleton-tile" key={i}>
            <span />
            <strong />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function InsightsLoading() {
  return (
    <main className="insights-page" id="main-content">
      <InsightsHeader />
      <InsightsPending />
    </main>
  );
}
