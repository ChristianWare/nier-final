"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Faq.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/chauffeur.jpg";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { useState } from "react";
import Arrow from "../icons/Arrow/Arrow";

type FAQItem = { id: number | string; question: string; answer: string };

export default function Faq({ items }: { items: ReadonlyArray<FAQItem> }) {
  const [selected, setSelected] = useState<null | number>(null);

  const toggle = (i: any) => {
    if (selected === i) return setSelected(null);
    setSelected(i);
  };

  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.mobileHeading}>
              <SectionHeading text='Faqs' />
            </div>
            <div className={styles.imgContainer}>
              <Image src={Img1} alt='hero image' className={styles.img} fill />
            </div>
          </div>
          <div className={styles.right}>
            <div className={styles.desktopHeading}>
              <SectionHeading text='Faqs' dot />
            </div>
            <div className={styles.mapDataContainer}>
              {items.slice(0, 5).map((x, i) => (
                <div
                  key={x.id}
                  className={
                    selected === i
                      ? styles.qaContainer + " " + styles.showBorder
                      : styles.qaContainer
                  }
                  onClick={() => toggle(i)}
                >
                  <div className={styles.headingArrowContainer}>
                    <h3
                      className={`${styles.question} h5 ${
                        selected === i ? styles.questionActive : ""
                      }`}
                      lang='en'
                    >
                      {x.question}
                    </h3>
                    <div className={styles.arrowContainer}>
                      {selected === i ? (
                        <div className={styles.arrowContainer}>
                          <Arrow className={styles.iconFlip} />
                        </div>
                      ) : (
                        <div className={styles.arrowContainer}>
                          <Arrow className={styles.icon} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={
                      selected === i
                        ? styles.answerContainer + " " + styles.show
                        : styles.answerContainer
                    }
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
