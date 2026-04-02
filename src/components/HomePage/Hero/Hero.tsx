import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import Button from "@/components/shared/Button/Button";
// import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Marquee from "@/components/shared/Marquee/Marquee";
import Image from "next/image";
import HomeBookingWidget, {
  type WidgetServiceTypeDTO,
  type WidgetVehicleDTO,
} from "../HomeBookingWidget/HomeBookingWidget";

export default function Hero({
  serviceTypes = [],
  vehicles = [],
  companyTimezone = "America/Phoenix",
  companyTimezoneLabel = "Phoenix, AZ (MST)",
}: {
  serviceTypes?: WidgetServiceTypeDTO[];
  vehicles?: WidgetVehicleDTO[];
  companyTimezone?: string;
  companyTimezoneLabel?: string;
}) {
  return (
    <section className={styles.container}>
      <div className={styles.media}>
        {/* Mobile: static poster image, no video download */}
        <div className={styles.mobileMedia}>
          <Image
            src='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_750,q_60,f_auto/phx-poster_bps55j'
            alt='Black car service in Phoenix'
            fill
            priority
            sizes='100vw'
            style={{ objectFit: "cover" }}
          />
        </div>
        {/* Desktop: video */}
        <video
          preload='none'
          autoPlay
          muted
          loop
          playsInline
          className={styles.video}
          poster='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_1200,q_70,f_auto/phx-poster_bps55j'
        >
          <source
            src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto,f_webm/phx_y9t0y5'
            type='video/webm'
          />
          <source
            src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/phx_y9t0y5'
            type='video/mp4'
          />
        </video>

        <div className={styles.imgOverlay} />
        <div className={styles.marqueeWrap}>
          <div className={styles.cc2}>
            {/* <div className={styles.left2}>
              <p className={styles.copyii}>
                Executive sedans, luxury SUVs, Sprinter vans, and 56 passenger
                Motor Coach Buses — available 24/7 across the Phoenix metro.
                Book your ride in under two minutes.
              </p>
            </div>
            <div className={styles.right2}>
              <p className={styles.copyii}>Discover more</p>
              <Arrow className={styles.arrow} />
            </div> */}
          </div>
          <Marquee
            words={[
              "Phoenix",
              "Scottsdale",
              "Mesa",
              "Chandler",
              "Goodyear",
              "Peoria",
            ]}
            speedSeconds={90}
          />
        </div>
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.contentChildren}>
            {/* ── Existing headline block (unchanged) ── */}
            <div className={styles.cc1}>
              <div className={styles.left}>
                <h1 className={styles.heading}>
                  Black Car Service in Phoenix &amp; Scottsdale — <br className={styles.break} /> Trusted Since
                  2004
                </h1>
                <p className={styles.copy}>
                  At Nier Transportation, we&apos;re more than a car service;
                  we&apos;re your trusted partner in high end transportation.
                </p>
                <div className={styles.btnContainerii}>
                  <Button
                    href='/book'
                    text='Book your Ride'
                    btnType='red'
                    arrow
                  />
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.widgetRow}>
                  <HomeBookingWidget
                    serviceTypes={serviceTypes}
                    vehicles={vehicles}
                    companyTimezone={companyTimezone}
                    companyTimezoneLabel={companyTimezoneLabel}
                  />
                </div>
              </div>
            </div>

            {/* ── Quick-book widget ── */}
            {/* Sits below the headline, left-aligned.
                On mobile it stacks naturally since the hero is single-column. */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
