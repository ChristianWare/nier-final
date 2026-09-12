import styles from "./FleetPageIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Image from "next/image";
import Img1 from '../../../../public/images/vehicles/taho.png'

export default function FleetPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Our Fleet' dot />
            <h1 className={styles.heading}>
              Comfortable, impeccably maintained vehicles for all your needs
            </h1>
            <p className={styles.copy}>
              From executive sedans to extended SUVs and premium Sprinters,
              every vehicle in our fleet is selected for ride quality, luggage
              capacity, and in-cabin comfort.
            </p>
          </div>
          <div className={styles.right}>
            <div className={styles.imgContainer}>
              <Image
                src={Img1}
                alt='Fleet Image'
                title='Fleet Image'
                fill
                className={styles.img}
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
