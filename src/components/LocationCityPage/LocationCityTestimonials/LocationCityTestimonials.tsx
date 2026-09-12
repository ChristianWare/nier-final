import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityTestimonials.module.css";
import Image from "next/image";
import StarCluster from "@/components/shared/StarCluster/StarCluster";
import { reviews } from "@/lib/data";
import type { CityData } from "@/lib/cities";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .replace(".", "")
    .slice(0, 2)
    .toUpperCase();
}

export default function LocationCityTestimonials({ city }: { city: CityData }) {
  // Real reviews only — a review from this city floats to the featured card
  const sorted = [...reviews].sort((a, b) => {
    const aMatch = a.company.includes(city.name) ? 1 : 0;
    const bMatch = b.company.includes(city.name) ? 1 : 0;
    return bMatch - aMatch;
  });

  const featured = sorted[0];
  const leftTop = sorted[1];
  const bottomWhite = sorted[2];
  const bottomDark = sorted[3];

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.lines} aria-hidden='true'>
            <span />
            <span />
            <span />
          </div>

          <div className={styles.headingWrap}>
            <h2>
              What riders in {city.name} and across <br className={styles.br} />
              the Valley say about Nier
            </h2>
          </div>

          {/* ── Full-width stat bar ── */}
          <div className={styles.barCard}>
            <h3 className={`${styles.title} h4`}>
              Two decades of rides, one standard of service
            </h3>
            <div className={styles.barStats}>
              <div className={styles.barStat}>
                <div className={`${styles.statValue} h1`}>20+</div>
                <div className={styles.statLabel}>
                  Years on Valley roads, since 2004
                </div>
              </div>
              <div className={styles.barStat}>
                <div className={`${styles.statValue} h1`}>24/7</div>
                <div className={styles.statLabelStack}>
                  <StarCluster />
                  <div className={styles.statLabel}>Five-star service</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bento ── */}
          <div className={styles.bento}>
            <div className={styles.bentoLeft}>
              {leftTop && (
                <div className={styles.card}>
                  <div className={styles.cardStat}>
                    <div className={`${styles.statValue} h1`}>3–56</div>
                    <div className={styles.statLabel}>
                      Passengers per vehicle, sedan to motorcoach
                    </div>
                  </div>
                  <span className={styles.quoteMark}>&rdquo;</span>
                  <p className={styles.quoteText}>{leftTop.review}</p>
                  <div className={styles.author}>
                    <div className={styles.avatar}>
                      {initials(leftTop.reviewer)}
                    </div>
                    <div className={styles.authorMeta}>
                      <span className={styles.authorName}>
                        {leftTop.reviewer}
                      </span>
                      <span className={styles.authorCity}>
                        {leftTop.company}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.bottomRow}>
                {bottomWhite && (
                  <div className={styles.card}>
                    <span className={styles.quoteMark}>&rdquo;</span>
                    <p className={styles.quoteText}>{bottomWhite.review}</p>
                    <div className={styles.author}>
                      <div className={styles.avatar}>
                        {initials(bottomWhite.reviewer)}
                      </div>
                      <div className={styles.authorMeta}>
                        <span className={styles.authorName}>
                          {bottomWhite.reviewer}
                        </span>
                        <span className={styles.authorCity}>
                          {bottomWhite.company}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {bottomDark && (
                  <div className={`${styles.card} ${styles.cardDark}`}>
                    <span className={styles.quoteMark}>&rdquo;</span>
                    <p className={styles.quoteText}>{bottomDark.review}</p>
                    <div className={styles.author}>
                      <div className={styles.avatar}>
                        {initials(bottomDark.reviewer)}
                      </div>
                      <div className={styles.authorMeta}>
                        <span className={styles.authorName}>
                          {bottomDark.reviewer}
                        </span>
                        <span className={styles.authorCity}>
                          {bottomDark.company}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {featured && (
              <div className={`${styles.card} ${styles.cardTall}`}>
                <div className={styles.cardStatStack}>
                  <div className={`${styles.statValue} h1`}>40+</div>
                  <div className={styles.statLabel}>
                    Valley communities served, {city.name} included
                  </div>
                </div>
                <span className={styles.quoteMark}>&rdquo;</span>
                <p className={styles.quoteText}>{featured.review}</p>
                <div className={styles.author}>
                  <div className={styles.avatar}>
                    {initials(featured.reviewer)}
                  </div>
                  <div className={styles.authorMeta}>
                    <span className={styles.authorName}>
                      {featured.reviewer}
                    </span>
                    <span className={styles.authorCity}>
                      {featured.company}
                    </span>
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
            )}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
