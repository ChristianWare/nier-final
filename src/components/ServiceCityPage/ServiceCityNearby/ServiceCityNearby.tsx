import styles from "./ServiceCityNearby.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import type { CityData } from "@/lib/cities";
import type { ServiceShape } from "@/lib/services";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";

type Props = {
  service: ServiceShape;
  city: CityData;
  nearbyCities: readonly CityData[];
};

export default function ServiceCityNearby({
  service,
  city,
  nearbyCities,
}: Props) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.header}>
          <SectionHeading text='Also serving' dot />
          <h2 className={styles.heading}>
            {service.title} near {city.name}
          </h2>
          <p className={styles.subheading}>
            We provide {service.title.toLowerCase()} across greater Metro
            Phoenix. Select a nearby city to learn more.
          </p>
        </div>
        <div className={styles.grid}>
          {nearbyCities.map((nearbyCity) => (
            <div key={nearbyCity.slug} className={styles.card}>
              <h3 className={`${styles.cityName} cardTitle`}>
                {nearbyCity.name}
              </h3>
              <p className={styles.cityNote}>{nearbyCity.note}</p>
              <Button
                href={`/services/${service.slug}/${nearbyCity.slug}`}
                text={`${service.title} in ${nearbyCity.name}`}
                btnType='underlinedBlack'
                arrow
              />
              <div className={styles.imgContainer}>
                <Image
                  src={nearbyCity.src}
                  alt={nearbyCity.name}
                  title={nearbyCity.name}
                  layout='fill'
                  objectFit='cover'
                  className={styles.img}
                />
              </div>
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
