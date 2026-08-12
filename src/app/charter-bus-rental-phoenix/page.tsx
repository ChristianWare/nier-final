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

export const metadata: Metadata = {
  title: "Charter Bus & Motor Coach Rental Phoenix | Nier Transportation",
  description:
    "Charter bus and motor coach rental in Phoenix — 56-passenger luxury coach, mini party bus, and Sprinters for corporate events, weddings, airport transfers, and group outings. Available 24/7 across the Valley.",
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
  provider: {
    "@type": "LocalBusiness",
    name: "Nier Transportation",
    url: "https://www.niertransportation.com",
    telephone: "+14803006003",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Phoenix",
      addressRegion: "AZ",
      addressCountry: "US",
    },
    priceRange: "$$",
    image: "https://www.niertransportation.com/images/other/charter-bus.jpg",
  },
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
      <AboutUsIntroCharter />
      <CharterFleet />
      <RelatedLinks
        title='Planning group transportation?'
        links={[
          {
            label: "Group transportation in Phoenix",
            href: "/services/group-transportation",
          },
          { label: "Party bus service", href: "/services/party-bus" },
          { label: "Our motorcoach", href: "/fleet/motorcoach" },
          { label: "Our party bus fleet", href: "/fleet/party-bus" },
        ]}
      />
      <Faq items={charterQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
