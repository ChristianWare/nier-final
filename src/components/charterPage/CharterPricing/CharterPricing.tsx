import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterPricing.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function CharterPricing() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Pricing' dot />
            <h2 className={`${styles.heading} h3`}>
              How Much Does Phoenix Charter Bus Rental Pricing Cost With Nier?
            </h2>
            <p className={styles.copy1}>
              Charter bus rental pricing varies based on a handful of key
              factors: trip distance, the number of hours you need the bus, the
              vehicle size, and the time of year. Bus rental pricing varies
              depending on whether you&apos;re booking a multi-stop event
              shuttle, a straight airport run to Phoenix Sky Harbor, or a
              full-day excursion. At Nier Transportation, we believe in
              transparent, upfront pricing — no surprise fees, no vague
              estimates.
            </p>
            <p className={styles.copy}>
              When you request a charter bus price quote from Nier
              Transportation, be ready to share your date, group size, pickup
              location, destinations, and any onboard requirements. We&apos;ll
              factor all of that in and give you a clean, honest number. No
              surprises — that&apos;s how we&apos;ve built long-term
              relationships with Phoenix businesses and families since 2004.
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
                  Your charter bus price quote is locked in at booking — no
                  surprises on pickup.
                </p>
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustLabel}>Custom itineraries</span>
                <p className={styles.trustDesc}>
                  Shuttle bus rental loops, point-to-point service, and full-day
                  excursions all priced differently — we&apos;ll find the right
                  structure for your trip.
                </p>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.ratesGrid}>
              {vehicles.map((vehicle) => (
                <div key={vehicle.slug} className={styles.rateCard}>
                  <div className={styles.rateCardTop}>
                    <h3 className={`${styles.vehicleName} cardTitle h5`}>
                      {vehicle.title}
                    </h3>
                    <p className={styles.vehicleSeats}>{vehicle.seats}</p>
                  </div>
                  <div className={styles.rateCardRates}>
                    {vehicle.hourlyFromUSD && (
                      <div className={styles.rateRow}>
                        <span className={styles.rateLabel}>Hourly from</span>
                        <span className={styles.rateValue}>
                          ${vehicle.hourlyFromUSD}
                          <span className={styles.rateUnit}>/hr</span>
                        </span>
                      </div>
                    )}
                    {vehicle.airportTransferFromUSD && (
                      <div className={styles.rateRow}>
                        <span className={styles.rateLabel}>Airport from</span>
                        <span className={styles.rateValue}>
                          ${vehicle.airportTransferFromUSD}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.disclaimer}>
              * Rates shown are starting prices for Phoenix charter bus rental.
              Final fare confirmed at booking. Our 56-passenger full-size
              charter bus pricing starts at a competitive hourly rate — contact
              us for a custom bus rental quote tailored to your group and
              itinerary. Gratuity optional.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}

const vehicles = [
  {
    slug: "56-passenger-charter-bus",
    title: "56-Passenger Charter Bus",
    seats: "Up to 56 passengers",
    hourlyFromUSD: 150,
    airportTransferFromUSD: 295,
  },
  {
    slug: "minibus",
    title: "Minibus Rental",
    seats: "18–35 passengers",
    hourlyFromUSD: 95,
    airportTransferFromUSD: 175,
  },
];
