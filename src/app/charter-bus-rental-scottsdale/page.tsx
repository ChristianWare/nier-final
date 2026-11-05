import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import CharterPageIntro from "@/components/charterPage/CharterPageIntro/CharterPageIntro";
import Link from "next/link";
import CharterWhy from "@/components/charterPage/CharterWhy/CharterWhy";
import CharterTable from "@/components/charterPage/CharterTable/CharterTable";
import CharterVenues from "@/components/charterPage/CharterVenues/CharterVenues";
import CharterSteps from "@/components/charterPage/CharterSteps/CharterSteps";
import CharterPricingFeature from "@/components/charterPage/CharterPricingFeature/CharterPricingFeature";
import CharterFleet from "@/components/charterPage/CharterFleet/CharterFleet";
import CharterMoreLinks from "@/components/charterPage/CharterMoreLinks/CharterMoreLinks";
import { BUS_SIZE_GUIDE } from "@/components/charterPage/CharterGuide/CharterGuide";
import { HOURLY_MIN_HOURS } from "@/lib/booking/rules";
import { locationPageCities } from "@/lib/cities";
import Faq from "@/components/shared/Faq/Faq";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import { BUSINESS_REF } from "@/lib/schema";
import {
  SCOTTSDALE_CHARTER_FAQS,
  SCOTTSDALE_CHARTER_TRIPS,
  SCOTTSDALE_CHARTER_VENUES,
  SCOTTSDALE_CHARTER_WHY,
  SCOTTSDALE_MORE_LINKS,
} from "@/lib/charterPages";
import introStyles from "@/components/charterPage/CharterPageIntro/CharterPageIntro.module.css";

// The pricing cards read Admin → Vehicle Categories (refreshed on save).
export const revalidate = 3600;

const URL = "https://www.niertransportation.com/charter-bus-rental-scottsdale";

const SCOTTSDALE_IMAGE = locationPageCities.find(
  (c) => c.slug === "scottsdale",
)!.src;

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
      <CharterWhy
        {...SCOTTSDALE_CHARTER_WHY}
        image={SCOTTSDALE_IMAGE}
        imageAlt='Charter bus rental in Scottsdale, Arizona'
      />
      <CharterTable
        eyebrow='Which bus do you need?'
        heading='Charter bus sizes and typical prices in Scottsdale'
        copy={`Pick the bus by headcount, then leave a few seats free if the group has luggage. Every charter is booked by the hour with a ${HOURLY_MIN_HOURS}-hour minimum, and the totals below are what recent charters with us have typically come to. Your exact price shows in the booking tool before you book.`}
        columns={["Group size", "Bus", "Typical charter total", "Best for"]}
        rows={BUS_SIZE_GUIDE.map((r) => ({
          key: r.group,
          cells: [
            r.group,
            <Link key='bus' href={r.href}>
              {r.bus}
            </Link>,
            r.typical,
            r.bestFor,
          ],
        }))}
        note={
          <>
            Prices vary with hours, the date and your route. See the{" "}
            <Link href='/blog/charter-bus-rental-cost-phoenix'>
              charter bus cost guide
            </Link>{" "}
            for sample trips and how to keep the total down.
          </>
        }
      />
      <CharterTable
        eyebrow='Arizona charter bus trips'
        heading='Charter bus trips from Scottsdale'
        copy='Approximate highway distances and drive times from central Scottsdale. North Scottsdale pickups add 15–20 minutes to most of these.'
        columns={["Destination", "Distance", "Drive time", "Good to know"]}
        template='1.3fr 1fr 1fr 2fr'
        rows={SCOTTSDALE_CHARTER_TRIPS.map((t) => ({
          key: t.destination,
          cells: [
            t.href ? (
              <Link key='dest' href={t.href}>
                {t.destination}
              </Link>
            ) : (
              t.destination
            ),
            t.distance,
            t.time,
            t.note,
          ],
        }))}
      />
      <CharterVenues
        heading='Scottsdale resorts, venues and events we drive to'
        copy='Every resort and venue has its own coach loading spot and event-day rules. We confirm them before your date, so the bus is in the right place when your group walks out.'
        venues={SCOTTSDALE_CHARTER_VENUES}
      />
      <CharterSteps />
      <CharterPricingFeature place='Scottsdale' />
      <CharterFleet />
      <CharterMoreLinks
        eyebrow='Keep planning'
        heading='More for Scottsdale groups'
        copy='Planning a bigger trip, a golf day or an airport run? These pages cover the rest of what Scottsdale groups ask us about.'
        links={SCOTTSDALE_MORE_LINKS}
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
