import type { ReactNode } from "react";
import Button from "@/components/shared/Button/Button";
import styles from "./AboutPageIntro.module.css";
import Marquee from "@/components/shared/Marquee/Marquee";

type Cta = { text: string; href: string };

/**
 * Split hero: copy and two buttons on the left, a looping video with a red
 * tint and scrolling wordmark on the right. The About page uses the
 * defaults; other pages (e.g. /partners) pass their own words and video.
 */
export default function AboutPageIntro({
  heading = "Scottsdale & Phoenix's premier black car service",
  copy = "For over two decades, Nier Transportation has set the standard for luxury ground transportation across the Valley. We don't just get you there — we make the journey worth remembering.",
  primaryCta = { text: "Get in touch", href: "/contact" },
  secondaryCta = { text: "Our Solutions", href: "/services" },
  bottomCopy = "Our commitment to excellence and innovation has made us a trusted partner for travelers worldwide.",
  video = "/videos/about.mp4",
  eyebrow,
}: {
  heading?: string;
  copy?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  bottomCopy?: string;
  /** File under /public. */
  video?: string;
  /** Optional label above the heading (e.g. a SectionHeading). */
  eyebrow?: ReactNode;
}) {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          <div className={styles.leftContent}>
            <div className={styles.top}>
              {eyebrow}
              <h1 className={styles.heading}>{heading}</h1>
              <p className={styles.copy}>{copy}</p>
              <div className={styles.btnContainer}>
                <Button
                  text={primaryCta.text}
                  btnType='red'
                  href={primaryCta.href}
                  arrow
                />
                <Button
                  text={secondaryCta.text}
                  btnType='cream'
                  href={secondaryCta.href}
                  arrow
                />
              </div>
            </div>
            <div className={styles.bottom}>
              <p className={styles.bottomCopy}>{bottomCopy}</p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <video
            preload='none'
            autoPlay
            muted
            loop
            playsInline
            className={styles.video}
          >
            <source src={video} type='video/mp4' />
          </video>

          <div className={styles.videoOverlay} />

          <div className={styles.marqueeWrap}>
            <Marquee
              words={[
                "Nier",
                "Transportation",
                "Nier",
                "Transportation",
                "Nier",
                "Transportation",
              ]}
              speedSeconds={90}
              background='none'
              color='cream'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
