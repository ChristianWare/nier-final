"use client";

import LayoutWrapper from "../LayoutWrapper";
import styles from "./Testimonials.module.css";
import { useMemo, useState } from "react";
import { reviews } from "@/lib/data";
import StarCluster from "../StarCluster/StarCluster";
import Stats from "../Stats/Stats";

export default function Testimonials() {
  const items = useMemo(() => reviews.slice(0, 4), []);
  const [activeId, setActiveId] = useState(items[0]?.id);

  const activeReview = useMemo(
    () => items.find((r) => r.id === activeId) ?? items[0],
    [items, activeId]
  );

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.heading}>
              Real impact. <br />
              Proven results.
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.left}>
              {items.map((x) => (
                <button
                  key={x.id}
                  type='button'
                  className={`${styles.card} ${
                    x.id === activeId ? styles.cardActive : ""
                  }`}
                  onClick={() => setActiveId(x.id)}
                >
                  <div className='h4'>{x.reviewer}</div>
                  <p className={styles.city}>{x.company}</p>
                </button>
              ))}
            </div>

            <div className={styles.right}>
              <div className={styles.rightTop}>
                <StarCluster />
              </div>

              <div className={styles.rightMiddle}>
                <h3 className='h3'>
                  &ldquo;{activeReview?.review ?? "Review"}&rdquo;
                </h3>
              </div>

              <div className={styles.rightBottom}>
                <Stats />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
