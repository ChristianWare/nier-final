// A small round marker for a ride's pickup or drop-off, in the same
// colours as the booking map's markers: the accent for pickup, black
// with an accent ring for drop-off. Used in place of 📍 and 🏁.

import styles from "./RouteDot.module.css";

export default function RouteDot({ kind }: { kind: "pickup" | "dropoff" }) {
  return (
    <span
      className={`${styles.dot} ${kind === "pickup" ? styles.pickup : styles.dropoff}`}
      aria-hidden='true'
    />
  );
}
