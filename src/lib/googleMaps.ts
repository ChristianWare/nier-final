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
