"use client";

import { useEffect, useRef } from "react";
import { navProgress } from "./navProgress";

/** Runs the nav's loading bar while a page update (a React transition) is in
 *  progress: it starts the moment the update starts and finishes exactly
 *  when the new data is on screen. */
export function useNavProgress(isPending: boolean) {
  const was = useRef(false);
  useEffect(() => {
    if (isPending && !was.current) navProgress.start();
    if (!isPending && was.current) navProgress.done();
    was.current = isPending;
  }, [isPending]);
}
