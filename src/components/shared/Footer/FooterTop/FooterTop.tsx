import styles from "./FooterTop.module.css";
import ContactSection from "../../ContactSection/ContactSection";
import LayoutWrapper from "../../LayoutWrapper";
import LogoClip from "../../LogoClip/LogoClip";

export default function FooterTop() {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <LogoClip />
          </div>
          <div className={styles.right}>
            <ContactSection />
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
