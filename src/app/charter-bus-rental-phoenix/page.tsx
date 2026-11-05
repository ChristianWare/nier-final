import AboutUsIntroCharter from "@/components/charterPage/AboutUsIntroCharter/AboutUsIntroCharter";
import CharterBenefits from "@/components/charterPage/CharterBenefits/CharterBenefits";
import CharterClients from "@/components/charterPage/CharterClients/CharterClients";
import CharterFleet from "@/components/charterPage/CharterFleet/CharterFleet";
import CharterPageIntro from "@/components/charterPage/CharterPageIntro/CharterPageIntro";
import CharterPricing from "@/components/charterPage/CharterPricing/CharterPricing";
import WhyCharter from "@/components/charterPage/WhyCharter/WhyCharter";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import RelatedLinks from "@/components/shared/RelatedLinks/RelatedLinks";
import { charterQuestions } from "@/lib/data";
import type { Metadata } from "next";
import { BUSINESS_REF } from "@/lib/schema";
import CharterGuide from "@/components/charterPage/CharterGuide/CharterGuide";
import {
  PHOENIX_CHARTER_TRIPS,
  PHOENIX_CHARTER_VENUES,
} from "@/lib/charterPages";

// The pricing cards read Admin → Vehicle Categories (refreshed on save).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Charter Bus Rental Phoenix, AZ: Coach Bus & Motor Coach | Nier",
  description:
    "Charter bus rental in Phoenix, AZ: 56-passenger coach buses, 28–40 passenger mini buses and Sprinters for conventions, weddings, game days and Arizona trips. See prices online, 2-hour minimum, 24/7.",
  alternates: {
    canonical: "https://www.niertransportation.com/charter-bus-rental-phoenix",
  },
};

const charterServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Charter Bus & Motor Coach Rental Phoenix",
  url: "https://www.niertransportation.com/charter-bus-rental-phoenix",
  description:
    "Luxury 56-passenger charter bus rental serving Phoenix, Scottsdale, and the greater Metro Phoenix area. Available for corporate events, weddings, airport group transfers, and private group outings.",
  provider: BUSINESS_REF,
  areaServed: [
    {
      "@type": "City",
      name: "Phoenix",
      sameAs: "https://www.wikidata.org/wiki/Q16556",
    },
    {
      "@type": "City",
      name: "Scottsdale",
      sameAs: "https://www.wikidata.org/wiki/Q491118",
    },
    {
      "@type": "State",
      name: "Arizona",
    },
  ],
  serviceType: "Charter Bus Rental",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Charter Bus Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Corporate Charter Bus",
          description:
            "Private charter bus for corporate events, off-sites, and employee shuttle programs across the Phoenix metro.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Wedding Charter Bus",
          description:
            "Luxury group transportation for wedding parties and guests throughout Phoenix and Scottsdale.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Airport Group Transfer",
          description:
            "Group transfers to and from Phoenix Sky Harbor International Airport for up to 56 passengers.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Private Group Outings",
          description:
            "Charter bus transportation for private events, sporting events, concerts, and group excursions in Arizona.",
        },
      },
    ],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: charterQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function CharterBusRentalPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(charterServiceSchema),
        }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='white' />
      <CharterPageIntro />
      <WhyCharter />
      <CharterBenefits />
      <CharterClients />
      <CharterPricing />
      <CharterGuide
        place='Phoenix'
        tripsHeading='Arizona charter bus trips from Phoenix'
        tripsCopy='Phoenix is the starting point for most Arizona charter bus trips. These are the runs groups book with us most, with approximate highway distances and drive times. For long days, federal rules limit bus drivers to 10 hours of driving per shift, so we plan a second driver or an overnight when a trip needs it.'
        trips={PHOENIX_CHARTER_TRIPS}
        venuesHeading='Phoenix venues and events we drive to'
        venuesCopy='Stadium days, conventions and concerts all come with their own drop zones, road closures and exit traffic. We plan the staging before the day, so your group gets dropped near the door and picked up together.'
        venues={PHOENIX_CHARTER_VENUES}
      />
      <AboutUsIntroCharter />
      <CharterFleet />
      <RelatedLinks
        title='Planning group transportation?'
        links={[
          {
            label: "Charter bus rental in Scottsdale",
            href: "/charter-bus-rental-scottsdale",
          },
          {
            label: "How much a charter bus costs",
            href: "/blog/charter-bus-rental-cost-phoenix",
          },
          {
            label: "Group transportation in Phoenix",
            href: "/services/group-transportation",
          },
          { label: "Party bus service", href: "/services/party-bus" },
          { label: "Our motorcoach", href: "/fleet/motorcoach" },
          { label: "Our mini buses", href: "/fleet/mini-party-bus-20-40" },
        ]}
      />
      <Faq items={charterQuestions} limit={charterQuestions.length} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
