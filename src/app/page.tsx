/* eslint-disable @typescript-eslint/no-explicit-any */
import Script from "next/script";
import dynamic from "next/dynamic";
import Hero from "@/components/HomePage/Hero/Hero";
import Nav from "@/components/shared/Nav/Nav";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Stats from "@/components/HomePage/Stats/Stats";
import { homeQuestions } from "@/lib/data";
import { Metadata } from "next";
import ServicesMarquee from "@/components/shared/ServicesMarquee/ServicesMarquee";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../actions/admin/companySettings";

const HowItWorks = dynamic(
  () => import("@/components/shared/HowItWorks/HowItWorks"),
);
const ServiceAreas = dynamic(
  () => import("@/components/HomePage/ServiceAreas/ServiceAreas"),
);
const FlightTrackerSection = dynamic(
  () =>
    import("@/components/HomePage/FlightTrackerSection/FlightTrackerSection"),
);
const CorporateIntro = dynamic(
  () => import("@/components/HomePage/CorporateIntro/CorporateIntro"),
);
const WekopaIntro = dynamic(
  () => import("@/components/HomePage/WekopaIntro/WekopaIntro"),
);
const CharterIntro = dynamic(
  () => import("@/components/HomePage/CharterIntro/CharterIntro"),
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
const AboutNumbers = dynamic(
  () => import("@/components/shared/AboutNumbers/AboutNumbers"),
);

export const metadata: Metadata = {
  title: "Black Car Service Phoenix & Scottsdale | Nier Transportation",
  description:
    "Phoenix and Scottsdale's trusted black car service since 2004. Flat-rate airport transfers, hourly chauffeur, corporate rides, and weddings. No surge pricing, available 24/7.",
  alternates: {
    canonical: "https://www.niertransportation.com",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LimousineBusService",
  name: "Nier Transportation",
  url: "https://www.niertransportation.com",
  logo: "https://www.niertransportation.com/nierLogo.png",
  image: "https://www.niertransportation.com/nierLogo.png",
  telephone: "+1-480-300-6003",
  email: "info@niertransportation.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "10105 E Via Linda, Ste A-105",
    addressLocality: "Scottsdale",
    addressRegion: "AZ",
    postalCode: "85258",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 33.5611,
    longitude: -111.8896,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  areaServed: [
    "Phoenix, AZ",
    "Scottsdale, AZ",
    "Tempe, AZ",
    "Mesa, AZ",
    "Chandler, AZ",
    "Gilbert, AZ",
    "Peoria, AZ",
    "Glendale, AZ",
    "Paradise Valley, AZ",
    "Cave Creek, AZ",
    "Fountain Hills, AZ",
  ],
  priceRange: "$$",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// Module-level constant is fine here — no await needed
const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/Phoenix": "Phoenix, AZ (MST)",
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
};

// ── async so DB queries work inside the component ─────────────────────────────
export default async function HomePage() {
  // ── Company settings ──────────────────────────────────────────────────────
  const companySettings = await getCompanySettings();
  const companyTimezoneLabel =
    TIMEZONE_SHORT_LABELS[companySettings.timezone] ?? companySettings.timezone;

  // ── Service types ─────────────────────────────────────────────────────────
  const serviceTypesRaw = await db.serviceType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      pricingStrategy: true,
      minFareCents: true,
      baseFeeCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      minHours: true,
      active: true,
      airportLeg: true,

      // ── NEW: airports for airport service dropdowns in the widget ──
      airports: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          iata: true,
        },
      },

      fees: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          amountCents: true,
        },
      },
    },
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const vehicles = await db.vehicle.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
      minHours: true,
      baseFareCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      active: true,
      callForPricing: true,
    },
  });

  return (
    <main>
      {/* ── Structured data ── */}
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── Google Maps script for Places autocomplete in the booking widget ── */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY}&libraries=places`}
        strategy='lazyOnload'
      />
      <Nav />
      <Hero
        serviceTypes={serviceTypesRaw as any}

        vehicles={vehicles as any}
        companyTimezone={companySettings.timezone}
        companyTimezoneLabel={companyTimezoneLabel}
      />
      <AboutUsIntro />
      <Stats />
      <ServicesMarquee />
      <HowItWorks />
      <ServiceAreas />
      <FlightTrackerSection />
      <CorporateIntro />
      <WekopaIntro />
      <CharterIntro />
      <Fleet />
      <Testimonials />
      <Events />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
