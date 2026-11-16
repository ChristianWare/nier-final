"use client";

// Loads Google Maps once the page has finished loading and the browser is
// idle, for pages whose booking widget searches addresses (home, airport
// guides, blog posts). It goes through the shared loader, so if the widget's
// route map has already asked for Maps, nothing is loaded twice.

import { useEffect } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export default function GoogleMapsLoader() {
  useEffect(() => {
    let idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      const load = () => {
        loadGoogleMaps().catch(() => {
          // The widget still works without suggestions; nothing to show.
        });
      };
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(load, { timeout: 3000 });
      } else {
        timer = setTimeout(load, 1);
      }
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      window.removeEventListener("load", start);
      if (idle) window.cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
