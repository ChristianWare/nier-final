import styles from "./NotFoundPageIntro.module.css";
import Image from "next/image";
import Email from "../icons/Email/Email";
import Location from "../icons/Location/Location";
import Phone from "../icons/Phone/Phone";
import LayoutWrapper from "../LayoutWrapper";
import SectionHeading from "../SectionHeading/SectionHeading";
import Suburban from "../../../../public/images/taho.png";
import Button from "../Button/Button";

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

export default function NotFoundPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading text='404' dot />
          <h1 className={styles.heading}>Page Not Found</h1>
          <p className={styles.copy}>
            The page you are looking for does not exist. Please check the URL
            and try again, or contact us if you need assistance.
          </p>
          <div className={styles.btnContainer}>
            <Button text='Go Home' btnType='black' href='/' arrow />
            <Button text='Contact Us' btnType='cream' href='/services' arrow />
          </div>
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
      </LayoutWrapper>
    </section>
  );
}
