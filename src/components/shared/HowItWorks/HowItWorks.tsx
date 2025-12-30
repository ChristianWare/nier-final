import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowItWorks.module.css";

import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

const data = [
  {
    id: 1,
    title: "Choose Your Ride",
    description:
      "Browse our wide selection of vehicles and choose the one that suits your needs and budget.",
    // icon: <CarIcon />,
  },
  {
    id: 2,
    title: "Book Your Ride",
    description:
      "Select your pickup location, date, and time, then confirm your booking with just a few clicks.",
    // icon: <BookingIcon />,
  },
  {
    id: 3,
    title: "Enjoy Your Journey",
    description:
      "Sit back, relax, and enjoy your ride. Our professional drivers will ensure you reach your destination safely and on time.",
    // icon: <JourneyIcon />,
  },
];

export default function HowItWorks() {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Services' color='red' />
            <h3 className={styles.heading}>
              The most common services <br /> we offer at Nier
            </h3>
            <div className={styles.btnClusterContainer}>
              <Button href='/' text='Book your ride' btnType='black' arrow />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.mapDataContainer}>
              {data.map((item) => (
                <div key={item.id} className={styles.card}>
                  <span className={`${styles.index} stat`}>0{item.id}</span>
                  <h4 className={styles.title}>{item.title}</h4>
                  <p className={styles.desc}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
