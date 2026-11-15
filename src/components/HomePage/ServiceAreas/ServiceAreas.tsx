"use client";

// Where we serve: a map of the cities beside a pill for each. Hovering a
// pill (or a city on the map) lights it up on both; clicking one zooms the
// map to it, and clicking another zooms out and back in to that one. Sky
// Harbor is home base, with its own pill and marker.
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
import Location from "@/components/shared/icons/Location/Location";
import Plane from "@/components/shared/icons/Plane/Plane";
import { SERVICE_AREA_CITIES, SKY_HARBOR } from "@/lib/serviceAreas";
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

const PILLS = [
  { slug: SKY_HARBOR.slug, name: SKY_HARBOR.name, home: true },
  ...SERVICE_AREA_CITIES.map((c) => ({ ...c, home: false })),
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
  const selectedCity = SERVICE_AREA_CITIES.find((c) => c.slug === selected);

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
              is ready to get you there, from Sky Harbor to Surprise in the west
              and Gilbert in the east. Hover a city to find it on the map, or
              select it to zoom in.
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
            <h3 className={`${styles.areasTitle} h5`}>Areas we serve</h3>
            <ul className={styles.pills}>
              {PILLS.map((p) => {
                const isSelected = selected === p.slug;
                const Icon = p.home ? Plane : Location;
                return (
                  <li key={p.slug}>
                    <button
                      type='button'
                      className={`${styles.pill} ${p.home ? styles.pillHome : ""} ${
                        hovered === p.slug ? styles.pillHover : ""
                      } ${isSelected ? styles.pillSelected : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggle(p.slug)}
                      onMouseEnter={() => setHovered(p.slug)}
                      onMouseLeave={() => leave(p.slug)}
                      onFocus={() => setHovered(p.slug)}
                      onBlur={() => leave(p.slug)}
                    >
                      <Icon className={styles.pillIcon} aria-hidden='true' />
                      <span className={styles.pillText}>{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className={styles.actions}>
              {selectedCity ? (
                <Button
                  href={`/locations/${selectedCity.slug}`}
                  text={`Black car service in ${selectedCity.name}`}
                  btnType='underlinedBlack'
                  arrow
                />
              ) : null}
              <Button
                href='/locations'
                text='See all locations'
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
