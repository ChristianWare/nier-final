import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import HomeBookingWidget from "@/components/HomePage/HomeBookingWidget/HomeBookingWidget";
import type { BookingWidgetData } from "@/lib/booking/widgetData";
import { reviews } from "@/lib/data";
import ChauffeurImg from "../../../../public/images/other/phxLandscape.jpg";
import styles from "./QuoteBand.module.css";

/** The review quoted on the photo, by id from `reviews` in lib/data.ts,
 *  and which of its sentences to show (0 = first). Quoted word for word. */
const FEATURED_REVIEW_ID = 9;
const FEATURED_SENTENCE = 1;
/** Reviewers shown in the avatar row, by id. */
const AVATAR_REVIEW_IDS = [8, 9, 145];

const featured = reviews.find((r) => r.id === FEATURED_REVIEW_ID);
const avatars = AVATAR_REVIEW_IDS.map((id) =>
  reviews.find((r) => r.id === id),
).filter((r): r is NonNullable<typeof r> => !!r);

function sentence(text: string, index: number): string {
  const parts = text.trim().split(/(?<=[.!?])\s+/);
  return parts[index] ?? parts[0] ?? text;
}

const DEFAULT_HEADING =
  "Your flat rate, quoted before you book. No surge, no surprises.";
const DEFAULT_COPY =
  "Executives, families and frequent flyers across the Valley have booked with us since 2004. Free flight tracking on every airport ride.";

/**
 * Photo card with a rider quote on the left, booking widget on the right.
 * The homepage uses the defaults; other pages (e.g. airport guides) pass
 * their own heading, copy and tracking source.
 */
export default function QuoteBand({
  widget,
  heading = DEFAULT_HEADING,
  copy = DEFAULT_COPY,
  source = "home:quote-band",
  headingId = "quote-heading",
}: {
  widget: BookingWidgetData;
  heading?: string;
  /** Sentence(s) under the avatars; the phone line is added after it. */
  copy?: string;
  /** Where the booking came from, passed to the widget. */
  source?: string;
  /** Unique id for the heading when the band appears more than once. */
  headingId?: string;
}) {
  return (
    <section className={styles.container} aria-labelledby={headingId}>
      <LayoutWrapper>
        <div className={styles.content}>
          <figure className={styles.photoCard}>
            <Image
              src={ChauffeurImg}
              alt='Nier Transportation chauffeur opening the car door for a client'
              fill
              placeholder='blur'
              sizes='(max-width: 1068px) 100vw, 45vw'
              className={styles.photo}
            />
            <div className={styles.overlay} aria-hidden='true' />
            <div className={styles.photoCardTop}>
              <h2 id={headingId} className={`${styles.heading} h3`}>
                {heading}
              </h2>
              <div className={styles.trust}>
                {avatars.length > 0 && (
                  <ul className={styles.avatars} aria-label='Nier riders'>
                    {avatars.map((r) => (
                      <li key={r.id} className={styles.avatar}>
                        <Image
                          src={r.person}
                          alt={r.reviewer}
                          fill
                          sizes='48px'
                          className={styles.avatarImg}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <p className={styles.copy}>
                  {copy} Prefer to talk?{" "}
                  <a href='tel:+14803006003' className={styles.phone}>
                    (480) 300-6003
                  </a>
                  24/7.
                </p>
              </div>
            </div>
            {featured && (
              <div className={styles.quoteWrap}>
                <blockquote className={styles.quote}>
                  &ldquo;{sentence(featured.review, FEATURED_SENTENCE)}&rdquo;
                </blockquote>
                <figcaption className={styles.author}>
                  <span className={styles.rule} aria-hidden='true' />
                  {featured.reviewer}, {featured.company}
                </figcaption>
              </div>
            )}
          </figure>

          {/* ── Right: pitch on top, booking widget below ── */}
          <div className={styles.right}>
            <div className={styles.top}>
              <SectionHeading text='Instant Quote' dot />
            </div>

            <div className={styles.widget}>
              <HomeBookingWidget
                serviceTypes={widget.serviceTypes}
                vehicles={widget.vehicles}
                companyTimezone={widget.companyTimezone}
                companyTimezoneLabel={widget.companyTimezoneLabel}
                source={source}
                fluid
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
