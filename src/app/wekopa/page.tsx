import { Suspense } from "react";
import styles from "./WekoPaPage.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Faq from "@/components/shared/Faq/Faq";
import { wekopaQuestions } from "@/lib/data";
import WekoPaBookingSection from "@/components/Wekopa/WekoPaBookingSection/WekoPaBookingSection";
import WekoPaPricing from "@/components/Wekopa/WekoPaPricing/WekoPaPricing";
import WekopaFinalCTA from "@/components/Wekopa/WekopaFinalCTA/WekopaFinalCTA";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import WekoImage from "../../../public/images/Wekopa.jpg";
import Img2 from "../../../public/images/linda.jpg";
import Marquee from "@/components/shared/Marquee/Marquee";
import ScrollToSectionButton from "@/components/shared/ScrollToSectionButton/ScrollToSectionButton";
import ClearHash from "@/components/shared/ClearHash/ClearHash";

export default function WekoPaPage() {
  return (
    <main>
      <ClearHash />
      <Nav background='cream' />

      {/* ─── HERO ─── */}
      <ServicePageIntro
        heading='Sky Harbor to Wekopa, Wekopa to Sky Harbor'
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
        words={["Sky Harbor", "→", "We-Ko-Pa", "Golf", "&", "Casino", "Resort"]}
        speedSeconds={90}
      />

      <WekoPaPricing />

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
