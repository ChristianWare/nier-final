"use client";

// Where we serve: a map of the airports we serve (three commercial, three
// private aviation) beside a pill for each. One airport is selected at a
// time, Sky Harbor to start, with the map in close: its grounds are filled
// in red and its marker and pill are red. Hovering a pill (or a marker) lights both up; clicking
// one selects it and zooms the map in to it, and clicking another zooms
// out and back in to that one.
//
// Above 1068px the map sits on the left with the intro and the pills
// stacked on the right. Below that it's intro, map, pills, top to bottom.
//
// The map (MapLibre, ServiceAreaMap) loads when the section nears the
// screen; until then the card shows a quiet placeholder.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { DEFAULT_AIRPORT } from "@/lib/serviceAreas";
import Logo from "@/components/shared/Logo/Logo";
import Plane from "@/components/shared/icons/Plane/Plane";
import { SERVICE_AIRPORTS } from "@/lib/serviceAreas";
import styles from "./ServiceAreas.module.css";

function MapPlaceholder() {
  return (
    <div className={styles.placeholder} aria-hidden='true'>
      <Logo className={styles.placeholderLogo} />
    </div>
  );
}

const ServiceAreaMap = dynamic(() => import("./ServiceAreaMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

const GROUPS = [
  {
    label: "Commercial",
    airports: SERVICE_AIRPORTS.filter((a) => a.kind === "commercial"),
  },
  {
    label: "Private aviation",
    airports: SERVICE_AIRPORTS.filter((a) => a.kind === "private"),
  },
];

export default function ServiceAreas() {
  const [hovered, setHovered] = useState<string | null>(null);
  // Always one airport selected. `focus` is where the map is looking: an
  // airport, or the whole Valley (null). It opens on Sky Harbor, close
  // enough to see its grounds in red. `moves` counts the requests, so
  // clicking the selected airport again still flies to it.
  const [selected, setSelected] = useState<string>(DEFAULT_AIRPORT);
  const [focus, setFocus] = useState<string | null>(DEFAULT_AIRPORT);
  const [moves, setMoves] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const mapCardRef = useRef<HTMLDivElement | null>(null);

  // Load the map once the section is within a screen or so.
  useEffect(() => {
    const el = mapCardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowMap(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const select = (slug: string) => {
    setSelected(slug);
    setFocus(slug);
    setMoves((n) => n + 1);
  };
  // Back to the whole Valley, with Sky Harbor selected again.
  const reset = () => {
    setSelected(DEFAULT_AIRPORT);
    setFocus(null);
    setMoves((n) => n + 1);
  };
  const leave = (slug: string) => setHovered((h) => (h === slug ? null : h));

  return (
    <section className={styles.container} aria-labelledby='areas-heading'>
      <LayoutWrapper>
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.intro}`}>
            <SectionHeading text='Airport service' dot />
            <h2 id='areas-heading' className={`${styles.heading} h2`}>
              Black car service at{" "}
              <span className={styles.headingAccent}>
                every Valley airport.
              </span>
            </h2>
            <p className={styles.copy}>
              From the terminals at Sky Harbor and Mesa Gateway to the private
              jet ramps at Scottsdale, Deer Valley, Falcon Field and Goodyear,
              your chauffeur is waiting when you land. Select an airport to zoom
              in.
            </p>
          </div>

          <div ref={mapCardRef} className={styles.mapCard}>
            {showMap ? (
              <ServiceAreaMap
                hovered={hovered}
                selected={selected}
                focus={focus}
                moves={moves}
                onHover={setHovered}
                onSelect={select}
                onReset={reset}
              />
            ) : (
              <MapPlaceholder />
            )}
          </div>

          <div className={`${styles.card} ${styles.areas}`}>
            <h3 className={`${styles.areasTitle} h5`}>Airports we serve</h3>
            {GROUPS.map((g) => (
              <div key={g.label} className={styles.group}>
                <p className={styles.groupLabel}>{g.label}</p>
                <ul className={styles.pills}>
                  {g.airports.map((a) => {
                    const isSelected = selected === a.slug;
                    return (
                      <li key={a.slug}>
                        <button
                          type='button'
                          className={`${styles.pill} ${
                            hovered === a.slug ? styles.pillHover : ""
                          } ${isSelected ? styles.pillSelected : ""}`}
                          aria-pressed={isSelected}
                          onClick={() => select(a.slug)}
                          onMouseEnter={() => setHovered(a.slug)}
                          onMouseLeave={() => leave(a.slug)}
                          onFocus={() => setHovered(a.slug)}
                          onBlur={() => leave(a.slug)}
                        >
                          <Plane
                            className={styles.pillIcon}
                            aria-hidden='true'
                          />
                          <span className={styles.pillText}>{a.name}</span>
                          <span className={styles.pillCode}>{a.code}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className={styles.actions}>
              <Button
                href='/airports'
                text='See all airports'
                btnType='black'
                arrow
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
