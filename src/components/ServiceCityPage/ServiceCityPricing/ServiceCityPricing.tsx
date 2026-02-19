import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServiceCityPricing.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { fleetData } from "@/lib/data";
import type { CityData } from "@/lib/cities";
import type { ServiceShape } from "@/lib/services";

type Props = {
  service: ServiceShape;
  city: CityData;
};

export default function ServiceCityPricing({ service, city }: Props) {
  const vehiclesWithRates = fleetData.filter(
    (v) => v.rateRules?.hourlyFromUSD || v.rateRules?.airportTransferFromUSD,
  );

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Pricing' dot />
            <h2 className={`${styles.heading} h3`}>
              Transparent rates for {service.title.toLowerCase()} in {city.name}
            </h2>
            <p className={styles.copy}>
              No surge pricing, no hidden fees. Every fare is quoted upfront
              before you book. Rates vary by vehicle — choose the right fit for
              your group and budget.
            </p>
            <div className={styles.trustItems}>
              <div className={styles.trustItem}>
                <span className={styles.trustLabel}>No surge pricing</span>
                <p className={styles.trustDesc}>
                  Flat rates that never change based on time or demand.
                </p>
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustLabel}>Upfront quotes</span>
                <p className={styles.trustDesc}>
                  Your fare is locked in at booking — no surprises on pickup.
                </p>
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustLabel}>24/7 availability</span>
                <p className={styles.trustDesc}>
                  Early flights, late nights, and everything in between.
                </p>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.ratesGrid}>
              {vehiclesWithRates.map((vehicle) => (
                <div key={vehicle.slug} className={styles.rateCard}>
                  <div className={styles.rateCardTop}>
                    <h3 className={styles.vehicleName}>{vehicle.title}</h3>
                    <p className={styles.vehicleSeats}>{vehicle.seats}</p>
                  </div>
                  <div className={styles.rateCardRates}>
                    {vehicle.rateRules?.hourlyFromUSD && (
                      <div className={styles.rateRow}>
                        <span className={styles.rateLabel}>Hourly from</span>
                        <span className={styles.rateValue}>
                          ${vehicle.rateRules.hourlyFromUSD}
                          <span className={styles.rateUnit}>/hr</span>
                        </span>
                      </div>
                    )}
                    {vehicle.rateRules?.airportTransferFromUSD && (
                      <div className={styles.rateRow}>
                        <span className={styles.rateLabel}>Airport from</span>
                        <span className={styles.rateValue}>
                          ${vehicle.rateRules.airportTransferFromUSD}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.disclaimer}>
              * Rates shown are starting prices. Final fare confirmed at
              booking. Gratuity optional.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
