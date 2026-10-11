import Script from "next/script";
import dynamic from "next/dynamic";
import Hero from "@/components/HomePage/Hero/Hero";
import Nav from "@/components/shared/Nav/Nav";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import QuoteBand from "@/components/HomePage/QuoteBand/QuoteBand";
import Stats from "@/components/HomePage/Stats/Stats";
import { homepageFaqs } from "@/lib/data";
import { Metadata } from "next";
import ServicesMarquee from "@/components/shared/ServicesMarquee/ServicesMarquee";
import { getBookingWidgetData } from "@/lib/booking/widgetData";
import { googleMapsSrc } from "@/lib/googleMaps";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";

const AirportCarService = dynamic(
  () => import("@/components/HomePage/AirportCarService/AirportCarService"),
);
const ChauffeurLimo = dynamic(
  () => import("@/components/HomePage/ChauffeurLimo/ChauffeurLimo"),
);
const Neighborhoods = dynamic(
  () => import("@/components/HomePage/Neighborhoods/Neighborhoods"),
);
const ServiceAreas = dynamic(
  () => import("@/components/HomePage/ServiceAreas/ServiceAreas"),
);
const CorporateIntro = dynamic(
  () => import("@/components/HomePage/CorporateIntro/CorporateIntro"),
);
const GroupsIntro = dynamic(
  () => import("@/components/HomePage/GroupsIntro/GroupsIntro"),
);
const Fleet = dynamic(() => import("@/components/HomePage/Fleet/Fleet"));
const Testimonials = dynamic(
  () => import("@/components/shared/Testimonials/Testimonials"),
);
const Events = dynamic(() => import("@/components/HomePage/Events/Events"));
const Faq = dynamic(() => import("@/components/shared/Faq/Faq"));
const BlogSection = dynamic(
  () => import("@/components/shared/BlogSection/BlogSection"),
);

// The homepage is the Phoenix + Scottsdale money page: it targets "black car
// service Phoenix", "chauffeur service Phoenix" and "Phoenix car service".
// /locations/phoenix redirects here (next.config.ts).
const TITLE = "Black Car & Chauffeur Service Phoenix & Scottsdale | Nier";
const DESCRIPTION =
  "Phoenix and Scottsdale black car and chauffeur service since 2004. Flat-rate Sky Harbor transfers, hourly chauffeurs, limos and Sprinters. No surge pricing, 24/7.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.niertransportation.com",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Nier Transportation",
    type: "website",
    images: [
      {
        url: "https://www.niertransportation.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nier Transportation: black car and chauffeur service in Phoenix & Scottsdale",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.niertransportation.com/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homepageFaqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default async function HomePage() {
  // Booking widget data (services, airports, fees, vehicles, timezone)
  const widget = await getBookingWidgetData();

  return (
    <main>
      {/* ── Structured data ── */}
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── Google Maps script for Places autocomplete in the booking widget ── */}
      <Script
        id='google-maps'
        src={googleMapsSrc()}
        data-google-maps='1'
        strategy='lazyOnload'
      />
      <Nav />
      <Hero
        serviceTypes={widget.serviceTypes}
        vehicles={widget.vehicles}
        companyTimezone={widget.companyTimezone}
        companyTimezoneLabel={widget.companyTimezoneLabel}
      />
      <QuoteBand widget={widget} />
      <AboutUsIntro />
      <Stats />
      <AirportCarService />
      <ChauffeurLimo />
      <ServicesMarquee />
      <Fleet />
      <Neighborhoods />
      <ServiceAreas />
      <CorporateIntro />
      <GroupsIntro />
      <Testimonials />
      <Events />
      <Faq items={homepageFaqs} />
      <BlogSection />
      <FinalCTA />
    </main>
  );
}
