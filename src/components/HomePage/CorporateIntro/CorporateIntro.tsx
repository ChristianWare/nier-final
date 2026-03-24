import styles from "./CorporateIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";

export default function CorporateIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Corporate Accounts' dot />
            <h2 className={styles.heading}>
              Seamless ground transportation solutions for businesses of all
              sizes.
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
              {/* Mobile: static image */}
              <div className={styles.mobileMedia}>
                <Image
                  src='https://res.cloudinary.com/dkxlrhwjd/image/upload/q_auto,f_auto/phx-poster_bps55j'
                  alt='Corporate transportation service'
                  fill
                  sizes='100vw'
                  style={{ objectFit: "cover", objectPosition: "top" }}
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
                  src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto,f_webm/corporate_odm4lr'
                  type='video/webm'
                />
                <source
                  src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/corporate_odm4lr'
                  type='video/mp4'
                />
              </video>

              <div className={styles.imgOverlay} />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
