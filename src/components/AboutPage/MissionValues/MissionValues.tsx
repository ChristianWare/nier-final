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
                To deliver the kind of transportation experience that makes life
                easier — reliable, refined, and built around you.
              </h2>
              <p className={styles.mainCopy}>
                Whether you&apos;re a frequent business traveler, a corporate
                team coordinating group logistics, or a family marking a special
                occasion, Nier Transportation is committed to exceeding your
                expectations every single time.
              </p>
              {/* <p className={styles.mainCopy}>
                When you book with Nier, you get a dedicated professional — not
                an algorithm routing the nearest available driver. You get a
                vehicle that reflects the standard of the occasion. You get a
                chauffeur who knows your name, confirms your pickup the day
                before, and waits for you — not the other way around.
              </p>
              <p className={styles.mainCopy}>
                For airport runs, corporate travel, and any moment that matters,
                that difference is everything.
              </p> */}
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
                  preload='none'
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={styles.video}
                >
                  <source src='/videos/101.mp4' type='video/mp4' />
                </video>
                <div className={styles.imgOverlay} />
              </div>

              <div className={styles.statBox}>
                <div className={styles.statNumber}>20+</div>
                <h4 className={styles.subheading}>
                  Years of Excellence in Transportation Services
                </h4>
                <p className={styles.copy}>
                  Nier Transportation has established itself as a trusted leader
                  in the industry, consistently delivering exceptional service
                  and reliability to our clients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
