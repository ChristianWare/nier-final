/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import styles from "./ServicesMarquee.module.css";
import Image from "next/image";
import Link from "next/link";
import { servicesData as services } from "@/lib/services";
import { StaticImageData } from "next/image";
import SectionHeading from "../SectionHeading/SectionHeading";
import LayoutWrapper from "../LayoutWrapper";
import Button from "../Button/Button";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ServicesMarquee() {
  const items = [...services, ...services];

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set([0]));
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const ticking = useRef(false);

  const measure = useCallback(() => {
    const mid = window.innerHeight * 0.5;
    let bestIdx = 0;
    let bestDist = Infinity;
    const nextVisible = new Set<number>();

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= 0 && rect.top <= window.innerHeight)
        nextVisible.add(idx);
      const dist = Math.abs(rect.top + rect.height * 0.5 - mid);
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
    <div className={styles.slider}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Services' dot />
          <h2 className={styles.heading}>
            Core services we offer
            <br className={styles.break} /> at Nier Transportation
          </h2>
        </div>
      </LayoutWrapper>

      {/* ── Desktop: marquee ── */}
      <div className={styles.track}>
        {items.map((service, index) => (
          <Link
            key={`${service.slug}-${index}`}
            href={`/services/${service.slug}`}
            className={styles.card}
          >
            <Image
              src={service.src as StaticImageData}
              alt={service.title}
              fill
              className={styles.img}
              sizes='(max-width: 768px) 100vw, 320px'
              priority={index < 4}
            />
            <div className={styles.overlay} aria-hidden='true' />
            <div className={styles.cardTop}>
              <div className={styles.cardTopRow}>
                <div className={styles.numberBlock}>
                  <span className={styles.serviceNum}>
                    {String(service.id).padStart(2, "0")}
                  </span>
                  <span className={styles.serviceUnit}>svc</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardTitle}>{service.title}</span>
                  <span className={styles.cardSubtitle}>
                    {service.features[0].title}
                  </span>
                </div>
                <div className={styles.dots} aria-hidden='true'>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className={styles.divider} />
            </div>
            {/* <div className={styles.cardBottom}>
              <p className={styles.cardCopy}>{service.copy}</p>
            </div> */}
          </Link>
        ))}
      </div>

      {/* ── Mobile: same cards, stacking scroll ── */}
      <div className={styles.mobileStack}>
        {services.map((service, idx) => {
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
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className={styles.card}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              style={{
                position: "sticky",
                top: "80px",
                zIndex: isActive ? 1000 : idx + 1,
                opacity:
                  enteringOpacity !== undefined
                    ? enteringOpacity
                    : opacityBehind,
                transform: `translateY(${translateY}) scale(${idx <= activeIndex ? scaleBehind : 1})`,
                willChange: "opacity, transform",
                marginBottom: "1rem",
                transformOrigin: "center top",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              <Image
                src={service.src as StaticImageData}
                alt={service.title}
                fill
                className={styles.img}
                sizes='100vw'
                priority={idx === 0}
              />
              <div className={styles.overlay} aria-hidden='true' />
              <div className={styles.cardTop}>
                <div className={styles.cardTopRow}>
                  <div className={styles.numberBlock}>
                    <span className={styles.serviceNum}>
                      {String(service.id).padStart(2, "0")}
                    </span>
                    <span className={styles.serviceUnit}>svc</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardTitle}>{service.title}</span>
                    <span className={styles.cardSubtitle}>
                      {service.features[0].title}
                    </span>
                  </div>
                  <div className={styles.dots} aria-hidden='true'>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className={styles.divider} />
              </div>
              {/* <div className={styles.cardBottom}>
                <p className={styles.cardCopy}>{service.copy}</p>
              </div> */}
            </Link>
          );
        })}
      </div>

      <div className={styles.btnClusterContainer}>
        <Button
          href='/services'
          text='See All Services'
          btnType='black'
          arrow
        />
      </div>
    </div>
  );
}
