// /fleet/[slug]: one vehicle in full, laid out like silver-state's vehicle
// pages in Nier's style.
//
// Intro: the vehicle on a cream panel with the capacity track (every
// vehicle by passengers, this one in red), beside its name, intro, three
// stat boxes, what it's best for and the buttons. Details: the rows
// (vehicle details, amenities, safety, specs, highlights, rates and
// booking rules, policies) beside a sticky black card with the vehicle and
// its starting price. Then the rest of the fleet, and the questions.
//
// All the words come from lib/data.ts (fleetData), as before; the headings
// keep their text. Prices come from Admin → Vehicle Categories
// (publicRates.ts); booking rules and policies from lib/booking/rules.ts,
// so the page always matches the booking tool.

/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Faq from "@/components/shared/Faq/Faq";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import { SITE } from "@/config/site";
import { fleetData } from "@/lib/data";
import type { VehicleData } from "@/lib/types/fleet";
import type { FleetRates } from "@/lib/booking/publicRates";
import {
  AIRPORT_FREE_WAIT_MINUTES,
  CANCELLATION_POLICY,
  CANCELLATION_POLICY_DETAIL,
  EXTRA_STOP_FEE_LABEL,
  HOURLY_MIN_HOURS,
  usdShort,
} from "@/lib/booking/rules";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import ImgFallback from "../../../../../../public/images/other/vip.jpg";
import styles from "./FleetDetail.module.css";

/** "10–18 seater" → "10–18"; "3 seater" → "3". */
const seatsLabel = (v: VehicleData) => v.seats.replace(/\s*seater\s*$/i, "");
/** The smallest number in the seats, for ordering the track. */
const seatsMin = (v: VehicleData) => parseInt(v.seats, 10) || 0;

/** Short names for the capacity track. */
const SHORT: Record<string, string> = {
  "mercedes-e-class-sedan": "Sedan",
  "chevy-suburban": "SUV",
  "cadillac-escalade-esv": "Luxury SUV",
  "mercedes-sprinter-executive-14": "Sprinter",
  "stretch-limousine": "Limo",
  "mini-party-bus-20-40": "Mini Bus",
  motorcoach: "Coach",
};
const shortName = (v: VehicleData) => SHORT[v.slug] ?? v.class;

const STOPS = [...fleetData].sort((a, b) => seatsMin(a) - seatsMin(b));

const imageOf = (v: VehicleData) =>
  (v.images?.[0]?.src as any) || (v.src as any) || ImgFallback;

export default async function FleetDetail({
  vehicle: v,
  rates,
}: {
  vehicle: VehicleData;
  /** From Admin → Vehicle Categories; null until a category is linked. */
  rates: FleetRates | null;
}) {
  const s = await getCompanySettings();
  const phone = s.dispatchPhone || SITE.phone.display;
  const phoneTel = s.dispatchPhoneRaw
    ? `+1${s.dispatchPhoneRaw}`
    : SITE.phone.tel;

  const heroImg = imageOf(v);
  const heroAlt = v.images?.[0]?.alt ?? v.title;
  const lead = v.shortDesc ?? v.desc ?? v.longDesc ?? "";
  const seats = seatsLabel(v);
  const passengers = /[–-]/.test(seats) ? seats : `Up to ${seats}`;

  // The big number in the black card.
  const price = rates?.callForPricing
    ? {
        value: "Call",
        label: rates.callForPricingMessage || "For a custom quote",
      }
    : rates?.hourlyRateCents
      ? {
          value: usdShort(rates.hourlyRateCents),
          label: `Per hour, ${rates.hourlyMinHours}-hour minimum`,
        }
      : rates?.oneWayFromCents
        ? { value: usdShort(rates.oneWayFromCents), label: "From, one way" }
        : { value: seats, label: "Passengers" };

  const rateLines = [
    ...(rates?.callForPricing
      ? [rates.callForPricingMessage || "Call for a custom quote"]
      : [
          rates?.hourlyRateCents
            ? `By the hour from ${usdShort(rates.hourlyRateCents)}/hr, ${rates.hourlyMinHours}-hour minimum${
                rates.hourlyMinimumCents
                  ? ` (from ${usdShort(rates.hourlyMinimumCents)} total)`
                  : ""
              }`
            : `Hourly bookings: ${HOURLY_MIN_HOURS}-hour minimum`,
          ...(rates?.oneWayFromCents
            ? [`One-way rides from ${usdShort(rates.oneWayFromCents)}`]
            : []),
          ...(rates?.airportFromCents
            ? [`Airport transfers from ${usdShort(rates.airportFromCents)}`]
            : []),
        ]),
    `Airport pickups: up to ${AIRPORT_FREE_WAIT_MINUTES} minutes of free wait time after your flight lands`,
    "Meet & greet inside baggage claim: free",
    `Extra stops: ${EXTRA_STOP_FEE_LABEL}`,
    "No surge pricing. Your exact price shows in the booking tool before you book.",
  ];

  const specs = [
    v.specs?.drivetrain && { label: "Drivetrain", value: v.specs.drivetrain },
    v.specs?.rideFeel && { label: "Ride feel", value: v.specs.rideFeel },
    v.specs?.cabin && { label: "Cabin", value: v.specs.cabin },
    v.cargoCuFt && { label: "Cargo capacity", value: v.cargoCuFt },
    v.luggage && { label: "Luggage", value: v.luggage },
  ].filter(Boolean) as { label: string; value: string }[];

  const lists: { title: string; items: ReadonlyArray<string> }[] = [
    { title: "Amenities", items: v.amenities ?? [] },
    { title: "Safety & Driver Tech", items: v.safetyTech ?? [] },
  ];

  const others = fleetData.filter((o) => o.slug !== v.slug);

  return (
    <>
      {/* ── Intro ── */}
      <section className={styles.intro}>
        <div className={styles.crumbs}>
          <Breadcrumbs
            items={[{ name: "Fleet", href: "/fleet" }, { name: v.title }]}
          />
        </div>
        <LayoutWrapper>
          <div className={styles.introGrid}>
            <div className={styles.media}>
              <Image
                src={heroImg}
                alt={heroAlt}
                title={heroAlt}
                fill
                priority
                sizes='(max-width: 1068px) 100vw, 55vw'
                className={styles.cutout}
              />
              <div className={styles.track} aria-hidden='true'>
                <span className={styles.line} />
                {STOPS.map((o) => (
                  <span
                    key={o.slug}
                    className={`${styles.stop} ${o.slug === v.slug ? styles.stopActive : ""}`}
                  >
                    <span className={styles.stopTag}>
                      {seatsLabel(o)}
                      <span className={styles.stopName}> · {shortName(o)}</span>
                    </span>
                    <span className={styles.stopDot} />
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.side}>
              <SectionHeading text={v.class} dot />
              <h1 className={styles.heading}>{v.title}</h1>
              <p className={styles.copy}>{lead}</p>

              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dt className={styles.statLabel}>Passengers</dt>
                  <dd className={styles.statValue}>{passengers}</dd>
                </div>
                <div className={styles.stat}>
                  <dt className={styles.statLabel}>Class</dt>
                  <dd className={`${styles.statValue} ${styles.statText}`}>
                    {v.class}
                  </dd>
                </div>
                {v.cargo ? (
                  <div className={styles.stat}>
                    <dt className={styles.statLabel}>Cargo</dt>
                    <dd className={`${styles.statValue} ${styles.statText}`}>
                      {v.cargo}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className={styles.best}>
                <span className={styles.label}>Best for</span>
                <ul className={styles.bestList}>
                  {(v.bestFor && v.bestFor.length > 0
                    ? v.bestFor
                    : ["General travel"]
                  ).map((b) => (
                    <li key={b} className={styles.bestItem}>
                      <span className={styles.dot} aria-hidden='true' />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.actions}>
                <Button
                  href='/book'
                  text='Book your ride'
                  btnType='black'
                  arrow
                />
                <a href={`tel:${phoneTel}`} className={styles.textLink}>
                  Call {phone}
                </a>
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* ── Details ── */}
      <section className={styles.details} aria-label={`${v.title} details`}>
        <LayoutWrapper>
          <div className={styles.layout}>
            <div className={styles.content}>
              {v.longDesc ? (
                <div className={styles.row}>
                  <h2 className={`${styles.rowTitle} h4`}>Vehicle Details</h2>
                  <div className={styles.rowBody}>
                    <p className={styles.text}>{v.longDesc}</p>
                  </div>
                </div>
              ) : null}

              {lists.map((l) =>
                l.items.length > 0 ? (
                  <div key={l.title} className={styles.row}>
                    <h3 className={`${styles.rowTitle} h4`}>{l.title}</h3>
                    <ul className={`${styles.rowBody} ${styles.checks}`}>
                      {l.items.map((item) => (
                        <li key={item} className={styles.checkItem}>
                          <Check />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}

              <div className={styles.row}>
                <h3 className={`${styles.rowTitle} h4`}>Specs</h3>
                <dl className={`${styles.rowBody} ${styles.specs}`}>
                  {specs.map((sp) => (
                    <div key={sp.label} className={styles.spec}>
                      <dt className={styles.label}>{sp.label}</dt>
                      <dd className={styles.specValue}>{sp.value}</dd>
                    </div>
                  ))}
                  <div className={styles.spec}>
                    <dt className={styles.label}>Capacity</dt>
                    <dd className={styles.specValue}>{v.seats}</dd>
                  </div>
                </dl>
              </div>

              {v.features?.length ? (
                <div className={styles.row}>
                  <h3 className={`${styles.rowTitle} h4`}>Highlights</h3>
                  <ul className={`${styles.rowBody} ${styles.checks}`}>
                    {v.features.map((f) => (
                      <li key={f} className={styles.checkItem}>
                        <Check />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={styles.row}>
                <h3 className={`${styles.rowTitle} h4`}>
                  Rates & Booking Rules
                </h3>
                <ul className={`${styles.rowBody} ${styles.checks}`}>
                  {rateLines.map((r) => (
                    <li key={r} className={styles.checkItem}>
                      <Check />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.row}>
                <h3 className={`${styles.rowTitle} h4`}>Policies</h3>
                <div className={styles.rowBody}>
                  <p className={styles.text}>{CANCELLATION_POLICY}</p>
                  <ul className={styles.checks}>
                    {[CANCELLATION_POLICY_DETAIL, ...(v.policyNotes ?? [])].map(
                      (p) => (
                        <li key={p} className={styles.checkItem}>
                          <Check />
                          {p}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sticky black card */}
            <aside className={styles.aside}>
              <div className={styles.summary}>
                <div className={styles.summaryPhoto}>
                  <Image
                    src={heroImg}
                    alt=''
                    fill
                    sizes='400px'
                    className={styles.cutout}
                  />
                </div>
                <div className={styles.summaryStat}>
                  <p className={styles.summaryValue}>{price.value}</p>
                  <span className={styles.summaryLabel}>{price.label}</span>
                </div>
                {v.amenities?.length ? (
                  <ul className={styles.chips}>
                    {v.amenities.slice(0, 4).map((f) => (
                      <li key={f} className={styles.chip}>
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className={styles.summaryFoot}>
                  <Button
                    href='/book'
                    text='Book this vehicle'
                    btnType='red'
                    arrow
                  />
                  <p className={styles.summaryCall}>
                    Or call <a href={`tel:${phoneTel}`}>{phone}</a>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </LayoutWrapper>
      </section>

      {/* ── Other vehicles ── */}
      <section className={styles.others} aria-labelledby='other-vehicles'>
        <LayoutWrapper>
          <h2 id='other-vehicles' className={`${styles.othersTitle} h4`}>
            The rest of the fleet
          </h2>
          <ul className={styles.otherList}>
            {others.map((o) => (
              <li key={o.slug} className={styles.other}>
                <span className={styles.otherImg}>
                  <Image
                    src={imageOf(o)}
                    alt=''
                    fill
                    sizes='(max-width: 568px) 50vw, 25vw'
                    className={styles.cutout}
                  />
                </span>
                <Link href={`/fleet/${o.slug}`} className={styles.otherName}>
                  {o.title}
                </Link>
                <span className={styles.otherMeta}>
                  {o.seats} · {o.class}
                </span>
              </li>
            ))}
          </ul>
        </LayoutWrapper>
      </section>

      <Faq
        items={(v.faqs ?? []).map((f, i) => ({
          id: `${v.slug}-faq-${i}`,
          question: f.q,
          answer: f.a,
        }))}
      />
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
