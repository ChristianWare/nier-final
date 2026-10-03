// src/lib/celebrate.ts — the confetti burst used after a payment, for other
// "it's done" moments too. Skipped for anyone who prefers reduced motion.

import confetti from "canvas-confetti";

const COLORS = ["#000000", "#c41e3a", "#ffd700", "#228b22"];

export function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const end = Date.now() + 2000;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: COLORS,
  });
  frame();
}
