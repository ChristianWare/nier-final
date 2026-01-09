import styles from "./RegisterPageIntro.module.css";
import LayoutWrapper from "../shared/LayoutWrapper";
import RegisterForm from "../auth/RegisterForm/RegisterForm";
import Image from "next/image";
import Img1 from "../../../public/images/airport2.jpg";
import SectionHeading from "../shared/SectionHeading/SectionHeading";

export default function RegisterPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.imgContainer}>
              <Image src={Img1} alt='' fill className={styles.img} />
            </div>
          </div>
          <div className={styles.right}>
            <SectionHeading text='Register' dot />
            <h1 className={`${styles.heading} h2`}>Create an account</h1>{" "}
            <p className={styles.copy}>
              Let’s get started with your free account
            </p>
            <div className={styles.formContainer}>
              <RegisterForm />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
