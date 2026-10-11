import Script from "next/script";
import dynamic from "next/dynamic";
import Hero from "@/components/HomePage/Hero/Hero";
import Nav from "@/components/shared/Nav/Nav";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Stats from "@/components/HomePage/Stats/Stats";
import { homeQuestions } from "@/lib/data";
import { Metadata } from "next";
import ServicesMarquee from "@/components/shared/ServicesMarquee/ServicesMarquee";
import { getBookingWidgetData } from "@/lib/booking/widgetData";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";

const HowItWorks = dynamic(
  () => import("@/components/shared/HowItWorks/HowItWorks"),
);
const ServiceAreas = dynamic(
  () => import("@/components/HomePage/ServiceAreas/ServiceAreas"),
);
// const FlightTrackerSection = dynamic(
//   () =>
//     import("@/components/HomePage/FlightTrackerSection/FlightTrackerSection"),
// );
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
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY}&libraries=places`}
        strategy='lazyOnload'
      />
      <Nav />
      <Hero
        serviceTypes={widget.serviceTypes}
        vehicles={widget.vehicles}
        companyTimezone={widget.companyTimezone}
        companyTimezoneLabel={widget.companyTimezoneLabel}
      />
      <AboutUsIntro />
      <Stats />
      <ServicesMarquee />
      <HowItWorks />
      <ServiceAreas />
      {/* <FlightTrackerSection /> */}
      <CorporateIntro />
      <WekopaIntro />
      <CharterIntro />
      <Fleet />
      <Testimonials />
      <Events />
      <Faq items={homeQuestions} />
      <BlogSection />
      {/* <AboutNumbers /> */}
      <FinalCTA />
    </main>
  );
}
