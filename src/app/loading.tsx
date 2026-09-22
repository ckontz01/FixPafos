"use client";
import { useI18n } from "@/components/i18n-provider";
export default function Loading() {
  const { t } = useI18n();
  return (
    <main className="route-loading" id="main-content" aria-busy="true">
      <p role="status">{t("common.loading")}</p>
    </main>
  );
}
