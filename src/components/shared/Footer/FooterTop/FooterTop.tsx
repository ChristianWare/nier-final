import styles from "./FooterTop.module.css";
import ContactSection from "../../ContactSection/ContactSection";
import LayoutWrapper from "../../LayoutWrapper";
import Logo from "../../Logo/Logo";

export default function FooterTop() {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <Logo className={styles.logo} />
          </div>
          <div className={styles.right}>
            <span className={`${styles.heading} h3`}>
              Contact us for <br /> questions or collaboration
            </span>
            <ContactSection />
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
