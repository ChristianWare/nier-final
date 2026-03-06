"use client";

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Faq.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/chauffeur.jpg";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { useState } from "react";
import Arrow from "../icons/Arrow/Arrow";

type FAQItem = { id: number | string; question: string; answer: string };

export default function Faq({
  items,
  limit = 5,
}: {
  items: ReadonlyArray<FAQItem>;
  limit?: number;
}) {
  const [selected, setSelected] = useState<null | number | string>(null);

  const toggle = (id: number | string) => {
    setSelected((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.mobileHeading}>
              <SectionHeading text='Faqs' dot />
              <h2 className={styles.heading}>Top questions our clients ask</h2>
              <p className={styles.copy}>
                We understand that you may have questions about our services,
                and we&apos;re here to help. Below are some of the most
                frequently asked questions we receive from our clients. If you
                have any additional questions or need further assistance, please
                don&apos;t hesitate to contact us.
              </p>
            </div>
            <div className={styles.imgContainer}>
              <Image
                src={Img1}
                alt='hero image'
                title='hero image'
                className={styles.img}
                fill
              />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.desktopHeading}>
              <SectionHeading text='Faqs' dot />
              <h2 className={styles.heading}>Top questions our clients ask</h2>
              <p className={styles.copy}>
                We understand that you may have questions about our services,
                and we&apos;re here to help. Below are some of the most
                frequently asked questions we receive from our clients. If you
                have any additional questions or need further assistance, please
                don&apos;t hesitate to contact us.
              </p>
            </div>
            <div className={styles.mapDataContainer}>
              {items.slice(0, limit).map((x) => (
                <div
                  key={x.id}
                  className={`${styles.qaContainer} ${selected === x.id ? styles.showBorder : ""}`}
                  onClick={() => toggle(x.id)}
                >
                  <div className={styles.headingArrowContainer}>
                    <h3
                      className={`${styles.question} h5 ${selected === x.id ? styles.questionActive : ""}`}
                      lang='en'
                    >
                      {x.question}
                    </h3>
                    <div className={styles.arrowContainer}>
                      <Arrow
                        className={
                          selected === x.id ? styles.iconFlip : styles.icon
                        }
                      />
                    </div>
                  </div>
                  <div
                    className={`${styles.answerContainer} ${selected === x.id ? styles.show : ""}`}
                  >
                    <p className={styles.answer} lang='en'>
                      {x.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
