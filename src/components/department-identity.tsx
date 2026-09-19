"use client";
import Image from "next/image";
import { departmentKey } from "@/lib/departments";
import { useI18n } from "./i18n-provider";

export default function DepartmentIdentity({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  // Display names are translated; the " · " separator is shared by every locale.
  const [authority, service] = t(departmentKey(id)).split(" · ");
  const eoa = id === "water" || id === "sewerage";
  return (
    <span className={`department-identity${compact ? " compact" : ""}`}>
      <span className={`authority-logo${eoa ? " eoa" : ""}`}>
        <Image
          src={
            eoa
              ? "/authorities/eoa-pafos.png"
              : "/authorities/pafos-municipality.png"
          }
          alt={`${authority} official logo`}
          width={eoa ? 2360 : 100}
          height={eoa ? 588 : 100}
          sizes={compact ? "60px" : "88px"}
        />
      </span>
      <span className="department-name">
        <span>{authority}</span>
        <strong>{service}</strong>
      </span>
    </span>
  );
}
