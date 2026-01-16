"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function SuccessClient() {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) return;

    const end = Date.now() + 1200;

    const frame = () => {
      confetti({
        particleCount: 5,
        spread: 70,
        startVelocity: 35,
        ticks: 140,
        origin: { x: 0.2, y: 0.6 },
      });

      confetti({
        particleCount: 5,
        spread: 70,
        startVelocity: 35,
        ticks: 140,
        origin: { x: 0.8, y: 0.6 },
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, []);

  return null;
}
