import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import BackgroundVideo from "@/components/shared/BackgroundVideo/BackgroundVideo";
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

/**
 * Page intro for guide-style pages: eyebrow, h1, lead, buttons, a full-width
 * video card, and an optional row of quick facts under it. Everything that
 * changes from page to page comes in as a prop.
 */
export default function GuideHero({
  eyebrow,
  heading,
  lead,
  media,
  primaryCta,
  secondaryCta,
  scrollTo,
  scrollText = "Read the guide",
  facts,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  media: GuideHeroMedia;
  primaryCta: GuideHeroCta;
  secondaryCta?: GuideHeroCta;
  /** id of the section the "scroll down" link jumps to. */
  scrollTo?: string;
  scrollText?: string;
  facts?: readonly { label: string; value: string }[];
}) {
  return (
    <section className={styles.hero}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text={eyebrow} dot />
          <h1 className={`${styles.heading} h2`}>{heading}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>

        <div className={styles.actions}>
          <div className={styles.ctas}>
            <Button
              href={primaryCta.href}
              text={primaryCta.text}
              btnType='black'
              arrow
            />
            {secondaryCta && (
              <Button
                href={secondaryCta.href}
                text={secondaryCta.text}
                btnType='underlinedBlack'
                arrow
              />
            )}
          </div>
          {scrollTo && (
            <a href={`#${scrollTo}`} className={styles.scroll}>
              {scrollText}
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                <path
                  d='M12 4v14m0 0l-6-6m6 6l6-6'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </a>
          )}
        </div>

        <div className={styles.media}>
          {/* Phones: the still frame (no video download on mobile data) */}
          <div className={styles.mobileMedia}>
            <Image
              src={media.poster}
              alt={media.alt}
              fill
              sizes='100vw'
              className={styles.mobileImg}
            />
          </div>
          <div className={styles.desktopMedia}>
            <BackgroundVideo
              src={media.video}
              poster={media.poster}
              label={media.alt}
            />
            {/* Slight darkening so the card reads as one piece with the page */}
            <div className={styles.overlay} aria-hidden='true' />
          </div>
        </div>

        {facts && facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt className={styles.factLabel}>{f.label}</dt>
                <dd className={styles.factValue}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </LayoutWrapper>
    </section>
  );
}
