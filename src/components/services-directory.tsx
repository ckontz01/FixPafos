"use client";
import { ArrowUpRight } from "lucide-react";
import { departmentIds, departmentFor } from "@/lib/departments";
import DepartmentIdentity from "./department-identity";
import { useI18n } from "./i18n-provider";
import type { MessageKey } from "@/lib/i18n";

export default function ServicesDirectory() {
  const { t } = useI18n();
  return (
    <section className="services-directory">
      <div className="panel-heading">
        <span className="board-kicker">{t("services.kicker")}</span>
        <h1>{t("services.title")}</h1>
        <p>{t("services.subtitle")}</p>
      </div>
      <div className="directory-note">{t("services.note")}</div>
      {departmentIds.map((id) => (
        <article className="service-card" key={id}>
          <DepartmentIdentity id={id} />
          <p>{t(`departmentRemit.${id}` as MessageKey)}</p>
          <a
            className="text-link"
            href={departmentFor(id).url}
            target="_blank"
            rel="noreferrer"
          >
            {t("issue.officialContact")} <ArrowUpRight size={15} />
          </a>
        </article>
      ))}
      <p className="directory-disclaimer">{t("services.disclaimer")}</p>
    </section>
  );
}
