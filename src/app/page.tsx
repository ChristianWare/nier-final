import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import CorporateIntro from "@/components/HomePage/CorporateIntro/CorporateIntro";
import Events from "@/components/HomePage/Events/Events";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import FlightTrackerSection from "@/components/HomePage/FlightTrackerSection/FlightTrackerSection";
import Hero from "@/components/HomePage/Hero/Hero";
import ServiceAreas from "@/components/HomePage/ServiceAreas/ServiceAreas";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import Stats from "@/components/HomePage/Stats/Stats";
import WekopaIntro from "@/components/HomePage/WekopaIntro/WekopaIntro";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Nav from "@/components/shared/Nav/Nav";
import Testimonials from "@/components/shared/Testimonials/Testimonials";
import { homeQuestions } from "@/lib/data";
import { Metadata } from "next";

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

export default function HomePage() {
  return (
    <main>
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
      <Nav />
      <Hero />
      <AboutUsIntro />
      <Stats />
      <ServicesPreview />
      <HowItWorks />
      <ServiceAreas />
      <FlightTrackerSection />
      <CorporateIntro />
      <WekopaIntro />
      <Fleet />
      <Testimonials />
      <Events />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
