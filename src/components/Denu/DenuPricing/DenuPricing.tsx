"use client";

import styles from "./DenuPricing.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

const plans = [
  {
    id: "skyharbor-suv",
    airport: "Phoenix Sky Harbor",
    name: "Executive SUV",
    tagline: "Perfect for couples, families, and solo travelers.",
    price: 79,
    priceDetails: "Fare and gratuity included",
    theme: "dark1",
    popular: true,
    features: [
      "Up to 7 passengers",
      "Luggage assistance included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Door-to-door at the hotel entrance",
    ],
  },
  {
    id: "skyharbor-van",
    airport: "Phoenix Sky Harbor",
    name: "14-Passenger Van",
    tagline: "Ideal for groups, meetings, and wedding parties.",
    price: 150,
    priceDetails: "Fare and gratuity included",
    theme: "dark2",
    popular: true,
    features: [
      "Up to 14 passengers",
      "Luggage assistance included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Door-to-door at the hotel entrance",
    ],
  },
  {
    id: "mesa-suv",
    airport: "Mesa Gateway",
    name: "Executive SUV",
    tagline: "Perfect for couples, families, and solo travelers.",
    price: 174,
    priceDetails: "Fare and gratuity included",
    theme: "light1",
    popular: true,
    features: [
      "Up to 7 passengers",
      "Luggage assistance included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Door-to-door at the hotel entrance",
    ],
  },
  {
    id: "mesa-van",
    airport: "Mesa Gateway",
    name: "14-Passenger Van",
    tagline: "Ideal for groups, meetings, and wedding parties.",
    price: 306,
    priceDetails: "Fare and gratuity included",
    theme: "light2",
    popular: true,
    features: [
      "Up to 14 passengers",
      "Luggage assistance included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Door-to-door at the hotel entrance",
    ],
  },
];

export default function DenuPricing() {
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
            One fixed price per vehicle, gratuity included. No surge fees, no
            hidden charges — just the rate you see. Available from both Phoenix
            Sky Harbor and Mesa Gateway airports, straight to the hotel entrance
            at 1 E Adams Street.
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
