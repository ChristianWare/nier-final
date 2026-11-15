"use client";

// The service area map: the cities' limits over a light street map, a
// label on each and Sky Harbor as home base. ServiceAreas owns which city
// is hovered and which is selected; this draws them. Hovering a city here
// reports it back, so its pill lights up too, and clicking one selects it.
//
// Selecting a city flies to it. Going from one city to another zooms out
// to the whole Valley first, then in to the new one. Visitors who ask for
// less motion get jumps instead of flights.
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
  SERVICE_AREA_BOUNDS,
  SERVICE_AREA_CITIES,
  SERVICE_AREA_MAP_STYLE,
  SERVICE_AREAS_GEOJSON,
  SKY_HARBOR,
} from "@/lib/serviceAreas";
import styles from "./ServiceAreas.module.css";

type Bounds = [number, number, number, number];

type AreaProps = {
  slug: string;
  name: string;
  labelLng: number;
  labelLat: number;
  bbox: Bounds;
};

type Props = {
  hovered: string | null;
  selected: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
};

const ACCENT = "#d0311e";

const PIN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a8 8 0 0 0-8 8c0 5.4 6.1 10.9 7.4 12a1 1 0 0 0 1.2 0C13.9 20.9 20 15.4 20 10a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';

const PLANE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Room around a city when we fit it to the map. */
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
  const readyRef = useRef(false);
  const boundsRef = useRef<Record<string, Bounds>>({});
  const labelsRef = useRef<Record<string, HTMLElement>>({});
  const prevSelectedRef = useRef<string | null>(null);
  const moveRef = useRef(0);
  // The latest props, for the map's own event handlers.
  const latest = useRef({ hovered, selected, onHover, onSelect });

  useEffect(() => {
    latest.current = { hovered, selected, onHover, onSelect };
  });

  // ── Feature state and label classes: hover, selected, dimmed ──
  const paint = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const { hovered: h, selected: s } = latest.current;
    const anything = h !== null || s !== null;
    for (const c of SERVICE_AREA_CITIES) {
      const isHover = c.slug === h;
      const isSelected = c.slug === s;
      const dim = anything && !isHover && !isSelected;
      map.setFeatureState(
        { source: "areas", id: c.slug },
        { hover: isHover, selected: isSelected, dim },
      );
      const label = labelsRef.current[c.slug];
      if (label) {
        label.classList.toggle(styles.labelHover, isHover);
        label.classList.toggle(styles.labelSelected, isSelected);
        label.classList.toggle(styles.labelDim, dim);
      }
    }
    const home = labelsRef.current[SKY_HARBOR.slug];
    if (home) {
      home.classList.toggle(styles.homeActive, h === SKY_HARBOR.slug);
      home.classList.toggle(styles.homeSelected, s === SKY_HARBOR.slug);
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

    // Zoomed out to the whole Valley the labels are smaller, so
    // neighbours like Chandler and Gilbert don't run into each other. On a
    // phone-sized map they're just pins, and a name shows on the one that's
    // hovered or selected.
    const sizeLabels = () => {
      const z = map.getZoom();
      el.classList.toggle(styles.compact, z < 10);
      el.classList.toggle(styles.tiny, el.clientWidth < 600 && z < 9.5);
    };
    sizeLabels();
    map.on("zoom", sizeLabels);
    map.on("resize", sizeLabels);

    const toggle = (slug: string) =>
      latest.current.onSelect(latest.current.selected === slug ? null : slug);

    // Sky Harbor, home base: the plane on the airport, its name above.
    const home = document.createElement("div");
    home.className = styles.home;
    home.setAttribute("aria-hidden", "true");
    home.innerHTML = `<span class="${styles.homeDot}">${PLANE_SVG}</span><span class="${styles.homeCard}"><strong>${SKY_HARBOR.name}</strong><small>${SKY_HARBOR.sub}</small></span>`;
    home.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle(SKY_HARBOR.slug);
    });
    home.addEventListener("mouseenter", () =>
      latest.current.onHover(SKY_HARBOR.slug),
    );
    home.addEventListener("mouseleave", () => latest.current.onHover(null));
    labelsRef.current[SKY_HARBOR.slug] = home;
    const markers = [
      new maplibregl.Marker({
        element: home,
        anchor: "bottom",
        offset: [0, 20],
      })
        .setLngLat([SKY_HARBOR.lng, SKY_HARBOR.lat])
        .addTo(map),
    ];

    const data = fetch(SERVICE_AREAS_GEOJSON).then((r) => r.json());

    map.on("load", async () => {
      const geo = (await data) as GeoJSON.FeatureCollection;
      if (cancelled) return;

      // A label on each city, with a link to its page once it's selected.
      for (const f of geo.features) {
        const p = f.properties as AreaProps;
        boundsRef.current[p.slug] = p.bbox;

        const label = document.createElement("div");
        label.className = styles.label;
        label.setAttribute("aria-hidden", "true");
        const name = document.createElement("button");
        name.type = "button";
        name.tabIndex = -1;
        name.className = styles.labelName;
        name.innerHTML = `${PIN_SVG}<span>${p.name}</span>`;
        name.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle(p.slug);
        });
        const link = document.createElement("a");
        link.href = `/locations/${p.slug}`;
        link.tabIndex = -1;
        link.className = styles.labelLink;
        link.textContent = `See ${p.name} →`;
        link.addEventListener("click", (e) => e.stopPropagation());
        label.append(name, link);
        label.addEventListener("mouseenter", () =>
          latest.current.onHover(p.slug),
        );
        label.addEventListener("mouseleave", () =>
          latest.current.onHover(null),
        );
        labelsRef.current[p.slug] = label;
        markers.push(
          new maplibregl.Marker({ element: label, anchor: "center" })
            .setLngLat([p.labelLng, p.labelLat])
            .addTo(map),
        );
      }

      // The outlines go under the map's own labels (roads, places).
      const firstSymbol = map
        .getStyle()
        .layers.find((l) => l.type === "symbol")?.id;
      map.addSource("areas", { type: "geojson", data: geo, promoteId: "slug" });
      map.addLayer(
        {
          id: "areas-fill",
          type: "fill",
          source: "areas",
          paint: {
            "fill-color": ACCENT,
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.34,
              ["boolean", ["feature-state", "hover"], false],
              0.3,
              ["boolean", ["feature-state", "dim"], false],
              0.05,
              0.14,
            ],
            "fill-opacity-transition": { duration: 200 },
          },
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
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              2.5,
              ["boolean", ["feature-state", "hover"], false],
              2,
              1,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "dim"], false],
              0.3,
              0.85,
            ],
          },
        },
        firstSymbol,
      );

      map.on("mousemove", "areas-fill", (e) => {
        const slug = e.features?.[0]?.properties?.slug as string | undefined;
        map.getCanvas().style.cursor = "pointer";
        if (slug && slug !== latest.current.hovered)
          latest.current.onHover(slug);
      });
      map.on("mouseleave", "areas-fill", () => {
        map.getCanvas().style.cursor = "";
        latest.current.onHover(null);
      });
      map.on("click", "areas-fill", (e) => {
        const slug = e.features?.[0]?.properties?.slug as string | undefined;
        if (slug) toggle(slug);
      });

      readyRef.current = true;
      paint();
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      markers.forEach((m) => m.remove());
      labelsRef.current = {};
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
      if (selected === null) {
        map.fitBounds(SERVICE_AREA_BOUNDS, {
          padding,
          duration: instant ? 0 : 1000,
        });
      } else if (selected === SKY_HARBOR.slug) {
        map.flyTo({
          center: [SKY_HARBOR.lng, SKY_HARBOR.lat],
          zoom: 12.5,
          duration: instant ? 0 : 1200,
          essential: true,
        });
      } else {
        const b = boundsRef.current[selected];
        if (b)
          map.fitBounds(b, {
            padding,
            maxZoom: 13,
            duration: instant ? 0 : 1200,
          });
      }
    };

    // From one place to another: out to the whole Valley, then in.
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
        aria-label='Map of the cities we serve'
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
          aria-label='Show all cities'
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
