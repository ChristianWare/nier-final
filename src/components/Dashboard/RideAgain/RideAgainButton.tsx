"use client";

// "Book this again" on a past trip's page: the same as a Ride again card,
// as a single button.

import { useRouter } from "next/navigation";
import RedoIcon from "@/components/shared/icons/RedoIcon/RedoIcon";
import { startRideAgain } from "./RideAgain";
import type { RideAgainPrefill } from "./rideAgainPrefill";
import styles from "./RideAgain.module.css";

export default function RideAgainButton({
  prefill,
}: {
  prefill: RideAgainPrefill;
}) {
  const router = useRouter();
  return (
    <button
      type='button'
      className={styles.button}
      onClick={() => startRideAgain(prefill, router.push)}
    >
      <RedoIcon className={styles.buttonIcon} aria-hidden='true' />
      Book this again
    </button>
  );
}
