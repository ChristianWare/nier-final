import Image from "next/image";
import { airlineLogo } from "@/lib/airportGuides";
import styles from "./AirlineGrid.module.css";

/**
 * Airlines at a terminal as a three-column grid of logo cards.
 * Logos come from AIRLINE_LOGOS in lib/airportGuides.ts (placeholder until
 * each one is added).
 */
export default function AirlineGrid({
  airlines,
  terminal,
}: {
  airlines: readonly string[];
  /** Shown on each card, e.g. "Terminal 3". */
  terminal: string;
}) {
  return (
    <div className={styles.wrap}>
      <ul className={styles.grid} aria-label={`Airlines at ${terminal}`}>
        {airlines.map((name, i) => (
          <li key={name} className={styles.card}>
            <span className={styles.index} aria-hidden='true'>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={styles.logo}>
              <Image
                src={airlineLogo(name)}
                alt=''
                width={150}
                height={150}
                className={styles.logoImg}
              />
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{name}</span>
              <span className={styles.meta}>{terminal}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        {airlines.length} airlines · Source: skyharbor.com
      </p>
    </div>
  );
}
