/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./FleetSlugPageIntro.module.css";
import Image from "next/image";
import Button from "@/components/shared/Button/Button";
import type { Vehicle } from "@/lib/types/fleet";
import ImgFallback from "../../../../../../public/images/vip.jpg";

export default function FleetSlugPageIntro({ vehicle }: { vehicle: Vehicle }) {
  const heroImg =
    (vehicle.images?.[0]?.src as any) || (vehicle.src as any) || ImgFallback;
  const heroAlt = vehicle.images?.[0]?.alt ?? vehicle.title;
  const lead = vehicle.shortDesc ?? vehicle.desc ?? vehicle.longDesc ?? "";

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.imgContainer}>
              <Image src={heroImg} alt={heroAlt} fill className={styles.img} />
            </div>
          </div>
          <div className={styles.right}>
            <h1 className={styles.heading}>{vehicle.title}</h1>
            <p className={styles.copy}>{lead}</p>
            <article className={styles.section}>
              <ul className={styles.list}>
                {(vehicle.bestFor && vehicle.bestFor.length > 0
                  ? vehicle.bestFor
                  : ["General travel"]
                ).map((item, i) => (
                  <li key={i} className={styles.listItem}>
                    <span className={styles.dot} aria-hidden='true' />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <div className={styles.btnContainer}>
              <Button href='/' text='Book your ride' btnType='black' arrow />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
