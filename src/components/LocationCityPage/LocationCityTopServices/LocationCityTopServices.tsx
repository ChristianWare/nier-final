import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityTopServices.module.css";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import type { CityData } from "@/lib/cities";

export default function LocationCityTopServices({ city }: { city: CityData }) {
  if (!city.topServices || city.topServices.length === 0) return null;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.grid}>
          <div className={styles.features}>
            {city.topServices.map((service) => (
              <div key={service.title} className={styles.feature}>
                <span className={styles.marker} aria-hidden='true' />
                <h3 className={styles.featureTitle}>
                  <Link href={service.href} className={styles.featureLink}>
                    {service.title}
                  </Link>
                </h3>
                <p className={styles.featureCopy}>{service.copy}</p>
              </div>
            ))}
          </div>

          <div className={styles.imgContainer}>
            <Image
              src={city.src}
              alt={`Chauffeur service in ${city.name}, Arizona`}
              title={`Chauffeur service in ${city.name}, Arizona`}
              fill
              className={styles.img}
              placeholder='blur'
            />
          </div>

          <div className={styles.right}>
            <h2 className={styles.heading}>
              The rides {city.name} books most — handled end to end
            </h2>
            <p className={styles.copy}>
              Every ride comes with a professional chauffeur, a flat rate locked
              at booking, and a vehicle matched to the trip — no surge pricing,
              no guessing.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='/book'
                text='Book your Ride'
                btnType='black'
                arrow
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
