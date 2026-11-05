import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import CharterPageIntro from "@/components/charterPage/CharterPageIntro/CharterPageIntro";
import CharterPricing from "@/components/charterPage/CharterPricing/CharterPricing";
import CharterGuide from "@/components/charterPage/CharterGuide/CharterGuide";
import CharterFleet from "@/components/charterPage/CharterFleet/CharterFleet";
import RelatedLinks from "@/components/shared/RelatedLinks/RelatedLinks";
import Faq from "@/components/shared/Faq/Faq";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import { BUSINESS_REF } from "@/lib/schema";
import {
  SCOTTSDALE_CHARTER_FAQS,
  SCOTTSDALE_CHARTER_INTRO,
  SCOTTSDALE_CHARTER_TRIPS,
  SCOTTSDALE_CHARTER_VENUES,
} from "@/lib/charterPages";
import introStyles from "@/components/charterPage/CharterPageIntro/CharterPageIntro.module.css";

// The pricing cards read Admin → Vehicle Categories (refreshed on save).
export const revalidate = 3600;

const URL = "https://www.niertransportation.com/charter-bus-rental-scottsdale";

export const metadata: Metadata = {
  title: "Charter Bus Rental Scottsdale, AZ: Coach Buses & Mini Buses | Nier",
  description:
    "Charter bus rental in Scottsdale, AZ from a Scottsdale-based company: 56-passenger coaches and 28–40 passenger mini buses for resort conferences, weddings, the WM Phoenix Open, spring training and Sedona trips.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Charter Bus Rental Scottsdale, AZ | Nier Transportation",
    description:
      "Coach buses and mini buses for Scottsdale resort conferences, weddings, golf and event weeks. See prices online.",
    url: URL,
    type: "website",
    siteName: "Nier Transportation",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Charter Bus Rental Scottsdale",
  url: URL,
  description:
    "Charter bus and mini bus rental in Scottsdale, Arizona for resort conferences, weddings, golf groups, the WM Phoenix Open, Barrett-Jackson, spring training and Arizona day trips.",
  provider: BUSINESS_REF,
  areaServed: [
    {
      "@type": "City",
      name: "Scottsdale",
      sameAs: "https://www.wikidata.org/wiki/Q491118",
    },
    { "@type": "State", name: "Arizona" },
  ],
  serviceType: "Charter Bus Rental",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SCOTTSDALE_CHARTER_FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function CharterBusRentalScottsdalePage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='white' />
      <Breadcrumbs
        items={[
          { name: "Charter Bus Rental", href: "/charter-bus-rental-phoenix" },
          { name: "Scottsdale" },
        ]}
      />
      <CharterPageIntro
        eyebrow='Charter Bus Rental Scottsdale'
        heading='Charter Bus & Mini Bus Rental in Scottsdale, AZ'
      >
        <p className={introStyles.copy}>
          Charter bus rental in Scottsdale from a company that&apos;s based
          here. Nier Transportation runs 56-passenger coach buses, 28- and
          40-passenger mini buses and executive Sprinters for resort
          conferences, weddings, golf groups and Scottsdale&apos;s big event
          weeks, from the WM Phoenix Open to Barrett-Jackson and spring
          training. Need more than one bus? We send as many as your group needs,
          on one booking. See your price online, or tell us about the trip and
          we&apos;ll plan it with you.
        </p>
      </CharterPageIntro>
      <CharterGuide
        place='Scottsdale'
        intro={SCOTTSDALE_CHARTER_INTRO}
        tripsHeading='Charter bus trips from Scottsdale'
        tripsCopy='Approximate highway distances and drive times from central Scottsdale. North Scottsdale pickups add 15–20 minutes to most of these.'
        trips={SCOTTSDALE_CHARTER_TRIPS}
        venuesHeading='Scottsdale resorts, venues and events we drive to'
        venuesCopy='Every resort and venue has its own coach loading spot and event-day rules. We confirm them before your date, so the bus is in the right place when your group walks out.'
        venues={SCOTTSDALE_CHARTER_VENUES}
      />
      <CharterPricing />
      <CharterFleet />
      <RelatedLinks
        title='More for Scottsdale groups'
        links={[
          {
            label: "Charter bus rental in Phoenix",
            href: "/charter-bus-rental-phoenix",
          },
          {
            label: "How much a charter bus costs",
            href: "/blog/charter-bus-rental-cost-phoenix",
          },
          {
            label: "Group transportation",
            href: "/services/group-transportation",
          },
          {
            label: "Golf outing transportation",
            href: "/services/golf-outing-transportation",
          },
          { label: "Scottsdale car service", href: "/locations/scottsdale" },
          {
            label: "Scottsdale to Sky Harbor",
            href: "/routes/scottsdale-to-sky-harbor",
          },
        ]}
      />
      <Faq
        items={SCOTTSDALE_CHARTER_FAQS}
        limit={SCOTTSDALE_CHARTER_FAQS.length}
      />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
