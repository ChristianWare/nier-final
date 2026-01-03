import styles from "./ServiceAreas.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/phoenix.jpg";
import Button from "@/components/shared/Button/Button";
import Logo from "@/components/shared/Logo/Logo";

export default function ServiceAreas() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          {/* <LayoutWrapper> */}
            <div className={styles.leftContent}>
              <h2 className={`${styles.heading} h3`}>
                No matter where you are in the Phoenix area, Nier Transportation
                is ready to provide top-notch service to enhance your travel
                experience.
              </h2>
              <p className={styles.copy}>
                We proudly serve the entire Phoenix metropolitan area, including
                but not limited to:
              </p>
              <ul className={styles.list}>
                <li>
                  <span className={styles.dot}>•</span> Phoenix
                </li>
                <li>
                  <span className={styles.dot}>•</span> Scottsdale
                </li>
                <li>
                  <span className={styles.dot}>•</span> Tempe
                </li>
                <li>
                  <span className={styles.dot}>•</span> Chandler
                </li>
                <li>
                  <span className={styles.dot}>•</span> Gilbert
                </li>
                <li>
                  <span className={styles.dot}>•</span> Peoria
                </li>
                <li>
                  <span className={styles.dot}>•</span> Glendale
                </li>
                <li>
                  <span className={styles.dot}>•</span> Surprise
                </li>
                <li>
                  <span className={styles.dot}>•</span> Avondale
                </li>
                <li>
                  <span className={styles.dot}>•</span> Goodyear
                </li>
                {/* <li>And surrounding communities</li> */}
              </ul>
              <div className={styles.btnContainer}>
                <Button
                  href='/'
                  text='Learn More about us'
                  btnType='black'
                  arrow
                />
              </div>
            </div>
          {/* </LayoutWrapper> */}
        </div>
        <div className={styles.right}>
          <div className={styles.imgContainer}>
            <div className={styles.menuImageOverlay} />
            <div className={styles.logoContainer}>
              <Logo className={styles.logo} />
            </div>

            <Image src={Img1} alt='Phoenix' fill className={styles.img} />
          </div>
        </div>
      </div>
    </div>
  );
}
