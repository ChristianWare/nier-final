import Donut from "@/components/shared/icons/Donut/Donut";
import styles from "./CharterBenefits.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";

export default function CharterBenefits() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.header}>
            <SectionHeading text='Our Fleet' color='red' />
            <h2 className={`${styles.heading} h3`}>
              What Charter Buses Does Nier Transportation Offer for Phoenix Bus
              Rental?
            </h2>
            <p className={styles.subheading}>
              Our fleet is purpose-built for the demands of group transportation
              in Phoenix, AZ. Not sure which vehicle fits your event? Our team
              can walk you through every option based on your passenger count,
              luggage needs, and trip length — the rental for your group is
              ready to go.
            </p>
          </div>
          <div className={styles.grid}>
            {fleet.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.iconContainer}>{item.icon}</div>
                <h3 className={`${styles.cardTitle} h4`}>{item.title}</h3>
                <p className={styles.cardCopy}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}

const fleet = [
  {
    id: 1,
    title: "56-Passenger Charter Bus",
    description:
      "The centerpiece of our Phoenix bus rental fleet. Our spacious 56-passenger charter bus is a full-size charter bus built for large groups who need comfort and capacity — this is the bus our clients come back for again and again.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Reclining Seats & Climate Control",
    description:
      "Every seat on our full-size charter bus reclines for passenger comfort. Climate control keeps the cabin at the right temperature whether you're crossing Phoenix in July or heading out on an early morning airport transfer.",
    icon: <Sparkle className={styles.icon} />,
  },
  {
    id: 3,
    title: "Onboard Restroom & Luggage Storage",
    description:
      "No stops, no delays. Our charter buses include an onboard restroom and generous luggage storage so your group travels comfortably from pickup to destination — ideal for longer trips around Phoenix and the surrounding area.",
    icon: <Cups className={styles.icon} />,
  },
  {
    id: 4,
    title: "Entertainment Systems",
    description:
      "Keep your group engaged on the road. Our charter bus rental includes onboard entertainment systems, making long rides between venues, airports, or event sites feel effortless for every passenger on board.",
    icon: <SquareCircle className={styles.icon} />,
  },
  {
    id: 5,
    title: "Minibus Rental for Smaller Groups",
    description:
      "Our minibus rental options seat between 18 and 35 passengers — ideal for corporate teams, intimate event groups, or airport transfers to Phoenix Sky Harbor International Airport where a full-size coach bus would be overkill.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 6,
    title: "Private Charter Bus for Any Occasion",
    description:
      "Whether you need a private charter bus for an executive group or a coach bus for a large corporate conference, Nier Transportation has the right bus models for every group size. We'll help you match yours.",
    icon: <Sparkle className={styles.icon} />,
  },
];
