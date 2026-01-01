import styles from "./AboutNumbers.module.css";
import CountUp from "@/components/shared/CountUp/CountUp";
import Button from "@/components/shared/Button/Button";
import ContentPadding from "@/components/shared/ContentPadding/ContentPadding";

const data = [
  { id: 1, number: "22", detail: "Years of Experience" },
  { id: 2, number: "40k", detail: "Hours on the road" },
  { id: 3, number: "25k", detail: "Happy clients" },
];

function parseStat(str: string): { value: number; suffix: string } {
  // Matches leading numeric (int/float) and trailing non-numeric suffix
  const m = str.trim().match(/^(\d+(?:\.\d+)?)([a-zA-Z%+]+)?$/);
  const raw = m ? Number(m[1]) : Number(str) || 0;
  const suffix = m?.[2] ?? "";

  // For abbreviations like "k" we just keep the suffix and animate the base (e.g., 40 + "k")
  return { value: raw, suffix };
}

export default function AboutNumbers() {
  return (
    <section className={styles.container}>
      <video
        preload='auto'
        autoPlay
        muted
        loop
        playsInline
        className={styles.video}
      >
        <source src='./videos/road.mp4' type='video/mp4' />
      </video>

      <div className={styles.imgOverlay} />

      <ContentPadding>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={styles.heading}>
              {/* Numbers that reflect <br className={styles.br} /> our experience */}
              Ready to Ride? <br className={styles.br} /> Take the first step
              toward <br className={styles.br} /> an elevated travel experience.
            </h2>
            <div className={styles.btnClusterContainer}>
              <Button
                href='/'
                text='Book your ride'
                btnType='underlinedWhite'
                arrow
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
