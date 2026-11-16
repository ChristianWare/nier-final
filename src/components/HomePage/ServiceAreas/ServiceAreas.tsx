"use client";

// Where we serve: a map of the airports we serve (three commercial, three
// private aviation) over a faint outline of the cities we cover, beside a
// pill for each airport. Hovering a pill (or a marker on the map) lights it
// up on both; clicking one zooms the map to it, and clicking another zooms
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
  const [selected, setSelected] = useState<string | null>(null);
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

  const toggle = (slug: string) =>
    setSelected((s) => (s === slug ? null : slug));
  const leave = (slug: string) => setHovered((h) => (h === slug ? null : h));
  const selectedAirport = SERVICE_AIRPORTS.find((a) => a.slug === selected);

  return (
    <section className={styles.container} aria-labelledby='areas-heading'>
      <LayoutWrapper>
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.intro}`}>
            <SectionHeading text='Where we serve' dot />
            <h2 id='areas-heading' className={`${styles.heading} h2`}>
              Proudly serving Phoenix &amp;{" "}
              <span className={styles.headingAccent}>the whole Valley.</span>
            </h2>
            <p className={styles.copy}>
              No matter where you are in the Phoenix area, Nier Transportation
              is ready to get you there, from Sky Harbor and Mesa Gateway to the
              private jet terminals at Scottsdale, Deer Valley, Falcon Field and
              Goodyear. Hover an airport to find it on the map, or select it to
              zoom in.
            </p>
          </div>

          <div ref={mapCardRef} className={styles.mapCard}>
            {showMap ? (
              <ServiceAreaMap
                hovered={hovered}
                selected={selected}
                onHover={setHovered}
                onSelect={setSelected}
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
                          onClick={() => toggle(a.slug)}
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
              {selectedAirport ? (
                <Button
                  href={selectedAirport.href}
                  text={
                    selectedAirport.kind === "private"
                      ? "Private aviation pickups"
                      : `${selectedAirport.name} guide`
                  }
                  btnType='underlinedBlack'
                  arrow
                />
              ) : (
                <Button
                  href='/locations'
                  text='See all locations'
                  btnType='underlinedBlack'
                  arrow
                />
              )}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
