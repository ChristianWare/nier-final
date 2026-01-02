import styles from "./Story.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Image from "next/image";
import Img1 from "../../../../public/images/Adam.jpg";
import Img2 from "../../../../public/images/alice.jpg";
import Img3 from "../../../../public/images/charlie.jpg";

const values = [
  {
    id: 1,
    title: "Safety First",
    description:
      "Your well-being is our top priority. We maintain rigorous safety standards and ensure all vehicles are regularly inspected and sanitized for your peace of mind.",
    src: Img1,
  },
  {
    id: 2,
    title: "Punctuality",
    description:
      "We value your time. Our team is committed to prompt arrivals and efficient service, ensuring you reach your destination on schedule, every time.",
    src: Img2,
  },
  {
    id: 3,
    title: "Exceptional Service",
    description:
      "We go above and beyond to deliver a seamless and memorable experience, focusing on professionalism, courtesy, and attention to every detail.",
    src: Img3,
  },
];

export default function Story() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='Nier Transportation' color='red' />
              <div className='h4'>
                A single promise has driven us since day one: every guest
                deserves the ease, safety, and quiet luxury normally reserved
                for private aviation.
              </div>
            </div>
            <div className={styles.right}>
              <h2 className={styles.heading}>
                Founded in 2004, Nier Transportation was born out of a passion
                for delivering exceptional transportation experiences.
              </h2>
              <div className={styles.leftii}>
                <SectionHeading text='Nier Transportation' color='red' />
                <div className='h4'>
                  A single promise has driven us since day one: every guest
                  deserves the ease, safety, and quiet luxury normally reserved
                  for private aviation.
                </div>
              </div>
              <div className={styles.bottom}>
                {values.map((x) => (
                  <div key={x.id} className={styles.card}>
                    <div className={styles.titleDescBox}>
                      <div className={styles.idTitleBox}>
                        <div className={styles.idBox}>
                          <span className={styles.id}>{x.id}</span>
                        </div>
                        <h3 className={`${styles.title} h5`}>{x.title}</h3>
                      </div>
                      <p className={styles.desc}>{x.description}</p>
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
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
