import Marquee from "@/components/shared/Marquee/Marquee";
import styles from "./PastClients.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function PastClients() {
  return (
    <section className={styles.container}>
      <SectionHeading text='Current Clients' dot />
      <Marquee
        words={["Arizona Cardinals", "Snapcare", "We Ko Pa Casino & Resort"]}
        speedSeconds={90}
      />
    </section>
  );
}
