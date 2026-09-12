import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityNeighborhoods.module.css";
import Image from "next/image";
import type { CityData } from "@/lib/cities";

export default function LocationCityNeighborhoods({
  city,
}: {
  city: CityData;
}) {
  if (!city.neighborhoods || city.neighborhoods.length === 0) return null;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <div className={styles.bigStat}>24/7</div>
            <p className={styles.bigStatCopy}>
              Door-to-door pickups across every {city.name} neighborhood, any
              hour of the day.
            </p>
          </div>
          <h2 className={styles.heading}>
            Neighborhoods we serve in {city.name} — from{" "}
            {city.neighborhoods[0].name} to{" "}
            {city.neighborhoods[city.neighborhoods.length - 1].name}
          </h2>
        </div>

        <div className={styles.grid}>
          {city.neighborhoods.map((hood, i) => (
            <div key={hood.name} className={styles.col}>
              <span className={styles.num}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="h4">{hood.name}</h3>
              <p className={styles.hoodCopy}>{hood.copy}</p>
              {hood.img && (
                <div className={styles.imgContainer}>
                  <Image
                    src={hood.img}
                    alt={`${hood.name} — black car service in ${city.name}, AZ`}
                    title={`${hood.name} — black car service in ${city.name}, AZ`}
                    fill
                    className={styles.img}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
