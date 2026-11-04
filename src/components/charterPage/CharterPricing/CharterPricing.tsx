import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterPricing.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Image from "next/image";
import Img1 from "../../../../public/images/vehicles/charter.jpg";
import Link from "next/link";
import { fleetData } from "@/lib/data";
import { getFleetRatesBySlug } from "@/lib/booking/publicRates";
import { HOURLY_MIN_HOURS, usdShort } from "@/lib/booking/rules";

// The fleet pages these cards price. Rates come from the vehicle categories
// linked to these pages in Admin → Vehicle Categories.
const CHARTER_FLEET_SLUGS = ["motorcoach", "mini-party-bus-20-40"] as const;

export default async function CharterPricing() {
  const rates = await getFleetRatesBySlug();
  const vehicles = CHARTER_FLEET_SLUGS.map((slug) => {
    const page = fleetData.find((f) => f.slug === slug);
    const r = rates.get(slug) ?? null;
    return {
      slug,
      title: page?.title ?? slug,
      seats: page?.seats ?? "",
      rates: r,
    };
  });

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Pricing' dot />
            <h2 className={`${styles.heading} h3`}>
              Charter Bus Rental Prices in Phoenix
            </h2>
            <p className={styles.copy1}>
              Charter bus rental pricing varies based on a handful of key
              factors: trip distance, the number of hours you need the bus, the
              vehicle size, and the time of year. Bus rental pricing varies
              depending on whether you&apos;re booking a multi-stop event
              shuttle, a straight airport run to Phoenix Sky Harbor, or a
              full-day excursion. At Nier Transportation, we believe in
              transparent, upfront pricing — no surprise fees, no vague
              estimates. Charters have a {HOURLY_MIN_HOURS}-hour minimum, and
              typical full-size motor coach charters run about $1,000–$1,500.
              See our{" "}
              <Link href='/blog/limo-black-car-prices-phoenix'>
                Phoenix limo and black car price guide
              </Link>{" "}
              for every vehicle.
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
                    {vehicle.rates?.callForPricing ||
                    !vehicle.rates?.hourlyRateCents ? (
                      <div className={styles.rateRow}>
                        <span className={styles.rateLabel}>Pricing</span>
                        <span className={styles.rateValue}>
                          <Link href='/book'>Get your price</Link>
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.rateRow}>
                          <span className={styles.rateLabel}>Hourly from</span>
                          <span className={styles.rateValue}>
                            {usdShort(vehicle.rates.hourlyRateCents)}
                            <span className={styles.rateUnit}>/hr</span>
                          </span>
                        </div>
                        <div className={styles.rateRow}>
                          <span className={styles.rateLabel}>Minimum</span>
                          <span className={styles.rateValue}>
                            {vehicle.rates.hourlyMinHours} hours
                          </span>
                        </div>
                        {vehicle.rates.airportFromCents ? (
                          <div className={styles.rateRow}>
                            <span className={styles.rateLabel}>
                              Airport from
                            </span>
                            <span className={styles.rateValue}>
                              {usdShort(vehicle.rates.airportFromCents)}
                            </span>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.disclaimer}>
              * Rates shown are starting prices for Phoenix charter bus rental,
              from the same rates our booking tool uses. Your exact total shows
              before you book and is confirmed when we approve your request.
              Gratuity optional.
            </p>
            <div className={styles.imgContainer}>
              <Image
                src={Img1}
                alt='Charter bus rental Phoenix — Nier Transportation'
                title='Charter bus rental Phoenix — Nier Transportation'
                fill
                className={styles.img}
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
