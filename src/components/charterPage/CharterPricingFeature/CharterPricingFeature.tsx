// Charter pricing, laid out like the homepage Stats section (flipped): a
// black panel with the heading and copy, and a photo with the live rates on
// red boxes. Rates come from Admin → Vehicle Categories via publicRates.

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { fleetData } from "@/lib/data";
import { getFleetRatesBySlug } from "@/lib/booking/publicRates";
import { HOURLY_MIN_HOURS, usdShort } from "@/lib/booking/rules";
import BusImg from "../../../../public/images/vehicles/charter.jpg";
import styles from "./CharterPricingFeature.module.css";

const SLUGS = ["motorcoach", "mini-party-bus-20-40"] as const;

const TRUST = [
  {
    title: "No surge pricing",
    copy: "Flat rates that never change based on time or demand.",
  },
  {
    title: "Upfront quotes",
    copy: "Your charter bus price is locked in at booking, with no surprises at pickup.",
  },
  {
    title: "Custom itineraries",
    copy: "Shuttle loops, point-to-point runs and full-day excursions, each priced to fit your trip.",
  },
];

export default async function CharterPricingFeature({
  place,
}: {
  place: string;
}) {
  const rates = await getFleetRatesBySlug();
  const buses = SLUGS.map((slug) => {
    const page = fleetData.find((f) => f.slug === slug);
    const r = rates.get(slug) ?? null;
    const hourly =
      r && !r.callForPricing && r.hourlyRateCents ? r.hourlyRateCents : null;
    return {
      slug,
      title: page?.title ?? slug,
      seats: page?.seats ?? "",
      hourly,
      minHours: r?.hourlyMinHours ?? HOURLY_MIN_HOURS,
    };
  });

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.panel}>
            <div className={styles.panelTop}>
              <SectionHeading text='Pricing' color='cream' dot />
              <h2 className={styles.heading}>
                Charter Bus Rental Prices in {place}
              </h2>
              <div className={styles.btnContainer}>
                <Button
                  href='/book'
                  text='See your price'
                  btnType='red'
                  arrow
                />
              </div>
            </div>

            <div className={styles.trust}>
              {TRUST.map((t) => (
                <div key={t.title} className={styles.trustItem}>
                  <SectionHeading text={t.title} color='cream' dot />
                  <p className={styles.copy}>{t.copy}</p>
                </div>
              ))}
            </div>

            <div className={styles.panelBottom}>
              <p className={styles.copy}>
                Charter pricing comes down to a few things: the hours you need
                the bus, the bus size, the route and the time of year. A
                multi-stop event shuttle, a straight run to Sky Harbor and a
                full-day excursion are each priced differently. Charters have a{" "}
                {HOURLY_MIN_HOURS}-hour minimum, and typical full-size motor
                coach charters run about $1,000–$1,500. See the{" "}
                <Link
                  href='/blog/charter-bus-rental-cost-phoenix'
                  className={styles.link}
                >
                  charter bus cost guide
                </Link>{" "}
                or the{" "}
                <Link
                  href='/blog/limo-black-car-prices-phoenix'
                  className={styles.link}
                >
                  limo and black car price guide
                </Link>{" "}
                for every vehicle.
              </p>
              <p className={styles.copy}>
                Have your date, group size, pickup, destinations and any onboard
                needs ready, and you&apos;ll get a clean, honest number. Rates
                shown are starting prices from the same rates our booking tool
                uses. Your exact total shows before you book and is confirmed
                when we approve your request. Gratuity optional.
              </p>
            </div>
          </div>

          <div className={styles.media}>
            <div className={styles.imgWrap}>
              <Image
                src={BusImg}
                alt={`Charter bus rental in ${place}, Arizona`}
                title={`Charter bus rental in ${place}, Arizona`}
                fill
                sizes='(max-width: 768px) 100vw, 60vw'
                className={styles.img}
                placeholder='blur'
              />
              <div className={styles.imgOverlay} />
            </div>
            <div className={styles.statBoxContainer}>
              {buses.map((b) => (
                <div key={b.slug} className={styles.statBox}>
                  <div className={styles.statNumber}>
                    {b.hourly ? (
                      <>
                        {usdShort(b.hourly)}
                        <span className={styles.statUnit}>/hr</span>
                      </>
                    ) : (
                      b.seats.replace(/\s*seater$/i, "")
                    )}
                  </div>
                  <div className={styles.statText}>
                    <p className={styles.statTitle}>{b.title}</p>
                    <p className={styles.copy}>
                      {b.hourly
                        ? `${b.seats} · hourly from, ${b.minHours}-hour minimum`
                        : "Seats"}
                    </p>
                    {!b.hourly && (
                      <Link href='/book' className={styles.link}>
                        Get your price
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
