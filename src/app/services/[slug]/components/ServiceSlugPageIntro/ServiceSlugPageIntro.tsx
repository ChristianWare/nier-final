"use client";

import styles from "./ServiceSlugPageIntro.module.css";
// import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import type { ServiceShape as Service } from "@/lib/services"; // ← unify here

export default function ServiceSlugPageIntro({
  service,
}: {
  service: Service;
}) {
  if (!service) {
    return (
      <section className={styles.container}>
        {/* <LayoutWrapper> */}
          <div className={styles.container}>
            <h1 className={styles.heading}>Service not found</h1>
            <Link href='/services'>Back to services</Link>
          </div>
        {/* </LayoutWrapper> */}
      </section>
    );
  }

  return (
    <section className={styles.container}>
      {/* <LayoutWrapper> */}
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='service' dot />
            <h1 className={styles.heading}>{service.title}</h1>
            {/* <p className={styles.copy}>{service.copy}</p> */}
            {service.src && (
              <div className={styles.imgContainer}>
                <Image src={service.src} fill alt='' className={styles.img} />
              </div>
            )}
          </div>
        </div>
      {/* </LayoutWrapper> */}
    </section>
  );
}
