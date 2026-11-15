import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
import Marquee from "@/components/shared/Marquee/Marquee";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import styles from "./GuideHero.module.css";

export type GuideHeroMedia = {
  /** File under /public, e.g. "/videos/skyTram.mp4". */
  video: string;
  /** Still frame: shown on phones instead of the video, and while it loads. */
  poster: string;
  /** What the picture shows, for screen readers. */
  alt: string;
};

export type GuideHeroCta = { href: string; text: string };

const DEFAULT_MARQUEE = [
  "Phoenix",
  "Scottsdale",
  "Mesa",
  "Chandler",
  "Goodyear",
  "Peoria",
];

/**
 * Page intro for guide-style pages, laid out like the home page hero: a
 * full-screen video under the nav, the h1 on the left, a short line and the
 * booking button on the right, then the lead, a "scroll down" link and a
 * marquee along the bottom. Everything that changes from page to page comes
 * in as a prop. The quick facts sit under the hero, on the page.
 */
export default function GuideHero({
  heading,
  tagline,
  lead,
  media,
  primaryCta,
  scrollTo,
  scrollText = "Read the guide",
  marqueeWords = DEFAULT_MARQUEE,
  facts,
}: {
  heading: string;
  /** The short line beside the heading. */
  tagline: string;
  /** The longer intro, along the bottom of the hero. */
  lead: string;
  media: GuideHeroMedia;
  primaryCta: GuideHeroCta;
  /** id of the section the "scroll down" link jumps to. */
  scrollTo?: string;
  scrollText?: string;
  marqueeWords?: string[];
  facts?: readonly { label: string; value: string }[];
}) {
  return (
    <>
      <section className={styles.container}>
        <div className={styles.media}>
          {/* Phones: the still frame (no video download on mobile data) */}
          <div className={styles.mobileMedia}>
            <Image
              src={media.poster}
              alt={media.alt}
              fill
              priority
              sizes='100vw'
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className={styles.desktopMedia}>
            <BackgroundVideo
              src={media.video}
              poster={media.poster}
              label={media.alt}
            />
          </div>

          <div className={styles.imgOverlay} />
          <div className={styles.marqueeWrap}>
            <LayoutWrapper>
              <div className={styles.cc2}>
                <div className={styles.left2}>
                  <p className={styles.copyii}>{lead}</p>
                </div>
                {scrollTo && (
                  <a href={`#${scrollTo}`} className={styles.right2}>
                    <span className={styles.copyiii}>{scrollText}</span>
                    <Arrow className={styles.arrow} />
                  </a>
                )}
              </div>
            </LayoutWrapper>
            <Marquee words={marqueeWords} speedSeconds={90} />
          </div>
        </div>
        <LayoutWrapper>
          <div className={styles.content}>
            <div className={styles.contentChildren}>
              <div className={styles.cc1}>
                <div className={styles.left}>
                  <h1 className={`${styles.heading} h2`}>{heading}</h1>
                </div>
                <div className={styles.right}>
                  <p className={styles.copy}>{tagline}</p>

                  <div className={styles.btnContainerii}>
                    <div className={styles.btnDesktop}>
                      <Button
                        href={primaryCta.href}
                        text={primaryCta.text}
                        btnType='underlinedWhite'
                        arrow
                      />
                    </div>
                    <div className={styles.btnMobile}>
                      <Button
                        href={primaryCta.href}
                        text={primaryCta.text}
                        btnType='red'
                        arrow
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {facts && facts.length > 0 && (
        <div className={styles.factsBand}>
          <LayoutWrapper>
            <dl className={styles.facts}>
              {facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </LayoutWrapper>
        </div>
      )}
    </>
  );
}
