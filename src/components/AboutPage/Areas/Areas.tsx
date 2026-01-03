/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image, { StaticImageData } from "next/image";
import styles from "./Areas.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import ImgScottsdale from "../../../../public/images/scottsdaleii.jpg";
import ImgPhoenix from "../../../../public/images/phoenixii.jpg";
import ImgMesa from "../../../../public/images/mesaii.jpg";
import ImgTempe from "../../../../public/images/tempe.jpg";
import ImgWestValley from "../../../../public/images/westValleyiii.jpg";
import ImgCasaGrande from "../../../../public/images/casaGrandeii.jpg";
import ImgMaricopa from "../../../../public/images/maricopaii.jpg";
import Chandler from "../../../../public/images/chandler.jpg";
import Gilbert from "../../../../public/images/gilbert.webp";
import Tucson from "../../../../public/images/tucson.webp";
import Flagstaff from "../../../../public/images/flagstaff.jpg";
import Yuma from "../../../../public/images/yuma.jpg";
import Prescott from "../../../../public/images/prescott.webp";
import Lake from "../../../../public/images/lake.jpg";
import Sedona from "../../../../public/images/sedona.jpg";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

type Specialty = {
  id: number;
  feature: string;
  desc: string;
  src: StaticImageData;
};

const specialties: readonly Specialty[] = [
  {
    id: 1,
    feature: "Scottsdale",
    desc: "Scottsdale is known for its vibrant arts scene, upscale shopping, and stunning desert landscapes.",
    src: ImgScottsdale,
  },
  {
    id: 2,
    feature: "Phoenix",
    desc: "The state's capital and largest city, offering a diverse cultural scene, desert botanical gardens, and outdoor adventures.",
    src: ImgPhoenix,
  },
  {
    id: 3,
    feature: "Mesa",
    desc: "Mesa boasts a rich history, with the Mesa Arts Center and a thriving downtown area, making it a hub for arts and culture.",
    src: ImgMesa,
  },
  {
    id: 4,
    feature: "Tempe",
    desc: "Home to Arizona State University, combines a lively college atmosphere with recreation along Tempe Town Lake.",
    src: ImgTempe,
  },
  {
    id: 5,
    feature: "West Valley",
    desc: "Avondale, Goodyear, Buckeye, Surprise, Glendale, Tolleson, and Peoria—suburban living with easy recreation.",
    src: ImgWestValley,
  },
  {
    id: 6,
    feature: "Casa Grande",
    desc: "Casa Grande, home of Lucid Motors, features the Casa Grande Ruins National Monument and a welcoming community.",
    src: ImgCasaGrande,
  },
  {
    id: 7,
    feature: "Maricopa",
    desc: "Maricopa is a fast‑growing, family‑friendly city set against the natural beauty of the Sonoran Desert.",
    src: ImgMaricopa,
  },
  {
    id: 8,
    feature: "Chandler",
    desc: "A growing tech and business center with family neighborhoods, parks, and a lively downtown.",
    src: Chandler,
  },
  {
    id: 9,
    feature: "Gilbert",
    desc: "Known for excellent schools, family-friendly suburbs, and a charming downtown light rail corridor.",
    src: Gilbert,
  },
  {
    id: 10,
    feature: "Tucson",
    desc: "Southern Arizona's cultural hub with a rich history, the University of Arizona, and desert scenery.",
    src: Tucson,
  },
  {
    id: 11,
    feature: "Flagstaff",
    desc: "A mountain town near the Grand Canyon with outdoor recreation, skiing, and a cool pine-forest climate.",
    src: Flagstaff,
  },
  {
    id: 12,
    feature: "Yuma",
    desc: "Southwestern city on the Colorado River, known for winter sunshine, agriculture, and historic sites.",
    src: Yuma,
  },
  {
    id: 13,
    feature: "Prescott",
    desc: "Historic downtown, Whiskey Row, and access to forests and lakes make Prescott a popular mountain escape.",
    src: Prescott,
  },
  {
    id: 14,
    feature: "Lake Havasu City",
    desc: "Famous for its lake recreation, boating, and the London Bridge attraction.",
    src: Lake,
  },
  {
    id: 15,
    feature: "Sedona",
    desc: "Renowned for red-rock formations, hiking, vortex sites, and a thriving arts community.",
    src: Sedona,
  },
] as const;

export default function Areas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set([0]));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ticking = useRef(false);

  const measure = useCallback(() => {
    const mid = window.innerHeight * 0.5;

    let bestIdx = 0;
    let bestDist = Infinity;
    const nextVisible = new Set<number>();

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();

      const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;
      if (isVisible) nextVisible.add(idx);

      const center = rect.top + rect.height * 0.5;
      const dist = Math.abs(center - mid);

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    setVisibleSet(nextVisible);
    setActiveIndex((prev) => (prev !== bestIdx ? bestIdx : prev));
  }, []);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      measure();
      ticking.current = false;
    });
  }, [measure]);

  useEffect(() => {
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll, measure]);

  return (
      <section className={styles.container}>
    <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.sectionHeadingContainer}>
              <SectionHeading text='Areas we serve' dot />
            </div>

            <h2 className={`${styles.heading} `}>
              Serving the <br /> Phoenix metropolitan area
            </h2>

            <div className={styles.imgContainer}>
              <div className={styles.imageStack}>
                {specialties.map((s, idx) => (
                  <Image
                    key={s.id}
                    src={s.src}
                    alt={s.feature}
                    className={`${styles.imgLayer} ${
                      idx === activeIndex ? styles.visible : ""
                    }`}
                    fill
                    priority={idx === 0}
                    quality={100}
                    sizes='(max-width: 768px) 100vw, 40vw'
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.mapDataBox}>
              {specialties.map((x, idx) => {
                const isActive = idx === activeIndex;
                const depthBehind = Math.max(0, activeIndex - idx);
                const PEEK_STEP = 5;
                const translateY =
                  idx <= activeIndex ? `-${depthBehind * PEEK_STEP}%` : "0%";
                const opacityBehind = Math.max(0.1, 1 - depthBehind * 0.1);
                const scaleBehind = 1 - Math.min(depthBehind, 8) * 0.04;
                const enteringOpacity =
                  idx > activeIndex && !visibleSet.has(idx) ? 0 : undefined;

                return (
                  <div
                    key={x.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    data-index={idx}
                    className={`${styles.card} ${isActive ? styles.isActive : styles.isInactive}`}
                    style={{
                      zIndex: isActive ? 1000 : idx + 1,
                      opacity:
                        enteringOpacity !== undefined
                          ? enteringOpacity
                          : opacityBehind,
                      transform: `translateY(${translateY}) scale(${
                        idx <= activeIndex ? scaleBehind : 1
                      })`,
                      willChange: "opacity, transform",
                    }}
                  >
                    <span className={styles.blackDot} />
                    <div className={styles.cardLeft}>
                      <span className={styles.id}>
                        {x.id.toString().padStart(2, "0")}.
                      </span>
                      <div className={styles.imgContainerii}>
                        <Image
                          src={x.src}
                          alt={x.feature}
                          fill
                          quality={100}
                          sizes='(max-width: 768px) 100vw, 100vw'
                          className={styles.imgSingle}
                        />
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <h4 className={styles.feature}>{x.feature}</h4>
                      <p className={styles.desc}>{x.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </LayoutWrapper>
      </section>
  );
}
