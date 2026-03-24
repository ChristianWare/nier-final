import styles from "./AboutNumbers.module.css";
import CountUp from "@/components/shared/CountUp/CountUp";
import Button from "@/components/shared/Button/Button";
import ContentPadding from "@/components/shared/ContentPadding/ContentPadding";
import Image from "next/image";

const data = [
  { id: 1, number: "22", detail: "Years of Experience" },
  { id: 2, number: "40k", detail: "Hours on the road" },
  { id: 3, number: "25k", detail: "Happy clients" },
];

function parseStat(str: string): { value: number; suffix: string } {
  const m = str.trim().match(/^(\d+(?:\.\d+)?)([a-zA-Z%+]+)?$/);
  const raw = m ? Number(m[1]) : Number(str) || 0;
  const suffix = m?.[2] ?? "";
  return { value: raw, suffix };
}

export default function AboutNumbers() {
  return (
    <section className={styles.container}>
      {/* Mobile: static poster image, no video download */}
      <div className={styles.mobileMedia}>
        <Image
          src='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_750,q_60,f_auto/phx-poster_bps55j'
          alt='Phoenix cityscape'
          fill
          sizes='100vw'
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Desktop: video */}
      <video
        preload='none'
        autoPlay
        muted
        loop
        playsInline
        className={styles.video}
      >
        <source
          src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto,f_webm/phx_y9t0y5'
          type='video/webm'
        />
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
