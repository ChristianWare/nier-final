/**
 * One Google Maps JavaScript API URL for the whole site.
 *
 * Maps must only be loaded once per page session, with every library any
 * page will need. The booking page's RoutePicker needs `geometry` (route
 * line) and `places` (address search); the homepage and blog booking
 * widgets only need `places`, but they load both so that a visitor who
 * moves on to /book already has everything and Maps is never loaded twice.
 */
export const GOOGLE_MAPS_LIBRARIES = "places,geometry";

export function googleMapsSrc(
  key: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
): string {
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    key ?? "",
  )}&libraries=${GOOGLE_MAPS_LIBRARIES}`;
}

/** Marks our Maps <script> so loaders can find and wait on it. */
export const GOOGLE_MAPS_SCRIPT_ATTR = "data-google-maps";

const MAPS_SCRIPT_SRC = "https://maps.googleapis.com/maps/api/js";

/** Maps is on the page with both libraries we use. */
export const googleMapsReady = () => {
  const g = (window as unknown as { google?: any }).google; // eslint-disable-line @typescript-eslint/no-explicit-any
  return Boolean(g?.maps?.places && g?.maps?.geometry);
};

let pending: Promise<void> | null = null;

/**
 * The one way to load Google Maps in the browser. Every component that
 * needs it (the booking route map, the address search, the admin maps)
 * calls this, so Maps is only ever on the page once:
 *  - already loaded with both libraries → done
 *  - loaded but missing one → add it with importLibrary
 *  - any Maps <script> already on the page (ours or another loader's,
 *    still loading or not) → wait for it
 *  - nothing yet → add the script
 * Calls made while it loads share the same promise.
 */
export function loadGoogleMaps(
  key: string | undefined = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (googleMapsReady()) return Promise.resolve();
  if (pending) return pending;

  pending = new Promise<void>((resolve, reject) => {
    const g = (window as unknown as { google?: any }).google; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (g?.maps?.importLibrary) {
      Promise.all([
        g.maps.importLibrary("places"),
        g.maps.importLibrary("geometry"),
      ])
        .then(() => resolve())
        .catch(() => reject(new Error("Failed to load Google Maps libraries")));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${MAPS_SCRIPT_SRC}"]`,
    );
    if (!existing) {
      const script = document.createElement("script");
      script.setAttribute(GOOGLE_MAPS_SCRIPT_ATTR, "1");
      script.src = googleMapsSrc(key);
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    } else {
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
    }

    // The script may finish before or after we listen, so poll; give up
    // after 20 seconds.
    const started = Date.now();
    const poll = window.setInterval(() => {
      if (googleMapsReady()) {
        window.clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 20000) {
        window.clearInterval(poll);
        reject(new Error("Failed to load Google Maps"));
      }
    }, 100);
  }).catch((e) => {
    // Let a later call try again.
    pending = null;
    throw e;
  });

  return pending;
}
