import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityServicesGrid.module.css";
import { servicesData as services } from "@/lib/services";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import type { CityData } from "@/lib/cities";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";

export default function LocationCityServicesGrid({ city }: { city: CityData }) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Services' dot />
            <h2 className={styles.heading}>{`Services in ${city.name}`}</h2>
          </div>

          <div className={styles.bottom}>
            {services.map((x) => (
              <div key={x.id} className={styles.card}>
                <div className={styles.titleDescBox}>
                  <div className={styles.idTitleBox}>
                    <div className={styles.idBox}>
                      <span className={styles.id}>{x.id}</span>
                    </div>
                    <h3 className={`cardTitle h5 bgWhite`}>{x.title}</h3>
                  </div>
                  <p className={styles.desc}>{x.copy}</p>
                </div>

                <div className={styles.btnContainer}>
                  <Button
                    text='Learn More'
                    btnType='underlinedBlack'
                    href={`/services/${x.slug}/${city.slug}`}
                    arrow
                  />
                </div>

                <div className={styles.imgContainer}>
                  <Image
                    src={x.src}
                    alt={x.title}
                    fill
                    className={styles.img}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
