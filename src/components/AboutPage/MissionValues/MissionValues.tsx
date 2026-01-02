import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./MissionValues.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";

const data = [
  {
    id: 1,
    title: "Punctuality Guaranteed",
    description: "15‑minute on‑time guarantee or the first hour is free.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Professional Chauffeurs",
    description:
      "Uniformed, background‑checked, and trained in discreet service.",
    icon: <Sparkle className={styles.icon} />,
  },
];

export default function MissionValues() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='Our mission: ' color='red' />
              <h2 className={`${styles.heading} h3`}>
                To revolutionize urban mobility with sustainable, efficient, and
                accessible transportation solutions.
              </h2>
              <p className={styles.mainCopy}>
                We strive to make sustainable transportation accessible to all,
                fostering a future where cities are cleaner, quieter, and more
                connected.
              </p>
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
            <div className={styles.right}>
              <div className={styles.media}>
                <video
                  preload='auto'
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={styles.video}
                >
                  <source src='/videos/phx.mp4' type='video/mp4' />
                </video>
                <div className={styles.imgOverlay} />
              </div>

              <div className={styles.statBox}>
                <div className={styles.statNumber}>250+</div>
                <h4 className={styles.subheading}>
                  Systems deployed worldwide
                </h4>
                <p className={styles.copy}>
                  Our proven track record shows the trust global leaders place
                  in Modix to deliver reliable, future-ready industrial systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
