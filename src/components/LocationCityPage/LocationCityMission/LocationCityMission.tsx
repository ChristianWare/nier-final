import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LocationCityMission.module.css";
import type { CityData } from "@/lib/cities";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function LocationCityMission({ city }: { city: CityData }) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading text='Mission' color='red' dot />
          <h2 className={`${styles.heading} h3`}>
            Nier Transportation brings luxury black car service to {city.name},{" "}
            {city.note}. Whether you need a seamless airport transfer, a
            dedicated hourly chauffeur, or transportation for a special
            occasion, our professional drivers and late-model vehicles are
            available around the clock.
          </h2>
          <p className={styles.copy}>
            Every ride in {city.name} is handled with the same attention to
            detail — on-time arrivals, clean vehicles, and courteous service
            from door to door. No surge pricing, no ride-share uncertainty. Just
            reliable luxury ground transportation when you need it.
          </p>
          <div className={styles.btnContainer}>
            <Button text='Learn More' btnType='black' href={"/about"} arrow />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
