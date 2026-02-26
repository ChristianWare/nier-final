// app/services/[slug]/page.tsx  (server component)

import type { Metadata } from "next";
import { servicesData } from "@/lib/services";
import ServiceDetailsClient from "./components/ServiceDetailsClient/ServiceDetailsClient";

type Params = { slug: string };

/* ——— dynamic <title> ——— */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const svc = servicesData.find((s) => s.slug === slug);
  if (!svc) return { title: "Service Not Found" };
  return {
    title: `${svc.title} | Luxury Black Car Service Phoenix`,
    description: svc.description || svc.marketingCopy || svc.copy || "",
  };
}

/* ——— page component ——— */
export default async function Page(
  { params }: { params: Promise<Params> }, // ← accept the promise
) {
  const { slug } = await params; // ← await it
  const svc = servicesData.find((s) => s.slug === slug);

  if (!svc) {
    return (
      <main>
        <h1>Service not found</h1>
      </main>
    );
  }

  /* pass data to a client component if you need hooks there */
  return <ServiceDetailsClient service={svc} />;
}
