"use client";

import LayoutWrapper from "../LayoutWrapper";
import styles from "./Testimonials.module.css";
import { useState, useEffect } from "react";
import { reviews } from "@/lib/data";
import StarCluster from "../StarCluster/StarCluster";

export default function Testimonials() {
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
              {reviews.slice(0, 4).map((x) => (
                <div className={styles.card} key={x.id}>
                  <div className='h4'>{x.reviewer}</div>
                  <p className={styles.city}>{x.company}</p>
                </div>
              ))}
            </div>
            <div className={styles.right}>
              <StarCluster />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
