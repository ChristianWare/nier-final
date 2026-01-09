import styles from "./LoginPageIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import LoginForm from "@/components/auth/LoginForm/LoginForm";
import Image from "next/image";
import Img1 from "../../../../public/images/airport3.jpg";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function LoginPageIntro() {
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
            <SectionHeading text='Login' dot />
            <h1 className={`${styles.heading} h2`}>Welcome back</h1>
            <p className={styles.copy}>
              Enter your email and password to access your account
            </p>
            <div className={styles.formContainer}>
              <LoginForm />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
