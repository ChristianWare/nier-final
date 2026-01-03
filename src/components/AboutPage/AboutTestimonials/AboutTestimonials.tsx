/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import styles from "./AboutTestimonials.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/Adam.jpg";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { reviews } from "@/lib/data";

const DURATION_MS = 450;

type Dir = "left" | "right";

export default function AboutTestimonials() {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<Dir>("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);

  const total = reviews.length;

  const idx = (i: number) => (i + total) % total;

  const cards = useMemo(
    () => [
      { kind: "prev2" as const, index: idx(currentReviewIndex - 2) },
      { kind: "prev" as const, index: idx(currentReviewIndex - 1) },
      { kind: "current" as const, index: idx(currentReviewIndex) },
      { kind: "next" as const, index: idx(currentReviewIndex + 1) },
      { kind: "next2" as const, index: idx(currentReviewIndex + 2) },
    ],
    [currentReviewIndex, total]
  );

  const nextReview = () => {
    if (isAnimating || total <= 1) return;
    setSlideDirection("right");
    setIsAnimating(true);
    setOffsetPx(-1);
    window.setTimeout(() => {
      setCurrentReviewIndex((prev) => idx(prev + 1));
      setIsAnimating(false);
      setOffsetPx(0);
    }, DURATION_MS);
  };

  const prevReview = () => {
    if (isAnimating || total <= 1) return;
    setSlideDirection("left");
    setIsAnimating(true);
    setOffsetPx(1);
    window.setTimeout(() => {
      setCurrentReviewIndex((prev) => idx(prev - 1));
      setIsAnimating(false);
      setOffsetPx(0);
    }, DURATION_MS);
  };

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <div className={styles.heading}>
            Real impact. <br />
            Proven results.
          </div>
        </div>
      </LayoutWrapper>

      <div className={styles.content}>
        <div className={styles.btnContainer}>
          <button onClick={prevReview} className={styles.arrowButton}>
            <Arrow className={styles.arrowLeft} />
          </button>
          <button onClick={nextReview} className={styles.arrowButton}>
            <Arrow className={styles.arrowRight} />
          </button>
        </div>

        <div className={styles.reviewContainer}>
          <div className={styles.reviewWrapper}>
            <div
              className={`${styles.track} ${
                isAnimating ? styles.animating : ""
              } ${slideDirection === "right" ? styles.dirRight : styles.dirLeft}`}
              style={
                {
                  ["--offsetStep" as any]: offsetPx,
                } as React.CSSProperties
              }
            >
              {cards.map(({ kind, index }) => {
                const isActive = kind === "current";
                return (
                  <div
                    key={`${kind}-${index}`}
                    className={`${styles.card} ${
                      isActive ? styles.activeCard : styles.sideCard
                    }`}
                    aria-hidden={!isActive}
                  >
                    <div className={styles.cardLeft}>
                      <div className={styles.personContianer}>
                        <div className={styles.pcLeft}>
                          <div className={styles.imgContainer}>
                            <Image
                              src={reviews[index].person || Img1}
                              alt=''
                              title=''
                              width={80}
                              height={80}
                              className={styles.img}
                            />
                          </div>
                        </div>
                        <div className={styles.pcRight}>
                          <p className={`${styles.reviewer} h4`}>
                            {reviews[index].reviewer}
                          </p>
                          <p className={styles.from}>From Germany</p>
                        </div>
                      </div>

                      <div className={`${styles.subHeading} h4`}>
                        &ldquo;Order fulfillment became faster, safer, and far
                        more predictable.&rdquo;
                      </div>

                      <p className={styles.review}>
                        &ldquo;{reviews[index].review}&rdquo;
                      </p>
                    </div>

                    <div className={styles.cardRight}>
                      <div className={styles.cardRightTop}>
                        <div className='h5'>View More Testimonials</div>
                      </div>
                      <div className={styles.cardRightBottom}>
                        <div className={styles.number}>41%</div>
                        <p className={styles.copy}>
                          Increase in order processing speed after robotics
                          deployment
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
