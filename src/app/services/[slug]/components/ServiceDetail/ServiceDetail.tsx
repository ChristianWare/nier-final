// /services/[slug]: one service in full, laid out like silver-state's
// service pages in Nier's style.
//
// Hero: breadcrumbs, the h1 and the short copy with the buttons, then a
// wide photo. Details: a sticky black card (the service's highlights and
// booking) beside the rows: overview, who it's for, coverage, what's
// included and the rest, with "What to expect" as numbered step cards.
// Then the other services, the questions, how it works, reviews and the
// numbers, as before.
//
// All the words come from lib/services.ts, as before; the headings keep
// their text and levels. The Service and FAQ schema are on the page
// (page.tsx), the breadcrumb schema in Breadcrumbs.

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import Faq from "@/components/shared/Faq/Faq";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import { SITE } from "@/config/site";
import type { ServiceShape } from "@/lib/services";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import styles from "./ServiceDetail.module.css";

/** "Booking Confirmation: You'll receive…" → a title and the rest. */
function splitStep(text: string) {
  const i = text.indexOf(": ");
  if (i > 0 && i < 48) {
    return { title: text.slice(0, i), body: text.slice(i + 2) };
  }
  return { title: null, body: text };
}

export default async function ServiceDetail({
  service,
}: {
  service: ServiceShape;
}) {
  const s = await getCompanySettings();
  const phoneTel = s.dispatchPhoneRaw
    ? `+1${s.dispatchPhoneRaw}`
    : SITE.phone.tel;

  const bookHref = `/book?service=${encodeURIComponent(service.slug)}`;

  // The lists, in the order the page has always shown them.
  const rows: { title: string; items?: ReadonlyArray<string> }[] = [
    { title: "Who this is for", items: service.whoThisIsFor },
    {
      title: service.coverageTitle || "Coverage & Service Area",
      items: service.coverageAndAirports,
    },
    { title: "What's included", items: service.whatsIncluded },
    { title: "Vehicle classes", items: service.vehicleClasses },
    { title: "Pickup options", items: service.pickupOptions },
    { title: "Booking & Payment", items: service.bookingAndPayment },
    { title: "Policies", items: service.policies },
    {
      title: "Families, Accessibility & Special Requests",
      items: service.familiesAccessibilitySpecial,
    },
    { title: "Safety & Standards", items: service.safetyAndStandards },
    {
      title: "Communication & Tracking",
      items: service.communicationAndTracking,
    },
  ];
  const expect = service.whatToExpect ?? [];
  const forManagers = service.forTravelManagers ?? [];

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.crumbs}>
          <Breadcrumbs
            items={[
              { name: "Services", href: "/services" },
              { name: service.title },
            ]}
          />
        </div>
        <LayoutWrapper>
          <div className={styles.heroTop}>
            <div className={styles.head}>
              <SectionHeading text='Service' dot />
              <h1 className={styles.heading}>{service.h1 ?? service.title}</h1>
            </div>
            <div className={styles.side}>
              {service.copy ? (
                <p className={styles.intro}>{service.copy}</p>
              ) : null}
              <div className={styles.actions}>
                <Button
                  href={bookHref}
                  text='Book your ride'
                  btnType='black'
                  arrow
                />
                <Link href='/services' className={styles.textLink}>
                  All services
                </Link>
              </div>
            </div>
          </div>

          {service.src ? (
            <figure className={styles.heroFigure}>
              <div className={styles.heroImage}>
                <Image
                  src={service.src}
                  alt={service.title}
                  title={service.title}
                  fill
                  priority
                  sizes='(max-width: 1344px) 100vw, 1344px'
                  className={styles.image}
                />
                <span className={styles.heroTag}>
                  <span className={styles.heroDot} aria-hidden='true' />
                  Nier Transportation · {service.title}
                </span>
              </div>
            </figure>
          ) : null}
        </LayoutWrapper>
      </section>

      {/* ── Details ── */}
      <section
        className={styles.details}
        aria-label={`${service.title} details`}
      >
        <LayoutWrapper>
          <div className={styles.layout}>
            {/* Sticky black card */}
            <aside className={styles.aside}>
              <div className={styles.summary}>
                <p className={styles.summaryTitle}>Service details</p>

                {service.features && service.features.length > 0 ? (
                  <ul className={styles.features}>
                    {service.features.slice(0, 3).map((f, i) => (
                      <li
                        key={`${service.slug}-${String(f.id)}-${i}`}
                        className={styles.feature}
                      >
                        <span className={styles.featureTitle}>{f.title}</span>
                        <span className={styles.featureDetails}>
                          {f.details}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={styles.summaryFoot}>
                  <Button
                    href={bookHref}
                    text='Book your ride'
                    btnType='red'
                    arrow
                  />
                  <span className={styles.or}>or</span>
                  <Button
                    href={`tel:${phoneTel}`}
                    text='Call us'
                    btnType='underlinedWhite'
                    arrow
                  />
                </div>
              </div>
            </aside>

            {/* Content rows */}
            <div className={styles.content}>
              <div className={styles.row}>
                <h2 className={`${styles.rowTitle} h4`}>Overview</h2>
                <div className={styles.rowBody}>
                  {service.description ? (
                    <p className={styles.text}>{service.description}</p>
                  ) : null}
                </div>
              </div>

              {rows.map((r) =>
                r.items && r.items.length > 0 ? (
                  <div key={r.title} className={styles.row}>
                    <h3 className={`${styles.rowTitle} h4`}>{r.title}</h3>
                    <ul className={`${styles.rowBody} ${styles.included}`}>
                      {r.items.map((item) => (
                        <li key={item} className={styles.includedItem}>
                          <Check />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}

              {expect.length > 0 ? (
                <div className={`${styles.row} ${styles.rowWide}`}>
                  <h3 className={`${styles.rowTitle} h4`}>What to expect</h3>
                  <ol className={styles.steps}>
                    {expect.map((item, i) => {
                      const st = splitStep(item);
                      return (
                        <li key={item} className={styles.step}>
                          <div className={styles.stepTop}>
                            <span
                              className={styles.stepBar}
                              aria-hidden='true'
                            />
                            <span className={styles.stepTitle}>
                              {st.title ?? `Step ${i + 1}`}
                            </span>
                            <span className={styles.stepNum}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <p className={styles.stepBody}>{st.body}</p>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}

              {forManagers.length > 0 ? (
                <div className={styles.row}>
                  <h3 className={`${styles.rowTitle} h4`}>
                    For travel managers
                  </h3>
                  <ul className={`${styles.rowBody} ${styles.included}`}>
                    {forManagers.map((item) => (
                      <li key={item} className={styles.includedItem}>
                        <Check />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </LayoutWrapper>
      </section>

      <ServicesPreview />
      <Faq
        items={(service.faqs ?? []).map((f, i) => ({
          id: i,
          question: f.q,
          answer: f.a,
        }))}
      />
      <HowItWorks />
      <AboutTestimonials />
      <AboutNumbers />
    </>
  );
}

function Check() {
  return (
    <svg
      className={styles.check}
      viewBox='0 0 24 24'
      width='16'
      height='16'
      aria-hidden='true'
    >
      <path
        d='M5 12.5l4.5 4.5L19 7.5'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
