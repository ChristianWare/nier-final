"use client";

// The airport map: each airport we serve as a plane marker with its code
// and name, and the selected airport's grounds filled in red, one at a
// time. ServiceAreas owns which airport is hovered and selected and where
// the map is looking; this draws them. Hovering a marker reports it back,
// so its pill lights up too, and clicking one selects it.
//
// Selecting an airport flies in close enough to see its runways. Going
// from one airport to another zooms out to the whole Valley first, then in
// to the new one. Visitors who ask for less motion get jumps instead.
//
// Loaded only when the section nears the screen (see ServiceAreas), so
// MapLibre and its tiles cost nothing until then.

import { useEffect, useRef } from "react";
// The CSP build loads its worker from a separate file, which the bundler
// copies as is. The default build makes the worker from its own code, and
// the bundler's rewrite of that code breaks it ("_wrap_native_super is not
// defined").
import maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-csp-worker.js", import.meta.url).href,
);
import {
  SERVICE_AIRPORTS,
  SERVICE_AREA_BOUNDS,
  SERVICE_AREA_MAP_STYLE,
  AIRPORT_GROUNDS_GEOJSON,
} from "@/lib/serviceAreas";
import styles from "./ServiceAreas.module.css";

type Props = {
  hovered: string | null;
  /** The airport whose grounds are red. */
  selected: string;
  /** Where to look: an airport, or the whole Valley (null). */
  focus: string | null;
  /** Goes up with each request to move, so a repeat still moves. */
  moves: number;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  /** The "show everything" button. */
  onReset: () => void;
};

const ACCENT = "#d0311e";

const PLANE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';

/** How close to come in on an airport: enough to see its runways. */
const AIRPORT_ZOOM = { commercial: 13, private: 13.75 } as const;

/** A little further out on a phone-sized map, so the grounds fit. */
const zoomFor = (kind: keyof typeof AIRPORT_ZOOM, el: HTMLElement | null) =>
  AIRPORT_ZOOM[kind] - ((el?.clientWidth ?? 800) < 600 ? 0.9 : 0);

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Room around the Valley when we fit it to the map. */
const paddingFor = (el: HTMLElement | null) =>
  (el?.clientWidth ?? 800) < 500 ? 36 : 72;

export default function ServiceAreaMap({
  hovered,
  selected,
  focus,
  moves,
  onHover,
  onSelect,
  onReset,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, HTMLElement>>({});
  const readyRef = useRef(false);
  // Where the map opened (ServiceAreas starts on Sky Harbor).
  const prevFocusRef = useRef<string | null>(focus);
  const moveRef = useRef(0);
  // The latest props, for the map's own event handlers.
  const latest = useRef({ hovered, selected, onHover, onSelect });

  useEffect(() => {
    latest.current = { hovered, selected, onHover, onSelect };
  });

  // ── The selected airport's grounds, and the markers' classes ──
  const paint = () => {
    const { hovered: h, selected: sel } = latest.current;
    for (const a of SERVICE_AIRPORTS) {
      const el = markersRef.current[a.slug];
      if (el) {
        el.classList.toggle(styles.airportHover, a.slug === h);
        el.classList.toggle(styles.airportSelected, a.slug === sel);
      }
      const map = mapRef.current;
      if (map && readyRef.current) {
        map.setFeatureState(
          { source: "grounds", id: a.slug },
          { selected: a.slug === sel },
        );
      }
    }
  };

  // ── Set up the map once ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    // Open on the airport in focus, or the whole Valley.
    const start = SERVICE_AIRPORTS.find((a) => a.slug === prevFocusRef.current);
    const map = new maplibregl.Map({
      container: el,
      style: SERVICE_AREA_MAP_STYLE,
      ...(start
        ? { center: [start.lng, start.lat], zoom: zoomFor(start.kind, el) }
        : {
            bounds: SERVICE_AREA_BOUNDS,
            fitBoundsOptions: { padding: paddingFor(el) },
          }),
      attributionControl: false,
      // Scrolling the page past the map shouldn't zoom it; two fingers
      // (or Ctrl + scroll) move it.
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );
    mapRef.current = map;

    // Zoomed out to the whole Valley the cards are smaller. On a phone-sized
    // map they're just the planes, and the code shows on the one that's
    // hovered or selected.
    const sizeMarkers = () => {
      const z = map.getZoom();
      el.classList.toggle(styles.compact, z < 10);
      el.classList.toggle(styles.tiny, el.clientWidth < 600 && z < 9.5);
    };
    sizeMarkers();
    map.on("zoom", sizeMarkers);
    map.on("resize", sizeMarkers);

    const choose = (slug: string) => latest.current.onSelect(slug);

    // One marker per airport: the plane on the airport, its code and name
    // above, and a link to its page once it's selected.
    const markers = SERVICE_AIRPORTS.map((a) => {
      const m = document.createElement("div");
      m.className = `${styles.airport} ${a.kind === "private" ? styles.airportPrivate : ""}`;
      m.setAttribute("aria-hidden", "true");

      const card = document.createElement("button");
      card.type = "button";
      card.tabIndex = -1;
      card.className = styles.airportCard;
      card.innerHTML = `<strong>${a.code}</strong><span>${a.name}</span>`;

      const link = document.createElement("a");
      link.href = a.href;
      link.tabIndex = -1;
      link.className = styles.airportLink;
      link.textContent =
        a.kind === "private" ? "Private aviation →" : `${a.code} guide →`;
      link.addEventListener("click", (e) => e.stopPropagation());

      const dot = document.createElement("span");
      dot.className = styles.airportDot;
      dot.innerHTML = PLANE_SVG;

      m.append(link, card, dot);
      m.addEventListener("click", (e) => {
        e.stopPropagation();
        choose(a.slug);
      });
      m.addEventListener("mouseenter", () => latest.current.onHover(a.slug));
      m.addEventListener("mouseleave", () => latest.current.onHover(null));
      markersRef.current[a.slug] = m;

      // The plane sits on the airport; the card stacks above it.
      return new maplibregl.Marker({
        element: m,
        anchor: "bottom",
        offset: [0, 18],
      })
        .setLngLat([a.lng, a.lat])
        .addTo(map);
    });
    paint();

    const data = fetch(AIRPORT_GROUNDS_GEOJSON).then((r) => r.json());

    // The airports' grounds, under the map's own labels. Only the selected
    // one shows: filled in red with a red edge.
    map.on("load", async () => {
      const geo = (await data) as GeoJSON.FeatureCollection;
      if (cancelled) return;
      const firstSymbol = map
        .getStyle()
        .layers.find((l) => l.type === "symbol")?.id;
      map.addSource("grounds", {
        type: "geojson",
        data: geo,
        promoteId: "slug",
      });
      map.addLayer(
        {
          id: "grounds-fill",
          type: "fill",
          source: "grounds",
          paint: {
            "fill-color": ACCENT,
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.3,
              0,
            ],
            "fill-opacity-transition": { duration: 300 },
          },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: "grounds-line",
          type: "line",
          source: "grounds",
          paint: {
            "line-color": ACCENT,
            "line-width": 2,
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.9,
              0,
            ],
          },
        },
        firstSymbol,
      );
      readyRef.current = true;
      paint();
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      markers.forEach((m) => m.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Hover and selection: restyle ──
  useEffect(() => {
    paint();
  }, [hovered, selected]);

  // ── Focus: move the camera ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || moves === 0) return;
    const prev = prevFocusRef.current;
    prevFocusRef.current = focus;

    const move = ++moveRef.current;
    const instant = reducedMotion();
    const padding = paddingFor(containerRef.current);

    const goTo = () => {
      if (move !== moveRef.current) return;
      const a = SERVICE_AIRPORTS.find((x) => x.slug === focus);
      if (!a) {
        map.fitBounds(SERVICE_AREA_BOUNDS, {
          padding,
          duration: instant ? 0 : 1000,
        });
        return;
      }
      map.flyTo({
        center: [a.lng, a.lat],
        zoom: zoomFor(a.kind, containerRef.current),
        duration: instant ? 0 : 1300,
        essential: true,
      });
    };

    // From one airport to another: out to the whole Valley, then in.
    if (prev !== null && focus !== null && prev !== focus && !instant) {
      map.fitBounds(SERVICE_AREA_BOUNDS, { padding, duration: 700 });
      let done = false;
      const next = () => {
        if (done) return;
        done = true;
        goTo();
      };
      map.once("moveend", next);
      const t = setTimeout(next, 900);
      return () => clearTimeout(t);
    }
    goTo();
    // Moves when asked to (moves), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves]);

  const zoom = (by: 1 | -1) => {
    const map = mapRef.current;
    if (!map) return;
    const duration = reducedMotion() ? 0 : 300;
    if (by > 0) map.zoomIn({ duration });
    else map.zoomOut({ duration });
  };

  // Back to the whole Valley (ServiceAreas selects Sky Harbor again).
  const reset = () => onReset();

  return (
    <>
      <div
        ref={containerRef}
        className={styles.map}
        role='region'
        aria-label='Map of the airports we serve'
      />
      <div className={styles.controls}>
        <button
          type='button'
          className={styles.control}
          onClick={() => zoom(1)}
          aria-label='Zoom in'
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M12 5v14M5 12h14' />
          </svg>
        </button>
        <button
          type='button'
          className={styles.control}
          onClick={() => zoom(-1)}
          aria-label='Zoom out'
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M5 12h14' />
          </svg>
        </button>
        <button
          type='button'
          className={styles.control}
          onClick={reset}
          aria-label='Show all airports'
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <circle cx='12' cy='12' r='3' />
            <path d='M12 2v3M12 19v3M2 12h3M19 12h3' />
          </svg>
        </button>
      </div>
    </>
  );
}
