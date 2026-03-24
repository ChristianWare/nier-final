import styles from "./CorporateIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function CorporateIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Corporate Accounts' dot />
            <h2 className={styles.heading}>
              Seamless ground transportation solutions for businesses of all sizes.
            </h2>
            <p className={styles.copy}>
              Simplify how your company moves. With a Nier Transportation
              corporate account, you get centralized billing, a dedicated
              passenger roster, negotiated rates, and a single point of contact
              for all your ground transportation needs.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='/corporate-accounts'
                text='Apply for a Corporate Account'
                btnType='underlinedBlack'
                arrow
              />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.media}>
              <video
                preload='none'
                autoPlay
                muted
                loop
                playsInline
                className={styles.video}
              >
                <source src='/videos/corporate.mp4' type='video/mp4' />
              </video>
              <div className={styles.imgOverlay} />
            </div>
          </div>
          {/* <div className={styles.statsRow}>
            {stats.map((stat) => (
              <div key={stat.id} className={styles.statCard}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div> */}
        </div>
      </LayoutWrapper>
    </section>
  );
}
