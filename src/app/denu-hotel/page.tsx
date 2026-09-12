import { Suspense } from "react";
import type { Metadata } from "next";
import styles from "./DenuHotelPage.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Faq from "@/components/shared/Faq/Faq";
import { denuQuestions } from "@/lib/data";
import DenuBookingSection from "@/components/Denu/DenuBookingSection/DenuBookingSection";
import DenuPricing from "@/components/Denu/DenuPricing/DenuPricing";
import DenuRateCard from "@/components/Denu/DenuRateCard/DenuRateCard";
import DenuFinalCTA from "@/components/Denu/DenuFinalCTA/DenuFinalCTA";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import DenuImage from "../../../public/images/other/Denu.jpeg";
import Img2 from "../../../public/images/people/linda.jpg";
import Marquee from "@/components/shared/Marquee/Marquee";
import ScrollToSectionButton from "@/components/shared/ScrollToSectionButton/ScrollToSectionButton";
import ClearHash from "@/components/shared/ClearHash/ClearHash";
import FlightTrackerSection from "@/components/HomePage/FlightTrackerSection/FlightTrackerSection";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "Denū Hotel & Spa Car Service | Sky Harbor Transfers | Nier Transportation",
  description:
    "Flat-rate private car service between Phoenix Sky Harbor Airport and Denū Hotel & Spa in Downtown Phoenix. From $79 with gratuity included — flight tracked, available 24/7 for hotel guests, meetings, and events.",
  alternates: {
    canonical: `${SITE_URL}/denu-hotel`,
  },
  openGraph: {
    title: "Denū Hotel & Spa Car Service | Nier Transportation",
    description:
      "Flat-rate Sky Harbor ↔ Denū Hotel & Spa transfers. Gratuity included, flight tracked, available 24/7.",
    url: `${SITE_URL}/denu-hotel`,
  },
};

const denuServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Denū Hotel & Spa Car Service",
  url: `${SITE_URL}/denu-hotel`,
  description:
    "Private flat-rate transfers between Phoenix Sky Harbor International Airport, Mesa Gateway Airport, and Denū Hotel & Spa at 1 E Adams St in Downtown Phoenix. SUVs and Sprinter vans with gratuity included in every rate.",
  provider: {
    "@type": "LocalBusiness",
    name: "Nier Transportation",
    url: SITE_URL,
  },
  areaServed: ["Phoenix", "Scottsdale", "Glendale", "Mesa"],
};

export default function DenuHotelPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(denuServiceSchema),
        }}
      />
      <ClearHash />
      <Nav background='cream' />

      {/* ─── HERO ─── */}
      <ServicePageIntro
        heading='Sky Harbor to Denū, Denū to Sky Harbor'
        label='Denū Hotel transfers'
        stat={{
          quote:
            "Have used this service multiple times. The drivers are great. Always very professional and prompt. You can tell they care about safety and a great customer experience, would definitely recommend it.",
          authorImage: Img2,
          authorName: "Illeana L.",
        }}
        heroImage={DenuImage}
        button={
          <ScrollToSectionButton
            sectionId='booking'
            text='Book Your Transfer'
          />
        }
      />
      <Marquee
        words={["Denū", "Hotel", "&", "Spa", "Downtown", "Phoenix"]}
        speedSeconds={90}
      />

      <DenuPricing />
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
          <DenuBookingSection />
        </Suspense>
      </section>

      <DenuRateCard />

      <Faq items={denuQuestions} />

      <DenuFinalCTA />
    </main>
  );
}
