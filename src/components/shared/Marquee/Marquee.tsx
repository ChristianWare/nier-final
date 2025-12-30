/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./Marquee.module.css";
import Logo from "../Logo/Logo";

export type MarqueeProps = {
  words: string[];
  speedSeconds?: number;
  pauseOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
};

export default function Marquee({
  words,
  speedSeconds = 24,
  pauseOnHover = true,
  ariaLabel = "Scrolling text",
  className = "",
}: MarqueeProps) {
  const cleaned = (words ?? []).map((w) => (w ?? "").trim()).filter(Boolean);
  const items = cleaned.length ? cleaned : [""];

  return (
    <div
      className={`${styles.slider} ${
        pauseOnHover ? styles.pauseOnHover : ""
      } ${className}`}
      aria-label={ariaLabel}
    >
      <div
        className={styles.track}
        style={{ ["--marquee-duration" as any]: `${speedSeconds}s` }}
      >
        {[...items, ...items].map((word, index) => (
          <span key={`${word}-${index}`} className={styles.item}>
            <span className={styles.word}>
              {word}

              <Logo className={styles.logo} aria-hidden='true' />
            </span>
            <span></span>
          </span>
        ))}
      </div>
    </div>
  );
}
