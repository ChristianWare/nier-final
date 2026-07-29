import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServiceCityFleet.module.css";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { fleetData } from "@/lib/data";
import type { CityData } from "@/lib/cities";

export default function ServiceCityFleet({ city }: { city: CityData }) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <h2 className={styles.heading}>Available Vehicles in {city.name}</h2>
          <p className={styles.copy}>
            Choose from executive sedans with cold bottled water and phone
            chargers, sleek SUVs that swallow six roller bags, or luxury
            sprinter vans with Wi-Fi and conference seating.
          </p>
        </div>
        <div className={styles.content}>
          {fleetData.map((x) => (
            <div className={styles.card} key={x.id}>
              <div className={styles.left}>
                <SectionHeading text='Available' dot />
                <div className={styles.imgContainer}>
                  <Image
                    src={x.src}
                    fill
                    alt={x.title}
                    title={x.title}
                    className={styles.img}
                  />
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.featureContainer}>
                  <h3 className={styles.title}>{x.title}</h3>
                </div>
                <div className={styles.featureContainer}>
                  <p className={styles.detail}>{x.desc}</p>
                </div>
                <div className={styles.featureContainer}>
                  <span className={styles.feature}>Seats:</span>
                  <p className={styles.detail}>{x.seats}</p>
                </div>
                <div className={styles.featureContainer}>
                  <span className={styles.feature}>Cargo:</span>
                  <p className={styles.detail}>{x.cargo}</p>
                </div>
                {x.rateRules?.hourlyFromUSD && (
                  <div className={styles.featureContainer}>
                    <span className={styles.feature}>From:</span>
                    <p className={styles.detail}>
                      ${x.rateRules.hourlyFromUSD}/hr
                    </p>
                  </div>
                )}
                <div className={styles.btnContainer}>
                  <Button
                    href={`/fleet/${x.slug}/${city.slug}`}
                    btnType='black'
                    text={`Book in ${city.name}`}
                    arrow
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
