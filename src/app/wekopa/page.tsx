import { Suspense } from "react";
import type { Metadata } from "next";
import styles from "./WekoPaPage.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Faq from "@/components/shared/Faq/Faq";
import { wekopaQuestions } from "@/lib/data";
import WekoPaBookingSection from "@/components/Wekopa/WekoPaBookingSection/WekoPaBookingSection";
import WekoPaPricing from "@/components/Wekopa/WekoPaPricing/WekoPaPricing";
import WekopaFinalCTA from "@/components/Wekopa/WekopaFinalCTA/WekopaFinalCTA";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import WekoImage from "../../../public/images/other/Wekopa.jpg";
import Img2 from "../../../public/images/people/linda.jpg";
import Marquee from "@/components/shared/Marquee/Marquee";
import ScrollToSectionButton from "@/components/shared/ScrollToSectionButton/ScrollToSectionButton";
import ClearHash from "@/components/shared/ClearHash/ClearHash";
import FlightTrackerSection from "@/components/HomePage/FlightTrackerSection/FlightTrackerSection";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "We-Ko-Pa Golf Club Car Service | Sky Harbor Transfers | Nier Transportation",
  description:
    "Flat-rate private car service between Phoenix Sky Harbor Airport and We-Ko-Pa Golf Club & Casino Resort. From $90 with fare and gratuity included — flight tracked, available 24/7 for golf outings, casino trips, and resort stays.",
  alternates: {
    canonical: `${SITE_URL}/wekopa`,
  },
  openGraph: {
    title: "We-Ko-Pa Golf Club Car Service | Nier Transportation",
    description:
      "Flat-rate Sky Harbor ↔ We-Ko-Pa transfers. Fare and gratuity included, flight tracked, available 24/7.",
    url: `${SITE_URL}/wekopa`,
  },
};

const wekopaServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "We-Ko-Pa Golf Club Car Service",
  url: `${SITE_URL}/wekopa`,
  description:
    "Private flat-rate transfers between Phoenix Sky Harbor International Airport and We-Ko-Pa Golf Club & Casino Resort in Fort McDowell, Arizona. Sedans, SUVs, and Sprinter vans with fare and gratuity included in every rate.",
  provider: {
    "@type": "LocalBusiness",
    name: "Nier Transportation",
    url: SITE_URL,
  },
  areaServed: ["Phoenix", "Scottsdale", "Fountain Hills", "Fort McDowell"],
};

export default function WekoPaPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(wekopaServiceSchema),
        }}
      />
      <ClearHash />
      <Nav background='cream' />

      {/* ─── HERO ─── */}
      <ServicePageIntro
        heading='Sky Harbor to We-Ko-Pa, We-Ko-Pa to Sky Harbor'
        label='We-Ko-Pa transfers'
        stat={{
          quote:
            "Have used this service multiple times. The drivers are great. Always very professional and prompt. You can tell they care about safety and a great customer experience, would definitely recommend it.",
          authorImage: Img2,
          authorName: "Illeana L.",
        }}
        heroImage={WekoImage}
        button={
          <ScrollToSectionButton
            sectionId='booking'
            text='Book Your Transfer'
          />
        }
      />
      <Marquee
        words={["We-Ko-Pa", "Golf", "&", "Casino", "Resort"]}
        speedSeconds={90}
      />

      <WekoPaPricing />
      <FlightTrackerSection />

      {/* ─── INLINE BOOKING ─── */}
      <section id='booking' className={styles.bookingInline}>
        <Suspense
          fallback={
            <div
              style={{
                padding: "6rem 3rem",
                textAlign: "center",
                fontSize: "1.6rem",
                opacity: 0.4,
              }}
            >
              Loading...
            </div>
          }
        >
          <WekoPaBookingSection />
        </Suspense>
      </section>

      <Faq items={wekopaQuestions} />

      <WekopaFinalCTA />
    </main>
  );
}
