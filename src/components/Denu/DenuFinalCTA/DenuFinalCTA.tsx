import styles from "./DenuFinalCTA.module.css";
import CountUp from "@/components/shared/CountUp/CountUp";
import ContentPadding from "@/components/shared/ContentPadding/ContentPadding";
import ScrollToSectionButton from "@/components/shared/ScrollToSectionButton/ScrollToSectionButton";

const data = [
  { id: 1, number: "22", detail: "Years serving the Valley" },
  { id: 2, number: "12", detail: "Minutes from Sky Harbor to your room" },
  { id: 3, number: "100%", detail: "Flat-rate, gratuity included" },
];

function parseStat(str: string): { value: number; suffix: string } {
  const m = str.trim().match(/^(\d+(?:\.\d+)?)([a-zA-Z%+]+)?$/);
  const raw = m ? Number(m[1]) : Number(str) || 0;
  const suffix = m?.[2] ?? "";
  return { value: raw, suffix };
}

export default function DenuFinalCTA() {
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
        <source
          src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/phx_y9t0y5'
          type='video/mp4'
        />
      </video>

      <div className={styles.imgOverlay} />

      <ContentPadding>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={styles.heading}>
              Your stay starts <br className={styles.br} /> the moment{" "}
              <br className={styles.br} /> you land.
            </h2>
            <div className={styles.btnClusterContainer}>
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
