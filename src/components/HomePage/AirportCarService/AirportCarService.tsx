import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Plane from "@/components/shared/icons/Plane/Plane";
import Clock from "@/components/shared/icons/Clock/Clock";
import Money from "@/components/shared/icons/Money/Money";
import { serviceAreaCities } from "@/lib/cities";
import AirportVideo from "./AirportVideo";
import PosterImg from "../../../../public/images/other/airport4.jpg";
import styles from "./AirportCarService.module.css";

/** Starting flat rate for a Sky Harbor transfer, cheapest vehicle. */
export const SKY_HARBOR_FROM_USD = 55;

/** Video file in /public/videos. Phones get the poster photo instead. */
const VIDEO_SRC = "/videos/skyTram.mp4";

const features = [
  {
    icon: Plane,
    title: "Flight tracking",
    copy: "We follow your flight and adjust the pickup for early or late landings, at no charge.",
  },
  {
    icon: Clock,
    title: "60-minute grace period",
    copy: "Your chauffeur waits up to 60 minutes after landing, so slow bags cost you nothing.",
  },
  {
    icon: Money,
    title: `Flat rates from $${SKY_HARBOR_FROM_USD}`,
    copy: "Quoted when you book. No surge and no meter, whatever the traffic.",
  },
];

const stats = [
  {
    value: `$${SKY_HARBOR_FROM_USD}`,
    label: "Flat-rate Sky Harbor transfers from",
  },
  { value: "60", unit: "min", label: "Free wait after your flight lands" },
  { value: "24/7", label: "Pickups at any hour, every day" },
];

/** Areas shown in the drive-time list, nearest first. Times come from each
 *  city's `airportMinutes`, the same figure its location page shows. */
const AREAS: { slug: string; label: string; href?: string }[] = [
  { slug: "tempe", label: "Tempe", href: "/locations/tempe" },
  { slug: "phoenix", label: "Downtown Phoenix" },
  {
    slug: "paradise-valley",
    label: "Paradise Valley",
    href: "/locations/paradise-valley",
  },
  { slug: "scottsdale", label: "Scottsdale", href: "/locations/scottsdale" },
  { slug: "chandler", label: "Chandler", href: "/locations/chandler" },
  { slug: "mesa", label: "Mesa", href: "/locations/mesa" },
];

const driveTimes = AREAS.map((a) => ({
  ...a,
  minutes: serviceAreaCities.find((c) => c.slug === a.slug)?.airportMinutes,
})).filter((r) => r.minutes);

const airportLinks = [
  {
    href: "/airports/phx-sky-harbor",
    label: "Black car service to Sky Harbor",
  },
  {
    href: "/airports/scottsdale-airport",
    label: "Scottsdale Airport car service",
  },
  { href: "/airports/mesa-gateway", label: "Mesa Gateway car service" },
  { href: "/airports/private-aviation", label: "Private jet & FBO pickups" },
];

export default function AirportCarService() {
  return (
    <section className={styles.container} aria-labelledby='airport-heading'>
      {/* ── Strip: headline + three promises ── */}
      <div className={styles.strip}>
        <LayoutWrapper>
          <div className={styles.stripContent}>
            <div className={styles.stripIntro}>
              <SectionHeading text='Airport Transfers' dot />
              <p className={styles.stripHeading}>
                Every airport ride is flat-rate, flight-tracked and on time.
              </p>
            </div>
            <ul className={styles.features}>
              {features.map(({ icon: Icon, title, copy }) => (
                <li key={title} className={styles.feature}>
                  <Icon className={styles.featureIcon} aria-hidden='true' />
                  <p className={styles.featureTitle}>{title}</p>
                  <p className={styles.featureCopy}>{copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </LayoutWrapper>
      </div>

      {/* ── Panel: full-width video card with the copy on top of it ── */}
      <div className={styles.panel}>
        {/* <LayoutWrapper999> */}
        <div className={styles.media}>
          {/* Phones: the poster photo (no video download on mobile data) */}
          <div className={styles.mobileMedia}>
            <Image
              src={PosterImg}
              alt='Chauffeured black car waiting on the airport tarmac'
              fill
              placeholder='blur'
              sizes='100vw'
              className={styles.mobileImg}
            />
          </div>
          <div className={styles.desktopMedia}>
            <AirportVideo
              src={VIDEO_SRC}
              poster={PosterImg.src}
              label='Nier Transportation airport pickup'
            />
          </div>

          {/* Darkens the video so the white text stays readable */}
          <div className={styles.overlay} aria-hidden='true' />

          <div className={styles.copyCol}>
            <div className={styles.left}>
              <p className={styles.eyebrow}>
                Sky Harbor · Scottsdale · Mesa Gateway
              </p>
              <h2 id='airport-heading' className={styles.heading}>
                Phoenix Airport Car Service: Sky Harbor, Scottsdale &amp; Mesa
                Gateway
              </h2>
              <p className={styles.copy}>
                Sky Harbor is the trip we drive most. We track every flight,
                stage your chauffeur to the actual landing time, and meet you at
                baggage claim with a sign or at the curb, your choice. Early or
                delayed, the price doesn&apos;t change.
              </p>

              <dl className={styles.stats}>
                {stats.map((s) => (
                  <div key={s.label} className={styles.stat}>
                    <dt className={styles.statLabel}>{s.label}</dt>
                    <dd className={styles.statValue}>
                      {s.value}
                      {s.unit && (
                        <span className={styles.statUnit}>{s.unit}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className={styles.btnContainer}>
                <Button
                  href='/book'
                  text='Book an airport ride'
                  btnType='white'
                  arrow
                />
              </div>
            </div>
            <div className={styles.right}>
              <ul className={styles.links}>
                {airportLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={styles.link}>
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>

              <div className={styles.driveTimes}>
                <p className={styles.driveTitle}>
                  Drive time to Sky Harbor (PHX)
                </p>
                <ul className={styles.driveList}>
                  {driveTimes.map((r) => (
                    <li key={r.slug} className={styles.driveRow}>
                      {r.href ? (
                        <Link href={r.href} className={styles.driveArea}>
                          {r.label}
                        </Link>
                      ) : (
                        <span className={styles.driveArea}>{r.label}</span>
                      )}
                      <span className={styles.driveMinutes}>
                        {r.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.driveNote}>
                  Typical times outside rush hour. Your fare is fixed when you
                  book, whatever the traffic.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* </LayoutWrapper999> */}
      </div>
    </section>
  );
}
