import styles from "./WekopaFinalCTA.module.css";
import CountUp from "@/components/shared/CountUp/CountUp";
import ContentPadding from "@/components/shared/ContentPadding/ContentPadding";
import ScrollToSectionButton from "@/components/shared/ScrollToSectionButton/ScrollToSectionButton";

const data = [
  { id: 1, number: "22", detail: "Years serving the Valley" },
  { id: 2, number: "38", detail: "Miles, fully handled" },
  { id: 3, number: "100%", detail: "Flat-rate, no surge pricing" },
];

function parseStat(str: string): { value: number; suffix: string } {
  const m = str.trim().match(/^(\d+(?:\.\d+)?)([a-zA-Z%+]+)?$/);
  const raw = m ? Number(m[1]) : Number(str) || 0;
  const suffix = m?.[2] ?? "";
  return { value: raw, suffix };
}

export default function WekopaFinalCTA() {
  return (
    <section className={styles.container}>
      <video
        preload='none'
        autoPlay
        muted
        loop
        playsInline
        className={styles.video}
      >
        <source src='./videos/golfii.mp4' type='video/mp4' />
      </video>

      <div className={styles.imgOverlay} />

      <ContentPadding>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={styles.heading}>
              Your tee time <br className={styles.br} /> starts the moment{" "}
              <br className={styles.br} /> you leave home.
            </h2>
            <div className={styles.btnClusterContainer}>
              {/* <WekoPaBookingTrigger
                text='Reserve your transfer'
                btnType='underlinedWhite'
              /> */}
              <ScrollToSectionButton
                sectionId='booking'
                text='Book Your Transfer'
                btnType='underlinedWhite'
              />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.mapDataContainer}>
              {data.map((item) => {
                const { value, suffix } = parseStat(item.number);
                return (
                  <div key={item.id} className={styles.card}>
                    <h3 className={`${styles.number} stat`}>
                      <CountUp
                        from={0}
                        to={value}
                        duration={1.2}
                        separator=','
                        className={styles.count}
                      />
                      {suffix && (
                        <span className={styles.suffix}>{suffix}</span>
                      )}
                    </h3>
                    <p className={styles.detail}>{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ContentPadding>
    </section>
  );
}
