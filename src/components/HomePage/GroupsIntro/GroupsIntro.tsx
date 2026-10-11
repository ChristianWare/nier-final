import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import styles from "./GroupsIntro.module.css";

/**
 * We-Ko-Pa and charter buses, merged into one short section. Each keeps its
 * full page (/wekopa, /charter-bus-rental-phoenix); the homepage only
 * introduces them, so it doesn't compete for "charter bus Phoenix".
 */
const cards = [
  {
    label: "Sky Harbor → We-Ko-Pa",
    stat: "$90",
    statNote: "flat, SUV, each way",
    title: "We-Ko-Pa Golf Club & Casino Resort",
    copy: "One of our most-requested transfers: 38 miles from Sky Harbor, flight tracked, $90 for an SUV or $162 for a van, same price there and back.",
    href: "/wekopa",
    cta: "Book a We-Ko-Pa transfer",
  },
  {
    label: "Charter Bus Rental",
    stat: "56",
    statNote: "passengers per motor coach",
    title: "Charter buses for groups of any size",
    copy: "Our 56-passenger motor coach, mini coaches and party buses for conventions, weddings, game days and company outings across the Valley and beyond.",
    href: "/charter-bus-rental-phoenix",
    cta: "Charter bus rental in Phoenix",
  },
];

export default function GroupsIntro() {
  return (
    <section className={styles.container} aria-labelledby='groups-heading'>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Groups, Golf & Charter' dot />
          <h2 id='groups-heading' className={`${styles.heading} h3`}>
            Moving a group? One booking, one coordinator, one invoice.
          </h2>
        </div>
        <div className={styles.grid}>
          {cards.map((c) => (
            <div key={c.href} className={styles.card}>
              <SectionHeading text={c.label} />
              <p className={styles.stat}>
                {c.stat} <span className={styles.statNote}>{c.statNote}</span>
              </p>
              <h3 className={styles.title}>{c.title}</h3>
              <p className={styles.copy}>{c.copy}</p>
              <div className={styles.btnContainer}>
                <Button
                  href={c.href}
                  text={c.cta}
                  btnType='underlinedBlack'
                  arrow
                />
              </div>
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
