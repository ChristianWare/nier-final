import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityTopServices.module.css";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import type { CityData } from "@/lib/cities";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function LocationCityTopServices({ city }: { city: CityData }) {
  if (!city.topServices || city.topServices.length === 0) return null;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.grid}>
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
            <div className={styles.features}>
              {city.topServices.map((service) => (
                <div key={service.title} className={styles.feature}>
                  <SectionHeading text={service.title} dot />
                  <p className={styles.featureCopy}>{service.copy}</p>
                </div>
              ))}
            </div>
            <div className={styles.btnContainer}>
              <Button href='/book' text='Book your Ride' btnType='red' arrow />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
