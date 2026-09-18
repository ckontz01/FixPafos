import { ArrowUpRight } from "lucide-react";
import { departments } from "@/lib/departments";
import DepartmentIdentity from "./department-identity";
export default function ServicesDirectory() {
  return (
    <section className="services-directory">
      <div className="panel-heading">
        <span className="board-kicker">KNOW WHO TO CONTACT</span>
        <h1>Local services.</h1>
        <p>Find the team that looks after your neighbourhood.</p>
      </div>
      <div className="directory-note">
        Reports receive a suggested service. For an official request, contact
        the authority directly.
      </div>
      {Object.entries(departments).map(([id, department]) => (
        <article className="service-card" key={id}>
          <DepartmentIdentity id={id} />
          <p>{department.remit}</p>
          <a
            className="text-link"
            href={department.url}
            target="_blank"
            rel="noreferrer"
          >
            Official contact page <ArrowUpRight size={15} />
          </a>
        </article>
      ))}
      <p className="directory-disclaimer">
        Official authority logos identify each service. PafosLive is an
        independent community platform.
      </p>
    </section>
  );
}
