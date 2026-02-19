import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./SimplifyCTA.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function SimplifyCTA() {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Inquire today' color='red' />
            <h2 className={styles.heading}>
              Ready to Simplify How Your Company Moves?
            </h2>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              <p className={styles.copy1}>
                There&apos;s no long-term commitment to get started, and setup
                takes less than a day once you&apos;re approved. Fill out the
                inquiry form below and we&apos;ll have everything ready before
                your next trip.
              </p>
            </div>
            <div className={styles.bottomRight}>
              <p className={`${styles.copy2} h4`}>
                Your team deserves transportation that works as hard as they do.
                With a Nier Transportation corporate account, you get the
                reliability of a dedicated fleet, the simplicity of consolidated
                billing, and the peace of mind that comes from working with a
                team that treats every ride like it matters — because it does.
              </p>
              <div className={styles.btnContainer}>
                <Button
                  href='/book'
                  text="Let's get in touch"
                  btnType='underlinedWhite'
                  arrow
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}

//
//
// Questions before you apply?
// Call us directly at [(602) XXX-XXXX] or email [corporate@niertransportation.com]. We're happy to walk you through how an account would work for your specific needs.
