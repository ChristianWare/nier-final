import styles from "./ContactPageIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Suburban from "../../../../public/images/taho.png";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import ContactSection from "@/components/shared/ContactSection/ContactSection";
import Location from "@/components/shared/icons/Location/Location";
import Phone from "@/components/shared/icons/Phone/Phone";
import Email from "@/components/shared/icons/Email/Email";

const data = [
  {
    id: 1,
    title: "Scottsdale, AZ",
    icon: <Location className={styles.icon} />,
  },
  {
    id: 2,
    title: "480-300-6003",
    icon: <Phone className={styles.icon} />,
  },
  {
    id: 3,
    title: "reservations@niertransportation.com",
    icon: <Email className={styles.icon} />,
  },
];

export default function ContactPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <ContactSection />
          </div>
          <div className={styles.right}>
            <SectionHeading text='Contact us' dot />
            <h1 className={styles.heading}>Lets Get In touch</h1>
            <h2 className={`${styles.heading2} h6`}>
              Talk to a Real Dispatcher—24/7/365
            </h2>
            <p className={styles.copy}>
              Whether you prefer to speak with a human or type a quick message,
              our locally based support team is always on duty. Expect clear
              answers, honest pricing, and zero phone-tree frustration.
            </p>
            <div className={styles.mapDataContainer}>
              {data.map((item) => (
                <div key={item.id} className={styles.card}>
                  {item.icon}
                  <span className={styles.title}>{item.title}</span>
                </div>
              ))}
            </div>
            <div className={styles.imgContainer}>
              <Image
                src={Suburban}
                fill
                alt=''
                title=''
                className={styles.img}
                priority
                loading='eager'
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
