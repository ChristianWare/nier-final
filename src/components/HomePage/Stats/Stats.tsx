import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Stats.module.css";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";

type StatsProps = {
  flipped?: boolean;
};

export default function Stats({ flipped = false }: StatsProps) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={`${styles.content} ${flipped ? styles.flipped : ""}`}>
          <div className={styles.left}>
            <div className={styles.media}>
              {/* Mobile: static image, no video download */}
              <div className={styles.mobileMedia}>
                <Image
                  src='https://res.cloudinary.com/dkxlrhwjd/image/upload/q_auto,f_auto/phx-poster_bps55j'
                  alt='Black car service in Phoenix'
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
                  src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto,f_webm/ladies_gae2c8'
                  type='video/webm'
                />
                <source
                  src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/ladies_gae2c8'
                  type='video/mp4'
                />
              </video>

              <div className={styles.imgOverlay} />
            </div>
            <div className={styles.statBoxContainer}>
              <div className={styles.statBox}>
                <div className={styles.statNumber}>20+</div>
                <p className={styles.copy}>Years of experience</p>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statNumber}>40k</div>
                <p className={styles.copy}>Hours on the road</p>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statNumber}>25k</div>
                <p className={styles.copy}>Happy clients</p>
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.rightTop}>
              <h2 className={styles.heading}>
                At Nier we change what Transportation means to you.
              </h2>
              <div className={styles.btnContainer}>
                <Button
                  href='/book'
                  text='Book your Ride'
                  btnType='red'
                  arrow
                />
              </div>
            </div>
            <p className={styles.copyii}>
              With over 20 years of experience, we’ve redefined what a
              transportation service can be. We’ve driven over 40,000 hours and
              served more than 25,000 happy clients. At Nier, we don’t just get
              you from point A to B – we create an experience that’s safe,
              reliable, and tailored to your needs. Join us on the road to a new
              kind of transportation.
            </p>

            {/* <ImageMarquee /> */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
