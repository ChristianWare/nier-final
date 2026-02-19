import styles from "./ServiceCityCTA.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import type { CityData } from "@/lib/cities";
import type { ServiceShape } from "@/lib/services";

type Props = {
  service: ServiceShape;
  city: CityData;
};

export default function ServiceCityCTA({ service, city }: Props) {
  const bookHref = `/book?service=${encodeURIComponent(service.slug)}`;

  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Book today' color='red' />
            <h2 className={styles.heading}>
              Ready for a better ride in {city.name}?
            </h2>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              <p className={styles.copy1}>
                Available 24/7 with no surge pricing. Your fare is locked in at
                booking — no surprises at pickup. Professional chauffeurs,
                late-model vehicles, and door-to-door service across {city.name}{" "}
                and greater Metro Phoenix.
              </p>
            </div>
            <div className={styles.bottomRight}>
              <p className={`${styles.copy2} h4`}>
                {service.title} in {city.name} — done right. Whether it&apos;s a
                last-minute airport run or a planned corporate event, Nier
                Transportation delivers the reliability and professionalism that{" "}
                {city.name} residents and visitors expect.
              </p>
              <div className={styles.btnContainer}>
                <Button
                  href={bookHref}
                  text='Book your ride'
                  btnType='underlinedWhite'
                  arrow
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
