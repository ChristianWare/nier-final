import styles from "./RegisterPageIntro.module.css";
import LayoutWrapper from "../shared/LayoutWrapper";
import RegisterForm from "../auth/RegisterForm/RegisterForm";
import Image from "next/image";
import Img1 from "../../../public/images/airport2.jpg";

export default function RegisterPageIntro() {
  return (
    <section className={styles.parent}>
      <div className={styles.container}>
        <LayoutWrapper>
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.imgContainer}>
                <Image src={Img1} alt='' fill className={styles.img} />
              </div>
            </div>
            <div className={styles.right}>
              <h1 className={styles.heading}>Create An Account</h1>{" "}
              <p className={styles.copy}>
                Let’s get started with your free account
              </p>
              <div className={styles.formContainer}>
                <RegisterForm />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </div>
    </section>
  );
}
