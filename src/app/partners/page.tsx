import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/shared/Nav/Nav";
import Button from "@/components/shared/Button/Button";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import Faq from "@/components/shared/Faq/Faq";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutPageIntro from "@/components/AboutPage/AboutPageIntro/AboutPageIntro";
import { partners } from "@/lib/partners";
import { BUSINESS_REF } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";
import styles from "./PartnersPage.module.css";

const TITLE = "Transportation Partners for Hotels, Venues & Planners | Nier";
const DESCRIPTION =
  "Nier Transportation partners with Phoenix and Scottsdale hotels, resorts, wedding venues, golf clubs and planners: a dedicated guest transfer page, flat rates from your address, and 24/7 dispatch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/partners` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/partners",
    type: "website",
    siteName: "Nier Transportation",
  },
};

const whoWeWorkWith = [
  {
    title: "Hotels & resorts",
    copy: "Airport transfers for guests, quoted from your front door, plus local runs to dinner, games and golf.",
  },
  {
    title: "Wedding & event venues",
    copy: "Guest shuttles, the couple's getaway car and late-night returns, coordinated with your event timeline.",
  },
  {
    title: "Golf clubs",
    copy: "Foursome and group transfers with room for clubs, timed to tee times and the drive home after the round.",
  },
  {
    title: "Planners & DMCs",
    copy: "Multi-vehicle logistics for conferences, incentive trips and weddings, under one coordinator and one invoice.",
  },
];

const steps = [
  {
    title: "Tell us about your property",
    description:
      "Your address, the airports and places your guests go most, and how they usually arrive.",
  },
  {
    title: "We build your guest page",
    description:
      "A page on our site with flat rates from your address and booking built in, like the ones for We-Ko-Pa and Denū.",
  },
  {
    title: "Share the link",
    description:
      'Put it on your website\'s "Getting here" page, in confirmation emails, and at the concierge desk. Guests book directly; we handle the rest.',
  },
];

const SNIPPET = `<a href="${SITE_URL}/">Nier Transportation</a>: black car service in Phoenix &amp; Scottsdale, with flat-rate Sky Harbor transfers. Call (480) 300-6003.`;

const faqs = [
  {
    id: "billing",
    question: "Can our business be billed instead of the guest?",
    answer:
      "Yes. A corporate account lets you book rides for guests or staff and pay on one monthly invoice.",
  },
  {
    id: "who",
    question: "What kinds of businesses do you partner with?",
    answer:
      "Hotels and resorts, wedding and event venues, golf clubs, and planners across Phoenix, Scottsdale and the rest of the Valley.",
  },
  {
    id: "start",
    question: "How do we get started?",
    answer:
      "Call (480) 300-6003 or send us a message. We'll ask for your address, the places your guests go most, and how they usually arrive, then build your page from that.",
  },
];

export default function PartnersPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Nier Transportation partner program",
    url: `${SITE_URL}/partners`,
    description: DESCRIPTION,
    publisher: BUSINESS_REF,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: partners.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}${p.href}`,
      })),
    },
  };

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Nav background='white' />

      <AboutPageIntro
        eyebrow={<SectionHeading text='Partner Program' dot />}
        heading='Transportation Partners for Hotels, Venues & Planners'
        copy='We give Phoenix and Scottsdale businesses a dependable car service to send their guests to: a dedicated booking page with flat rates from your address, flight-tracked airport pickups, and 24/7 dispatch.'
        primaryCta={{ text: "Become a partner", href: "/contact" }}
        secondaryCta={{ text: "Call (480) 300-6003", href: "tel:+14803006003" }}
        bottomCopy='Family-owned and based in Scottsdale since 2004.'
        video='/videos/handshake.mp4'
      />

      <section className={styles.section}>
        <LayoutWrapper>
          <div className={styles.crumbs}>
            <Breadcrumbs items={[{ name: "Partners" }]} />
          </div>
          <SectionHeading text='Current Partners' dot />
          <h2 className={`${styles.h2} h3`}>
            Guest transfer pages already live
          </h2>
          <ul className={styles.partnerGrid}>
            {partners.map((p) => (
              <li key={p.href} className={styles.partnerCard}>
                <Link
                  href={p.href}
                  className={styles.partnerMedia}
                  tabIndex={-1}
                  aria-hidden='true'
                >
                  <Image
                    src={p.image}
                    alt=''
                    fill
                    placeholder='blur'
                    sizes='(max-width: 768px) 100vw, 50vw'
                    className={styles.partnerImg}
                  />
                  <span className={styles.partnerTag}>{p.location}</span>
                </Link>
                <div className={styles.partnerBody}>
                  <p className={styles.kind}>
                    {p.kind} · {p.location}
                  </p>
                  <h3 className={styles.partnerName}>
                    <Link href={p.href} className={styles.partnerLink}>
                      {p.name}
                    </Link>
                  </h3>
                  <p className={styles.copy}>{p.blurb}</p>
                  <Button
                    href={p.href}
                    text={`See the ${p.name} page`}
                    btnType='underlinedBlack'
                    arrow
                  />
                </div>
              </li>
            ))}
          </ul>
        </LayoutWrapper>
      </section>

      <section className={`${styles.section} ${styles.cream}`}>
        <LayoutWrapper>
          <SectionHeading text='Who We Work With' dot />
          <h2 className={`${styles.h2} h3`}>
            Built for businesses whose guests need a ride
          </h2>
          <div className={styles.grid4}>
            {whoWeWorkWith.map((w) => (
              <div key={w.title} className={styles.cell}>
                <h3 className={styles.cellTitle}>{w.title}</h3>
                <p className={styles.copy}>{w.copy}</p>
              </div>
            ))}
          </div>
        </LayoutWrapper>
      </section>

      <HowItWorks
        heading='Three steps to a guest page'
        headingTag='h2'
        cta={{ text: "Become a partner", href: "/contact" }}
        steps={steps}
      />

      <section className={styles.section}>
        <LayoutWrapper>
          <div className={styles.linkBlock}>
            <div>
              <SectionHeading text='For Your Website' dot />
              <h2 className={`${styles.h2} h3`}>
                Recommend us on your &quot;Getting here&quot; page
              </h2>
              <p className={styles.copy}>
                Already sending guests our way? Copy this into your website
                where you list airport transportation. It gives guests our
                number and a link they can book from.
              </p>
            </div>
            <pre className={styles.snippet}>
              <code>{SNIPPET}</code>
            </pre>
          </div>
        </LayoutWrapper>
      </section>

      <Faq items={faqs} />
    </main>
  );
}
