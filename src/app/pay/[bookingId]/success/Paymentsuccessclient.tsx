"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function PaymentSuccessClient() {
  useEffect(() => {
    // Check for reduced motion preference
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) return;

    // Celebration confetti burst
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#000000", "#c41e3a", "#ffd700", "#228b22"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });

    frame();
  }, []);

  return null;
}
