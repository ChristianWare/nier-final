"use client";

import styles from "./WekoPaPricing.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { useState } from "react";

type Direction = "to" | "from";

const plans = [
  {
    id: "suv",
    name: "Executive SUV",
    tagline: "Perfect for small groups and solo travelers.",
    price: 90,
    priceDetails: "$75 base fare + $15 gratuity",
    popular: false,
    passengers: "Up to 7 passengers",
    features: [
      "Up to 7 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 4 golfers with clubs",
    ],
    notIncluded: [],
  },
  {
    id: "van",
    name: "14-Passenger Van",
    tagline: "Ideal for golf groups, corporate outings, and full parties.",
    price: 162,
    priceDetails: "$135 base fare + $27 gratuity",
    popular: true,
    passengers: "Up to 14 passengers",
    features: [
      "Up to 14 passengers",
      "Club & luggage storage included",
      "Real-time flight tracking",
      "Complimentary bottled water",
      "Climate controlled cabin",
      "Flat rate — fare and gratuity included",
      "Max 10 golfers with clubs",
    ],
    notIncluded: [],
  },
];

const directionLabels: Record<Direction, { label: string; sub: string }> = {
  to: {
    label: "Sky Harbor → We-Ko-Pa",
    sub: "Airport pickup to the club",
  },
  from: {
    label: "We-Ko-Pa → Sky Harbor",
    sub: "Post-round drop to the airport",
  },
};

export default function WekoPaPricing() {
  const [direction, setDirection] = useState<Direction>("to");

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
            the rate you see.
          </p>

          {/* Direction Toggle */}
          <div className={styles.toggleWrap}>
            <button
              className={`${styles.toggleBtn} ${direction === "to" ? styles.toggleActive : ""}`}
              onClick={() => setDirection("to")}
            >
              Sky Harbor → We-Ko-Pa
            </button>
            <button
              className={`${styles.toggleBtn} ${direction === "from" ? styles.toggleActive : ""}`}
              onClick={() => setDirection("from")}
            >
              We-Ko-Pa → Sky Harbor
            </button>
          </div>

          <p className={styles.directionSub}>
            {directionLabels[direction].sub}
          </p>
        </div>

        <div className={styles.cards}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.popular ? styles.cardPopular : styles.cardBase}`}
            >
              {plan.popular && (
                <span className={styles.popularBadge}>Most Popular</span>
              )}

              <div className={styles.cardTop}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
                <div className={styles.priceRow}>
                  <span className={styles.priceDollar}>$</span>
                  <span className={styles.priceValue}>{plan.price}</span>
                  <span className={styles.priceUnit}>/ one way</span>
                </div>
                <hr />
                <p className={`${styles.priceDetails} badge badge_neutral`}>
                  ({plan.priceDetails})
                </p>
              </div>

              <div className={styles.cardCta}>
                <Button
                  href='#booking'
                  text='Book This Vehicle'
                  btnType={plan.popular ? "underlinedWhite" : "black"}
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

        {/* <p className={styles.footnote}>
          Prices are per vehicle, one way. Both directions available at the same
          rate. Need a round trip?{" "}
          <a href='/book' className={styles.footnoteLink}>
            Book both legs together ↗
          </a>
        </p> */}
      </LayoutWrapper>
    </section>
  );
}
