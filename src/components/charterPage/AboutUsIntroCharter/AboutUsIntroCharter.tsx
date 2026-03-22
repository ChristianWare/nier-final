import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AboutUsIntroCharter.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";

const data = [
  {
    id: 1,
    title: "56-Passenger Capacity",
    description:
      "Our full-size charter bus seats up to 56 passengers with reclining seats, climate control, and generous luggage storage — built for large groups who need room to breathe.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Professional Bus Drivers",
    description:
      "Every driver is uniformed, background-checked, and experienced navigating Phoenix's venues, highways, and event corridors. No gig drivers. No shortcuts.",
    icon: <Sparkle className={styles.icon} />,
  },
  {
    id: 3,
    title: "Onboard Amenities",
    description:
      "Restroom, entertainment systems, and climate control come standard. Your group stays comfortable whether you're running airport transfers or a full-day excursion.",
    icon: <Cups className={styles.icon} />,
  },
  {
    id: 4,
    title: "Transparent, Flat-Rate Pricing",
    description:
      "No surge pricing, no surprise fees. Your charter bus quote is locked in at booking — we'll walk you through every cost up front before you commit to anything.",
    icon: <SquareCircle className={styles.icon} />,
  },
];

export default function AboutUsIntroCharter() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.l1}>
              <SectionHeading text='Charter Bus Rental' dot />
            </div>
            <div className={styles.l2}>
              <h2 className={styles.heading}>
                Phoenix&apos;s charter bus service, built for groups.
              </h2>
              <p className={styles.copy}>
                Since 2004, Nier Transportation has been moving large groups
                across the Phoenix metro with the reliability that events,
                corporate outings, and airport transfers demand. No parking
                headaches, no scattered rideshares, no one left behind — just
                one bus, one driver, and everyone arriving together on time.
              </p>
              <div className={styles.btnContanier}>
                <Button btnType='black' text='Get a quote' href='/book' arrow />
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <SectionHeading text='Why book with us?' dot />
            <br />
            <div className={styles.mapDataContainer}>
              {data.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardLeft}>
                    <div className={styles.iconContainer}>{item.icon}</div>
                  </div>
                  <div className={styles.cardRight}>
                    <h3 className={styles.title}>{item.title}</h3>
                    <p className={styles.desc}>{item.description}</p>
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
