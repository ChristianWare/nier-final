import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fleetData } from "@/lib/data";
import type { Vehicle } from "@/lib/types/fleet";
import FleetDetails from "./components/FleetDetails/FleetDetails";
import FleetSlugPageIntro from "./components/FleetSlugPageIntro/FleetSlugPageIntro";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Nav from "@/components/shared/Nav/Nav";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v: Vehicle | undefined = fleetData.find((f) => f.slug === slug);
  return {
    title: v?.seo?.metaTitle ?? v?.title ?? "Vehicle",
    description:
      v?.seo?.metaDescription ?? v?.shortDesc ?? v?.desc ?? v?.longDesc,
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const vehicle: Vehicle | undefined = fleetData.find((f) => f.slug === slug);
  if (!vehicle) notFound();

  return (
    <main>
      <Nav background='accent' />
      <FleetSlugPageIntro vehicle={vehicle} />
      <FleetDetails vehicle={vehicle} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
