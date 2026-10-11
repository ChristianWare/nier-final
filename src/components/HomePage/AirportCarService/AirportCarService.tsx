import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { serviceAreaCities } from "@/lib/cities";
import styles from "./AirportCarService.module.css";

/** Starting flat rate for a Sky Harbor transfer, cheapest vehicle. */
export const SKY_HARBOR_FROM_USD = 55;

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

const rows = AREAS.map((a) => ({
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
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Airport Transfers' dot />
            <h2 id='airport-heading' className={styles.heading}>
              Phoenix Airport Car Service: Sky Harbor, Scottsdale &amp; Mesa
              Gateway
            </h2>
            <p className={styles.copy}>
              Sky Harbor is the trip we drive most. We track every flight, stage
              your chauffeur to the actual landing time, and meet you at baggage
              claim with a sign or at the curb, your choice. Early or delayed,
              the price doesn&apos;t change.
            </p>
            <p className={styles.price}>
              Flat-rate Sky Harbor transfers from{" "}
              <strong>${SKY_HARBOR_FROM_USD}</strong>
            </p>
            <ul className={styles.links}>
              {airportLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={styles.link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className={styles.btnContainer}>
              <Button
                href='/book'
                text='Book an airport ride'
                btnType='black'
                arrow
              />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Drive time to Sky Harbor (PHX)</p>
              <ul className={styles.rows}>
                {rows.map((r) => (
                  <li key={r.slug} className={styles.row}>
                    <span className={styles.area}>
                      {r.href ? (
                        <Link href={r.href} className={styles.areaLink}>
                          {r.label}
                        </Link>
                      ) : (
                        r.label
                      )}
                    </span>
                    <span className={styles.minutes}>{r.minutes} min</span>
                  </li>
                ))}
              </ul>
              <p className={styles.cardNote}>
                Typical times outside rush hour. Your fare is fixed when you
                book, whatever the traffic.
              </p>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
