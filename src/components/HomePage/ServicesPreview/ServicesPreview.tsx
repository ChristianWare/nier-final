"use client";

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServicesPreview.module.css";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";
import { services } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { usePathname } from "next/navigation";

export default function ServicesPreview() {
  const pathname = usePathname();

  const servicesMap = pathname === "/" ? services.slice(0, 3) : services;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Services' dot />

            <h2 className={styles.heading}>
              Core services we offer
              <br className={styles.break} /> at Nier Transporttion
            </h2>
          </div>
          <div className={styles.bottom}>
            {servicesMap.map((x) => (
              <div key={x.id} className={styles.card}>
                <div className={styles.titleDescBox}>
                  <div className={styles.idTitleBox}>
                    <div className={styles.idBox}>
                      <span className={styles.id}>{x.id}</span>
                    </div>
                    <h3 className={`${styles.title} h5`}>{x.title}</h3>
                  </div>
                  <p className={styles.desc}>{x.copy}</p>
                </div>
                <div className={styles.btnContainer}>
                  <Button
                    text='Learn More'
                    btnType='underlinedBlack'
                    href={`/services/${x.slug}`}
                    arrow
                  />
                </div>
                <div className={styles.imgContainer}>
                  <Image
                    src={x.src}
                    alt={x.title}
                    fill
                    className={styles.img}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {pathname === "/" && (
          <div className={styles.btnClusterContainer}>
            <Button href='/' text='See All Services' btnType='black' arrow />
          </div>
        )}
      </LayoutWrapper>
    </section>
  );
}
