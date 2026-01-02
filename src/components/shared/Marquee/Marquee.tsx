/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./Marquee.module.css";
import Logo from "../Logo/Logo";

export type MarqueeProps = {
  words: string[];
  speedSeconds?: number;
  pauseOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  background?: "none" | "cream" | "white" | "black" | "accent" | string;
  color?: "cream" | "white" | "black" | "accent" | "paragraph" | string;
};

export default function Marquee({
  words,
  speedSeconds = 24,
  pauseOnHover = true,
  ariaLabel = "Scrolling text",
  className = "",
  background,
  color,
}: MarqueeProps) {
  const cleaned = (words ?? []).map((w) => (w ?? "").trim()).filter(Boolean);
  const items = cleaned.length ? cleaned : [""];

  const styleVars = {
    ["--marquee-duration" as any]: `${speedSeconds}s`,
    ...(background !== undefined
      ? {
          ["--marquee-bg" as any]:
            background === "none" ? "transparent" : `var(--${background})`,
        }
      : {}),
    ...(color !== undefined
      ? { ["--marquee-color" as any]: `var(--${color})` }
      : {}),
  };

  return (
    <div
      className={`${styles.slider} ${pauseOnHover ? styles.pauseOnHover : ""} ${className}`}
      aria-label={ariaLabel}
      style={styleVars}
    >
      <div className={styles.track}>
        <div className={styles.group}>
          {items.map((word, index) => (
            <span key={`${word}-${index}`} className={styles.item}>
              <span className={styles.word}>{word}</span>
              <Logo className={styles.logo} aria-hidden='true' />
            </span>
          ))}
        </div>

        <div className={styles.group} aria-hidden='true'>
          {items.map((word, index) => (
            <span key={`${word}-${index}-dup`} className={styles.item}>
              <span className={styles.word}>{word}</span>
              <Logo className={styles.logo} aria-hidden='true' />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
