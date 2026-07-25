"use client";

import { servicesData } from "@/lib/services";
// import ServiceSlugPageIntro from "../ServiceSlugPageIntro/ServiceSlugPageIntro";
import ServiceDetails from "../ServiceDetails/ServiceDetails";
import Nav from "@/components/shared/Nav/Nav";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";

/** Exact, readonly type derived from your data */
type Service = (typeof servicesData)[number];

export default function ServiceDetailsClient({
  service,
}: {
  service: Service;
}) {
  return (
    <main>
      <Nav background='white' />
      <Breadcrumbs
        items={[
          { name: "Services", href: "/services" },
          { name: service.title },
        ]}
      />
      {/* <ServiceSlugPageIntro service={service} /> */}
      <ServiceDetails service={service} />
    </main>
  );
}
