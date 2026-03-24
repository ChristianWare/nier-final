import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhoWeWorkWith.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

const data = [
  {
    id: 1,
    desc: "A fleet of late-model luxury vehicles maintained to the highest standards",
  },
  {
    id: 2,
    desc: "Professional, background-checked, and uniformed chauffeurs",
  },
  {
    id: 3,
    desc: "Real-time flight tracking so we're always at the airport on time — even when flights aren't",
  },
  {
    id: 4,
    desc: "A dedicated account manager who knows your preferences and your team",
  },
];

export default function WhoWeWorkWith() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.media}>
              <video
                preload='none'
                autoPlay
                muted
                loop
                playsInline
                className={styles.video}
              >
                <source src='/videos/handshake.mp4' type='video/mp4' />
              </video>
              <div className={styles.imgOverlay} />
            </div>
          </div>
          <div className={styles.right}>
            <SectionHeading text='Our Clients' color='cream' />
            <h2 className={styles.heading}>Who We Work With</h2>
            <p className={styles.copy}>
              Nier Transportation serves a range of Phoenix-area businesses that
              depend on reliable, professional ground transportation. Our
              corporate clients include law firms and financial advisory
              practices that need seamless airport transfers for visiting
              clients, hospitality teams coordinating VIP arrivals, healthcare
              organizations moving staff between facilities, and event planners
              managing group logistics across multiple venues.
              <br />
              <br />
              What they all have in common: they can&apos;t afford a no-show, a
              late pickup, or an unprofessional experience. That&apos;s why they
              trust Nier.
            </p>
            <b className={styles.bold}>Every corporate account includes:</b>
            <ul className={styles.list}>
              {data.map((item) => (
                <li key={item.id} className={styles.listItem}>
                  {item.desc}
                </li>
              ))}
            </ul>
            <p className={`${styles.subHeading} h4`}>
              If your business sends more than a handful of cars per month, a
              corporate account will save you time, money, and the hassle of
              managing it ride by ride.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
