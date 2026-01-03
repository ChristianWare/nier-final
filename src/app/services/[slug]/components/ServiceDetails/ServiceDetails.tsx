/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./ServiceDetails.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";
// import Image from "next/image";
import Button from "@/components/shared/Button/Button";
import Faq from "@/components/shared/Faq/Faq";
// import AddOns from "../AddOns/AddOns";

import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import ServiceSlugPageIntro from "../ServiceSlugPageIntro/ServiceSlugPageIntro";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Logo from "@/components/shared/Logo/Logo";
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";

type AddOnItem = { id: number | string; title: string; description?: string };

type Service = {
  id: number;
  title: string;
  slug: string;
  copy?: string;
  marketingCopy?: string;
  src?: any;
  src2?: any;
  description?: string;
  whoThisIsFor?: ReadonlyArray<string>;
  coverageTitle?: string;
  coverageAndAirports?: ReadonlyArray<string>;
  whatsIncluded?: ReadonlyArray<string>;
  vehicleClasses?: ReadonlyArray<string>;
  pickupOptions?: ReadonlyArray<string>;
  bookingAndPayment?: ReadonlyArray<string>;
  policies?: ReadonlyArray<string>;
  familiesAccessibilitySpecial?: ReadonlyArray<string>;
  safetyAndStandards?: ReadonlyArray<string>;
  communicationAndTracking?: ReadonlyArray<string>;
  whatToExpect?: ReadonlyArray<string>;
  faqs?: ReadonlyArray<{ q: string; a: string }>;
  // ⬇️ Was ReadonlyArray<string>; change to object list:
  addOns?: ReadonlyArray<AddOnItem> | ReadonlyArray<string>;
  forTravelManagers?: ReadonlyArray<string>;
  features?: ReadonlyArray<{
    id: number | string;
    title: string;
    details: string;
  }>;
};

function SectionList({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items?: ReadonlyArray<string>;
  ordered?: boolean;
}) {
  if (!items || items.length === 0) return null;
  const ListTag = ordered ? "ol" : "ul";
  return (
    <section className={styles.section}>
      <h3 className={`${styles.subHeading}`}>{title}</h3>
      <ListTag className={styles.list}>
        {items.map((item, i) => (
          <li key={i} className={styles.listItem}>
            <span className={styles.dot} /> {item}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function toAddOnItems(
  addOns?: ReadonlyArray<AddOnItem> | ReadonlyArray<string>
): AddOnItem[] {
  if (!addOns) return [];
  if (typeof addOns[0] === "string") {
    return (addOns as ReadonlyArray<string>).map((text, i) => ({
      id: i + 1,
      title: text,
    }));
  }
  return Array.from(addOns as ReadonlyArray<AddOnItem>);
}

export default function ServiceDetails({ service }: { service: Service }) {
  if (!service) {
    return (
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.content}>
            <h1 className={styles.heading}>Service not found</h1>
            <Link href='/services'>Back to services</Link>
          </div>
        </LayoutWrapper>
      </section>
    );
  }

  const normalizedService = {
    ...service,
    addOns: service.addOns
      ? toAddOnItems(service.addOns).map((item) => ({
          ...item,
          description: item.description || "",
        }))
      : undefined,
  };

  const bookHref = `/book?service=${encodeURIComponent(service.slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description:
      service.description || service.marketingCopy || service.copy || "",
    areaServed: "Phoenix Metro, Arizona",
    provider: { "@type": "LocalBusiness", name: "Nier Transportation" },
    category: "Ground Transportation",
  };

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <ServiceSlugPageIntro service={normalizedService} />
            <div className={styles.serviceoverview}>
              <h2 className={styles.heading}>Overview</h2>
              {service.description && (
                <p className={styles.desc}>{service.description}</p>
              )}
            </div>
            <div className={styles.details}>
              <SectionList
                title='Who this is for'
                items={service.whoThisIsFor}
              />
              <SectionList
                title={service.coverageTitle || "Coverage & Service Area"}
                items={service.coverageAndAirports}
              />
              {/* {service.src2 && (
                <div className={styles.imgContainer}>
                  <Image
                    src={service.src2}
                    fill
                    alt={service.title || "Service image"}
                    className={styles.img}
                  />
                </div>
              )} */}
              <SectionList
                title='What’s included'
                items={service.whatsIncluded}
              />
              <SectionList
                title='Vehicle classes'
                items={service.vehicleClasses}
              />
              <SectionList
                title='Pickup options'
                items={service.pickupOptions}
              />
              <SectionList
                title='Booking & Payment'
                items={service.bookingAndPayment}
              />
              <SectionList title='Policies' items={service.policies} />
              <SectionList
                title='Families, Accessibility & Special Requests'
                items={service.familiesAccessibilitySpecial}
              />
              <SectionList
                title='Safety & Standards'
                items={service.safetyAndStandards}
              />
              <SectionList
                title='Communication & Tracking'
                items={service.communicationAndTracking}
              />
              <SectionList
                title='What to expect'
                items={service.whatToExpect}
                ordered
              />
              <SectionList
                title='For travel managers'
                items={service.forTravelManagers}
              />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.rightContent}>
              <div className='h4'>Service details</div>
              <p className={styles.copy}>{service.copy}</p>

              <div className={styles.mapDataContainer}>
                {service.features && service.features.length > 0 && (
                  <div className={styles.featureContainer}>
                    {service.features.slice(0, 3).map((x, index) => (
                      <div
                        className={styles.card}
                        key={`${service.slug}-${String(x.id)}-${index}`}
                      >
                        <div className={styles.featureTitle}>
                          <Logo className={styles.logo} /> {x.title}:
                        </div>
                        <p className={styles.featureDetails}>{x.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.btnContainer}>
                <Button
                  href={bookHref}
                  text='Book your ride'
                  btnType='black'
                  arrow
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
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
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
