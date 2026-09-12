import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityTestimonials.module.css";
import Image from "next/image";
import StarCluster from "@/components/shared/StarCluster/StarCluster";
import { reviews } from "@/lib/data";
import type { CityData } from "@/lib/cities";

export default function LocationCityTestimonials({ city }: { city: CityData }) {
  // Real reviews only — city matches float to the front
  const sorted = [...reviews].sort((a, b) => {
    const aMatch = a.company.includes(city.name) ? 1 : 0;
    const bMatch = b.company.includes(city.name) ? 1 : 0;
    return bMatch - aMatch;
  });

  const featured = sorted[0];
  const secondary = sorted.slice(1, 3);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <h2 className={styles.heading}>
          What riders in {city.name} and across <br className={styles.br} />
          the Valley say about Nier
        </h2>

        <div className={styles.barCard}>
          <div className={styles.barLeft}>
            <h3 className={styles.barHeading}>
              Two decades of rides, one standard of service
            </h3>
            <StarCluster />
          </div>
          <div className={styles.barStats}>
            <div className={styles.barStat}>
              <div className={styles.barStatValue}>24/7</div>
              <div className={styles.barStatLabel}>
                Every day of the year, including holidays
              </div>
            </div>
            <div className={styles.barStat}>
              <div className={styles.barStatValue}>40+</div>
              <div className={styles.barStatLabel}>
                Valley communities served, {city.name} included
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bento}>
          <div className={styles.bentoLeft}>
            {secondary.map((r, i) => (
              <div
                key={r.id}
                className={`${styles.quoteCard} ${i === 1 ? styles.quoteCardAccent : ""}`}
              >
                <span className={styles.quoteMark}>&ldquo;</span>
                <p className={styles.quoteText}>{r.review}</p>
                <div className={styles.quoteMeta}>
                  <span className={styles.quoteName}>{r.reviewer}</span>
                  <span className={styles.quoteCity}>{r.company}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.bentoRight}>
            <div className={`${styles.quoteCard} ${styles.quoteCardFeatured}`}>
              <span className={styles.quoteMark}>&ldquo;</span>
              <p className={styles.quoteText}>{featured.review}</p>
              <div className={styles.quoteMeta}>
                <span className={styles.quoteName}>{featured.reviewer}</span>
                <span className={styles.quoteCity}>{featured.company}</span>
              </div>
            </div>
            <div className={styles.imgContainer}>
              <Image
                src={city.src}
                alt={`Black car service riders in ${city.name}, AZ`}
                title={`Black car service riders in ${city.name}, AZ`}
                fill
                className={styles.img}
                placeholder='blur'
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
