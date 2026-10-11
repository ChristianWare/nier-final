import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { serviceAreaCities, type CityData } from "@/lib/cities";
import styles from "./Neighborhoods.module.css";

/**
 * Phoenix and Scottsdale neighborhoods, read from the city data so the
 * homepage and the city pages always say the same thing. The Phoenix ones
 * moved here when /locations/phoenix was folded into the homepage.
 */
const PICKS: { city: string; name: string; img?: string }[] = [
  { city: "phoenix", name: "Downtown & Roosevelt Row" },
  { city: "phoenix", name: "Biltmore & Camelback Corridor" },
  { city: "phoenix", name: "Arcadia" },
  { city: "phoenix", name: "Desert Ridge & North Phoenix" },
  // The Old Town sculpture photo reads better here than the city page's default.
  {
    city: "scottsdale",
    name: "Old Town Scottsdale",
    img: "/images/areas/scottsdaleii.jpg",
  },
  { city: "scottsdale", name: "Kierland & Scottsdale Quarter" },
];

const cities = serviceAreaCities as readonly CityData[];

const cards = PICKS.map((p) => {
  const city = cities.find((c) => c.slug === p.city);
  const hood = city?.neighborhoods?.find((n) => n.name === p.name);
  return hood
    ? {
        ...hood,
        img: p.img ?? hood.img,
        cityName: city!.name,
        // Phoenix's own page is now the homepage, so only Scottsdale links out.
        href: p.city === "phoenix" ? null : `/locations/${p.city}`,
      }
    : null;
}).filter((c): c is NonNullable<typeof c> => !!c);

export default function Neighborhoods() {
  return (
    <section className={styles.container} aria-labelledby='hoods-heading'>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Where We Drive' dot />
          <h2 id='hoods-heading' className={styles.heading}>
            Black Car Service Across Phoenix &amp; Scottsdale
          </h2>
          <p className={styles.copy}>
            Phoenix is our home market and Scottsdale is our home office, so
            these are the streets our chauffeurs know best. We also cover{" "}
            <Link href='/locations/paradise-valley' className={styles.link}>
              Paradise Valley
            </Link>
            ,{" "}
            <Link href='/locations/tempe' className={styles.link}>
              Tempe
            </Link>{" "}
            and{" "}
            <Link href='/locations' className={styles.link}>
              40 cities across Arizona
            </Link>
            .
          </p>
        </div>
        <ul className={styles.grid}>
          {cards.map((c) => (
            <li key={c.name} className={styles.card}>
              {c.img && (
                <div className={styles.imgContainer}>
                  <Image
                    src={c.img}
                    alt={`${c.name}, ${c.cityName}`}
                    fill
                    sizes='(max-width: 768px) 100vw, (max-width: 1068px) 50vw, 33vw'
                    className={styles.img}
                  />
                </div>
              )}
              <p className={styles.city}>{c.cityName}</p>
              <h3 className={styles.name}>
                {c.href ? (
                  <Link href={c.href} className={styles.nameLink}>
                    {c.name}
                  </Link>
                ) : (
                  c.name
                )}
              </h3>
              <p className={styles.desc}>{c.copy}</p>
            </li>
          ))}
        </ul>
      </LayoutWrapper>
    </section>
  );
}
