import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityIntro.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/other/services.jpg";
import Img2 from "../../../../public/images/people/Adam.jpg";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import type { CityData } from "@/lib/cities";

export default function LocationCityIntro({ city }: { city: CityData }) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text={`${city.name}, Arizona`} dot />
              <h1 className={styles.heading}>
                Chauffeur services tailored <br className={styles.br} /> to
                every journey in {city.name}, AZ.
              </h1>
            </div>
            <div className={styles.right}>
              <div className={styles.statBox}>
                <div className={`${styles.stat} h6`}>
                  &ldquo;Have used this service multiple times. The drivers are
                  great. Always very professional and prompt. You can tell they
                  care about safety and a great customer experience, would
                  definitely recommend it.&rdquo;
                </div>
                <div className={styles.statiii}>
                  <Image
                    src={Img2}
                    alt='Illeana L.'
                    title='Illeana L.'
                    width={60}
                    height={60}
                    className={styles.imgSmall}
                  />
                  <div className={styles.statiiiText}>— Illeana L.</div>
                </div>
              </div>
              <div className={styles.imgContainer}>
                <Image
                  src={Img1}
                  alt={`Luxury black car service in ${city.name}`}
                  title={`Luxury black car service in ${city.name}`}
                  className={styles.img}
                  fill
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
      <div className={styles.bottom}>
        <div className={styles.imgContainer}>
          <Image
            src={Img1}
            alt={`Luxury black car service in ${city.name}`}
            title={`Luxury black car service in ${city.name}`}
            className={styles.img}
            fill
          />
        </div>
      </div>
    </section>
  );
}
