import LayoutWrapper from "@/components/shared/LayoutWrapper";
import ServiceCard from "@/components/shared/ServiceCard/ServiceCard";
import styles from "./LocationCityServicesGrid.module.css";
import { servicesData as services } from "@/lib/services";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import type { CityData } from "@/lib/cities";

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
              <ServiceCard key={x.id} service={x} />
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
