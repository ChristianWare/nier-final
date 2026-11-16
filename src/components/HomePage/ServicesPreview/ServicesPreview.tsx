/* eslint-disable react-hooks/purity */
"use client";

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import ServiceCard from "@/components/shared/ServiceCard/ServiceCard";
import styles from "./ServicesPreview.module.css";
import Button from "@/components/shared/Button/Button";
import { servicesData as services } from "@/lib/services";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function ServicesPreview() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isServiceSlugPage =
    pathname.startsWith("/services/") && pathname !== "/services";

  const currentSlug = useMemo(() => {
    if (!isServiceSlugPage) return "";
    return pathname.split("/").filter(Boolean)[1] ?? "";
  }, [pathname, isServiceSlugPage]);

  const servicesMap = useMemo(() => {
    if (isHome) return services.slice(0, 3);
    if (isServiceSlugPage) {
      const pool = services.filter((s) => s.slug !== currentSlug);
      const arr = [...pool];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(0, 3);
    }
    return services;
  }, [isHome, isServiceSlugPage, currentSlug]);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading
              text={isServiceSlugPage ? "Related Solutions" : "Services"}
              dot
            />

            {isServiceSlugPage ? (
              <h2 className={styles.heading}>Explore other services</h2>
            ) : (
              <h2 className={styles.heading}>
                Core services we offer
                <br className={styles.break} /> at Nier Transportation
              </h2>
            )}
          </div>

          <div className={styles.bottom}>
            {servicesMap.map((x) => (
              <ServiceCard key={x.id} service={x} />
            ))}
          </div>
        </div>

        {(isHome || isServiceSlugPage) && (
          <div className={styles.btnClusterContainer}>
            <Button
              href='/services'
              text='See All Services'
              btnType='black'
              arrow
            />
          </div>
        )}
      </LayoutWrapper>
    </section>
  );
}
