import styles from "./AboutUsIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";

const data = [
  {
    id: 1,
    title: "Punctuality Guaranteed",
    description:
      "We don't just aim to be on time — we guarantee it. If your chauffeur isn't there within 15 minutes of your scheduled pickup, your first hour is on us.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Professional Chauffeurs",
    description:
      "Every driver is uniformed, background-checked, and trained in discreet, white-glove service. No gig drivers. No surprises.",
    icon: <Sparkle className={styles.icon} />,
  },
  {
    id: 3,
    title: "Luxury Fleet",
    description:
      "Late-model sedans, SUVs, and Sprinter vans — each maintained above DOT standards with bottled water, phone chargers, and climate control set before you arrive.",
    icon: <Cups className={styles.icon} />,
  },
  {
    id: 4,
    title: "24/7 Customer Support",
    description:
      "Red-eye flight? Early morning meeting? Last-minute change of plans? Our team is available around the clock for bookings, questions, and real-time support.",
    icon: <SquareCircle className={styles.icon} />,
  },
];

export default function AboutUsIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.l1}>
              <SectionHeading text='About Us' dot />
            </div>
            <div className={styles.l2}>
              <h2 className={styles.heading}>
                Phoenix&apos;s trusted name in private transportation.
              </h2>
              <p className={styles.copy}>
                For over 20 years, Nier Transportation has been the go-to black
                car service for executives, families, and travelers across the
                Valley. Whether it&apos;s a 5 AM airport pickup or a full-day
                chauffeur for your corporate team, we treat every ride like
                it&apos;s our reputation on the line — because it is.
              </p>
              <div className={styles.btnContanier}>
                <Button
                  btnType='black'
                  text='About us'
                  href='/about'
                  arrow
                />
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <SectionHeading text='Why ride with us?' dot />
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
