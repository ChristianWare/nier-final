import styles from "./CorporatePageIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

// const stats = [
//   { id: 1, value: "24/7", label: "Availability" },
//   { id: 2, value: "100%", label: "Professional Chauffeurs" },
//   { id: 3, value: "NET 30", label: "Flexible Payment Terms" },
//   { id: 4, value: "0", label: "Hidden Fees" },
// ];

export default function CorporatePageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Corporate Accounts' dot />
            <h1 className={styles.heading}>
              Reliable Ground Transportation for Your Entire Organization
            </h1>
            <p className={styles.copy}>
              Simplify how your company moves. With a Nier Transportation
              corporate account, you get centralized billing, a dedicated
              passenger roster, negotiated rates, and a single point of contact
              for all your ground transportation needs.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='#inquiry'
                text='Apply for a Corporate Account'
                btnType='underlinedBlack'
                arrow
              />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.media}>
              <video
                preload='auto'
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
