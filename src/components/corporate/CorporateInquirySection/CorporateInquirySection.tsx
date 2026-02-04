import styles from "./CorporateInquirySection.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import CorporateInquiryForm from "../CorporateInquiryForm/CorporateInquiryForm";

export default function CorporateInquirySection() {
  return (
    <section id='inquiry' className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Get Started' dot />
            <h2 className={styles.heading}>Apply for a Corporate Account</h2>
            <p className={styles.copy}>
              Fill out the form below and a member of our team will reach out
              within 1 business day to discuss your company&apos;s
              transportation needs, usage estimates, and pricing.
            </p>
            <div className={styles.details}>
              <div className={styles.detailItem}>
                <span className={styles.detailNumber}>1</span>
                <div className={styles.detailText}>
                  <span className={styles.detailTitle}>Submit inquiry</span>
                  <span className={styles.detailCopy}>
                    Tell us about your company and transportation needs.
                  </span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailNumber}>2</span>
                <div className={styles.detailText}>
                  <span className={styles.detailTitle}>
                    We&apos;ll reach out
                  </span>
                  <span className={styles.detailCopy}>
                    Our team reviews your request and contacts you to discuss
                    rates and terms.
                  </span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailNumber}>3</span>
                <div className={styles.detailText}>
                  <span className={styles.detailTitle}>Account activated</span>
                  <span className={styles.detailCopy}>
                    Once approved, your corporate account is set up and ready to
                    book.
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <CorporateInquiryForm />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
