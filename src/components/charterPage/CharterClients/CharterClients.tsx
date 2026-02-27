import Marquee from "@/components/shared/Marquee/Marquee";
import styles from "./CharterClients.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function CharterClients() {
  return (
    <section className={styles.container}>
      <SectionHeading text='Our Partners' dot />
      <Marquee
        words={[
          "Arizona Cardinals",
          "Phoenix Convention Center",
          "TPC Scottsdale",
          "Fairmont Scottsdale Princess",
          "Arizona State University",
          "Barrett-Jackson",
          "Grand Canyon University",
          "JW Marriott Desert Ridge",
          "Phoenix Open",
          "MLB Spring Training",
        ]}
        speedSeconds={290}
      />
    </section>
  );
}
