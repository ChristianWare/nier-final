"use client";

// The service area map: the airports we serve, each a plane marker with its
// code and name, over a faint outline of the cities we cover. ServiceAreas
// owns which airport is hovered and which is selected; this draws them.
// Hovering a marker reports it back, so its pill lights up too, and
// clicking one selects it.
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
  SERVICE_AREAS_GEOJSON,
} from "@/lib/serviceAreas";
import styles from "./ServiceAreas.module.css";

type Props = {
  hovered: string | null;
  selected: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
};

const ACCENT = "#d0311e";

const PLANE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';

/** How close to come in on an airport: enough to see its runways. */
const AIRPORT_ZOOM = { commercial: 13, private: 13.75 } as const;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Room around the Valley when we fit it to the map. */
const paddingFor = (el: HTMLElement | null) =>
  (el?.clientWidth ?? 800) < 500 ? 36 : 72;

export default function ServiceAreaMap({
  hovered,
  selected,
  onHover,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, HTMLElement>>({});
  const prevSelectedRef = useRef<string | null>(null);
  const moveRef = useRef(0);
  // The latest props, for the map's own event handlers.
  const latest = useRef({ hovered, selected, onHover, onSelect });

  useEffect(() => {
    latest.current = { hovered, selected, onHover, onSelect };
  });

  // ── Marker classes: hover, selected, dimmed ──
  const paint = () => {
    const { hovered: h, selected: s } = latest.current;
    const anything = h !== null || s !== null;
    for (const a of SERVICE_AIRPORTS) {
      const el = markersRef.current[a.slug];
      if (!el) continue;
      const isHover = a.slug === h;
      const isSelected = a.slug === s;
      el.classList.toggle(styles.airportHover, isHover);
      el.classList.toggle(styles.airportSelected, isSelected);
      el.classList.toggle(
        styles.airportDim,
        anything && !isHover && !isSelected,
      );
    }
  };

  // ── Set up the map once ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    const map = new maplibregl.Map({
      container: el,
      style: SERVICE_AREA_MAP_STYLE,
      bounds: SERVICE_AREA_BOUNDS,
      fitBoundsOptions: { padding: paddingFor(el) },
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

    const toggle = (slug: string) =>
      latest.current.onSelect(latest.current.selected === slug ? null : slug);

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
        toggle(a.slug);
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

    const data = fetch(SERVICE_AREAS_GEOJSON).then((r) => r.json());

    // The cities, faintly, under the map's own labels: just where we cover.
    map.on("load", async () => {
      const geo = (await data) as GeoJSON.FeatureCollection;
      if (cancelled) return;
      const firstSymbol = map
        .getStyle()
        .layers.find((l) => l.type === "symbol")?.id;
      map.addSource("areas", { type: "geojson", data: geo });
      map.addLayer(
        {
          id: "areas-fill",
          type: "fill",
          source: "areas",
          paint: { "fill-color": ACCENT, "fill-opacity": 0.07 },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: "areas-line",
          type: "line",
          source: "areas",
          paint: {
            "line-color": ACCENT,
            "line-width": 0.75,
            "line-opacity": 0.35,
          },
        },
        firstSymbol,
      );
    });

    return () => {
      cancelled = true;
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

  // ── Selection: move the camera ──
  useEffect(() => {
    const map = mapRef.current;
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selected;
    if (!map || prev === selected) return;

    const move = ++moveRef.current;
    const instant = reducedMotion();
    const padding = paddingFor(containerRef.current);

    const goTo = () => {
      if (move !== moveRef.current) return;
      const a = SERVICE_AIRPORTS.find((x) => x.slug === selected);
      if (!a) {
        map.fitBounds(SERVICE_AREA_BOUNDS, {
          padding,
          duration: instant ? 0 : 1000,
        });
        return;
      }
      map.flyTo({
        center: [a.lng, a.lat],
        zoom: AIRPORT_ZOOM[a.kind],
        duration: instant ? 0 : 1300,
        essential: true,
      });
    };

    // From one airport to another: out to the whole Valley, then in.
    if (prev !== null && selected !== null && !instant) {
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
  }, [selected]);

  const zoom = (by: 1 | -1) => {
    const map = mapRef.current;
    if (!map) return;
    const duration = reducedMotion() ? 0 : 300;
    if (by > 0) map.zoomIn({ duration });
    else map.zoomOut({ duration });
  };

  const reset = () => {
    if (latest.current.selected !== null) {
      onSelect(null);
      return;
    }
    mapRef.current?.fitBounds(SERVICE_AREA_BOUNDS, {
      padding: paddingFor(containerRef.current),
      duration: reducedMotion() ? 0 : 800,
    });
  };

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
