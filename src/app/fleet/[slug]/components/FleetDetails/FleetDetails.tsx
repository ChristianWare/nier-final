/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { fleetData } from "@/lib/data";
import styles from "./FleetDetails.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Faq from "@/components/shared/Faq/Faq";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";
import ImgFallback from "../../../../../../public/images/vip.jpg";

type Vehicle = (typeof fleetData)[number];

export default function FleetDetails({ vehicle }: { vehicle: Vehicle }) {
  const heroImg =
    (vehicle.images?.[0]?.src as any) || (vehicle.src as any) || ImgFallback;
  const heroAlt = vehicle.images?.[0]?.alt ?? vehicle.title;
  // const lead = vehicle.shortDesc ?? vehicle.desc ?? vehicle.longDesc ?? "";

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            {vehicle.longDesc && (
              <article className={styles.top}>
                <h2 className={styles.heading}>Vehicle Details</h2>
                <br />
                <p className={styles.copy}>
                  {/* {lead} */}
                  {vehicle.longDesc}
                </p>
              </article>
            )}

            <article className={styles.section}>
              <h3 className={`${styles.subHeading} h5`}>Amenities</h3>
              <ul>
                {(vehicle.amenities ?? []).map((a) => (
                  <li key={a}>
                    <span className={styles.dot} /> {a}
                  </li>
                ))}
              </ul>
            </article>
            <article className={styles.section}>
              <h3 className={`${styles.subHeading} h5`}>
                Safety & Driver Tech
              </h3>
              <ul>
                {(vehicle.safetyTech ?? []).map((s) => (
                  <li key={s}>
                    <span className={styles.dot} />
                    {s}
                  </li>
                ))}
              </ul>
            </article>
            <article className={styles.section}>
              <h3 className={`${styles.subHeading} h5`}>Specs</h3>
              <ul>
                {vehicle.specs?.drivetrain && (
                  <li>
                    <span className={styles.dot} />
                    Drivetrain: {vehicle.specs.drivetrain}
                  </li>
                )}
                {vehicle.specs?.rideFeel && (
                  <li>
                    <span className={styles.dot} />
                    Ride feel: {vehicle.specs.rideFeel}
                  </li>
                )}
                {vehicle.specs?.cabin && (
                  <li>
                    <span className={styles.dot} />
                    Cabin: {vehicle.specs.cabin}
                  </li>
                )}
                {vehicle.cargoCuFt && (
                  <li>
                    <span className={styles.dot} />
                    Cargo capacity: {vehicle.cargoCuFt}
                  </li>
                )}
              </ul>
            </article>
            {vehicle.features?.length ? (
              <article className={styles.section}>
                <h3 className={`${styles.subHeading} h5`}>Highlights</h3>
                <ul>
                  {vehicle.features.map((f) => (
                    <li key={f}>
                      {" "}
                      <span className={styles.dot} />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
            {vehicle.rateRules && (
              <article className={styles.section}>
                <h3 className={`${styles.subHeading} h5`}>
                  Rates & Booking Rules
                </h3>
                <ul>
                  {vehicle.rateRules.hourlyFromUSD && (
                    <li>
                      <span className={styles.dot} />
                      Hourly from ${vehicle.rateRules.hourlyFromUSD}/hr
                    </li>
                  )}
                  {vehicle.rateRules.airportTransferFromUSD && (
                    <li>
                      <span className={styles.dot} />
                      Airport transfers from $
                      {vehicle.rateRules.airportTransferFromUSD}
                    </li>
                  )}
                  {vehicle.rateRules.minimumHours && (
                    <li>
                      <span className={styles.dot} />
                      Minimum {vehicle.rateRules.minimumHours} hours (hourly)
                    </li>
                  )}
                  {vehicle.rateRules.meetAndGreetUSD && (
                    <li>
                      <span className={styles.dot} />
                      Meet & greet: ${vehicle.rateRules.meetAndGreetUSD}
                    </li>
                  )}
                  {vehicle.rateRules.afterHoursSurchargePct && (
                    <li>
                      <span className={styles.dot} />
                      After-hours surcharge:{" "}
                      {vehicle.rateRules.afterHoursSurchargePct}%
                    </li>
                  )}
                  {vehicle.rateRules.waitTimeGraceMin && (
                    <li>
                      <span className={styles.dot} />
                      Grace period: {vehicle.rateRules.waitTimeGraceMin} minutes
                    </li>
                  )}
                  {vehicle.rateRules.extraStopUSD && (
                    <li>
                      <span className={styles.dot} />
                      Extra stop: ${vehicle.rateRules.extraStopUSD}
                    </li>
                  )}
                </ul>
              </article>
            )}
            {vehicle.policy && (
              <article className={styles.section}>
                <h3 className={`${styles.subHeading} h5`}>Policies</h3>
                <p>{vehicle.policy.summary}</p>
                <ul>
                  {(vehicle.policy.details ?? []).map((d, i) => (
                    <li key={i}>
                      <span className={styles.dot} />

                      {d}
                    </li>
                  ))}
                </ul>
              </article>
            )}
            <div className={styles.btnContainerii}>
              <Button href='/' text='Book this vehicle' btnType='black' arrow />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.rightContent}>
              <div className={styles.imgContainer}>
                <Image
                  src={heroImg}
                  alt={heroAlt}
                  fill
                  className={styles.img}
                />
              </div>

              <div className={styles.btnContainer}>
                <Button
                  href='/'
                  text='Book this vehicle'
                  btnType='black'
                  arrow
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
      <Faq
        items={(vehicle.faqs ?? []).map((f, i) => ({
          id: `${vehicle.slug}-faq-${i}`,
          question: f.q,
          answer: f.a,
        }))}
      />
    </section>
  );
}
