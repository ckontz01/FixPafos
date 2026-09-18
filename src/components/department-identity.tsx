import Image from "next/image";
import { departmentFor } from "@/lib/departments";
export default function DepartmentIdentity({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const department = departmentFor(id);
  const [authority, service] = department.name.split(" · ");
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
