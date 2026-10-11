"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AirportCarService.module.css";

/**
 * Looping, muted background video with a pause/play button (anything that
 * moves for more than 5 seconds needs a way to stop it). Respects the
 * visitor's "reduce motion" setting by starting paused.
 */
export default function AirportVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  // Starts false; the video's own play event flips it, so the button is right
  // even when a browser blocks autoplay (e.g. phone low-power mode).
  const [playing, setPlaying] = useState(false);

  // "Reduce motion" visitors start paused; the pause event updates the button.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current?.pause();
    }
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <>
      <video
        ref={ref}
        className={styles.video}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload='none'
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type='button'
        className={styles.playToggle}
        onClick={toggle}
        aria-label={playing ? "Pause video" : "Play video"}
      >
        {playing ? (
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <rect x='6' y='5' width='4' height='14' rx='1' />
            <rect x='14' y='5' width='4' height='14' rx='1' />
          </svg>
        ) : (
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z' />
          </svg>
        )}
      </button>
    </>
  );
}
