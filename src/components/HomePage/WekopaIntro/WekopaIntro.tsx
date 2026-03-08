import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WekopaIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Button from "@/components/shared/Button/Button";

const data = [
  {
    id: 1,
    title: "Flat-Rate. No Surprises.",
    description:
      "$90 for the SUV. $162 for the Van. Same price there and back — no surge pricing, no metered miles.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Flight Tracking Included.",
    description:
      "We monitor your inbound flight in real time and adjust your pickup automatically if there's a delay.",
    icon: <Sparkle className={styles.icon} />,
  },
];

export default function WekopaIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='Sky Harbor → We-Ko-Pa' dot />
              <h2 className={`${styles.heading} h3`}>
                The only transfer service that runs this route every day — flat
                rate, flight tracked, and on time.
              </h2>
              <p className={styles.mainCopy}>
                We-Ko-Pa Golf Club is 38 miles from Sky Harbor International
                Airport. Rideshare apps don&apos;t specialize in this corridor —
                Nier does. We&apos;ve served Phoenix and Scottsdale since 2004
                and the Sky Harbor to We-Ko-Pa run is one of our most requested
                transfers. Arrive relaxed. Leave without stress.
              </p>
              <div className={styles.btnContainer}>
                <div className={styles.btnContainer}>
                  <Button
                    href='/wekopa'
                    text='Book your Transfer'
                    btnType='black'
                    arrow
                  />
                </div>
              </div>
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
                  <source src='/videos/golf.mp4' type='video/mp4' />
                </video>
                <div className={styles.imgOverlay} />
              </div>

              <div className={styles.statBox}>
                <div className={styles.statNumber}>38mi</div>
                <h4 className={styles.subheading}>
                  Door-to-Door — Sky Harbor to We-Ko-Pa Golf Club
                </h4>
                <p className={styles.copy}>
                  One flat rate. One dedicated driver. We handle the 38 miles so
                  you can focus on your round — or your flight home.
                </p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
