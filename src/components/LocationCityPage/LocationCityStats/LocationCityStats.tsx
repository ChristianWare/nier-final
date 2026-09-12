import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityStats.module.css";
import type { CityData } from "@/lib/cities";

export default function LocationCityStats({ city }: { city: CityData }) {
  if (!city.airportMinutes) return null;

  const stats = [
    {
      value: "20+",
      label: "Years on Valley roads",
      copy: `Chauffeured black car service since 2004 — the same standard on every ride in ${city.name}.`,
    },
    {
      value: `${city.airportMinutes} min`,
      label: `${city.name} to Sky Harbor`,
      copy: "Typical drive time to PHX — and we build in the cushion so an early flight never feels like a race.",
    },
    {
      value: "3–56",
      label: "Passengers per vehicle",
      copy: "Executive sedans and SUVs up to Sprinters and a full-size motorcoach — matched to your exact headcount.",
    },
  ];

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <h2 className={styles.heading}>
            <span className={styles.accent}>
              Black car service in {city.name}, <br />
            </span>
            trusted across the Valley <br />
            <span className={styles.faded}>since 2004.</span>
          </h2>

          <div className={styles.statsGrid}>
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`${styles.statCol} ${i === 1 ? styles.statColMid : ""} ${i === 2 ? styles.statColLast : ""}`}
              >
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
                <p className={styles.statCopy}>{stat.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
