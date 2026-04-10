"use client";

import styles from "./WekoPaPricing.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

const plans = [
  {
    id: "skyharbor-suv",
    airport: "Phoenix Sky Harbor",
    name: "Executive SUV",
    tagline: "Perfect for small groups and solo travelers.",
    price: 90,
    priceDetails: "$75 base fare + $15 gratuity",
    theme: "dark1",
    popular: true,
    features: [
      "Up to 7 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 4 golfers with clubs",
    ],
  },
  {
    id: "skyharbor-van",
    airport: "Phoenix Sky Harbor",
    name: "14-Passenger Van",
    tagline: "Ideal for golf groups, corporate outings, and full parties.",
    price: 162,
    priceDetails: "$135 base fare + $27 gratuity",
    theme: "dark2",
    popular: true,
    features: [
      "Up to 14 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 10 golfers with clubs",
    ],
  },
  {
    id: "mesa-suv",
    airport: "Mesa Gateway",
    name: "Executive SUV",
    tagline: "Perfect for small groups and solo travelers.",
    price: 120,
    priceDetails: "$100 base fare + $20 gratuity",
    theme: "light1",
    popular: true,
    features: [
      "Up to 7 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 4 golfers with clubs",
    ],
  },
  {
    id: "mesa-van",
    airport: "Mesa Gateway",
    name: "14-Passenger Van",
    tagline: "Ideal for golf groups, corporate outings, and full parties.",
    price: 195,
    priceDetails: "$165 base fare + $30 gratuity",
    theme: "light2",
    popular: true,
    features: [
      "Up to 14 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 10 golfers with clubs",
    ],
  },
];

export default function WekoPaPricing() {
  function scrollToBooking(e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById("booking");
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Pricing' dot />
          <h2 className={styles.heading}>
            Simple, flat-rate pricing.
            <br />
            No surprises.
          </h2>
          <p className={styles.subCopy}>
            One fixed price per vehicle. No surge fees, no hidden charges — just
            the rate you see. Available from both Phoenix Sky Harbor and Mesa
            Gateway airports.
          </p>
        </div>
        <div className={styles.cards}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.card} ${styles[plan.theme]}`}
            >
              {plan.popular && (
                <span className={styles.popularBadge}>{plan.airport}</span>
              )}
              <div className={styles.airportTag}>
                <SectionHeading
                  text={plan.airport}
                  dot
                  color={
                    plan.theme === "dark1" || plan.theme === "dark2"
                      ? "cream"
                      : "black"
                  }
                />
              </div>
              <div className={styles.cardTop}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
                <div className={styles.priceRow}>
                  <span className={styles.priceDollar}>$</span>
                  <span className={styles.priceValue}>{plan.price}</span>
                  <span className={styles.priceUnit}>/ one way</span>
                </div>
                <hr className={styles.dividerLine} />
                <p className={`${styles.priceDetails} badge badge_neutral`}>
                  ({plan.priceDetails})
                </p>
              </div>
              <div className={styles.cardCta}>
                <Button
                  href='#booking'
                  text='Book This Vehicle'
                  btnType={
                    plan.theme === "dark1" || plan.theme === "dark2"
                      ? "underlinedWhite"
                      : "black"
                  }
                  arrow
                  onClick={
                    scrollToBooking as React.MouseEventHandler<HTMLButtonElement>
                  }
                />
              </div>
              <div className={styles.divider} />
              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.featureItem}>
                    <span className={styles.featureStar}>✦</span>
                    <span className={styles.featureText}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
