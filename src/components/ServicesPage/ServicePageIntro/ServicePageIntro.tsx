import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServicePageIntro.module.css";
import Image, { StaticImageData } from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Link from "next/link";

interface ServicePageIntroProps {
  heading: React.ReactNode;
  stat: {
    quote: string;
    authorImage: StaticImageData | string;
    authorName: string;
  };
  label?: string;
  heroImage: StaticImageData | string;
  /** Renders a custom element (e.g. WekoPaBookingTrigger) directly under the h1 */
  button?: React.ReactNode;
  /** Fallback plain link — only used when button prop is not provided */
  btnText?: string;
  btnLink?: string;
}

export default function ServicePageIntro({
  heading,
  stat,
  heroImage,
  label = "",
  button,
  btnText,
  btnLink,
}: ServicePageIntroProps) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text={label} dot />
              <h1 className={styles.heading}>{heading}</h1>
              {button ? (
                <div className={styles.btn}>{button}</div>
              ) : btnText && btnLink ? (
                <Link href={btnLink} className={styles.btn}>
                  {btnText}
                </Link>
              ) : null}
          
            </div>
            <div className={styles.right}>
              <div className={styles.statBox}>
                <div className={`${styles.stat} h6`}>
                  &ldquo;{stat.quote}&rdquo;
                </div>
                <div className={styles.statiii}>
                  <Image
                    src={stat.authorImage}
                    alt={stat.authorName}
                    title={stat.authorName}
                    width={60}
                    height={60}
                    className={styles.imgSmall}
                  />
                  <div className={styles.statiiiText}>— {stat.authorName}</div>
                </div>
              </div>
              <div className={styles.imgContainer}>
                <Image
                  src={heroImage}
                  alt='hero image'
                  title='hero image'
                  className={styles.img}
                  priority
                  fill
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
      <div className={styles.bottom}>
        <div className={styles.imgContainer}>
          <Image
            src={heroImage}
            alt='hero image'
            title='hero image'
            className={styles.img}
            priority
            fill
          />
        </div>
      </div>
    </section>
  );
}
