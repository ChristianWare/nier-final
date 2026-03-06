import styles from "./ImageMarquee.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/imgMarq1.jpg";
import Img2 from "../../../../public/images/imgMarq2.jpg";
import Img3 from "../../../../public/images/imgMarq3.jpg";
import Img4 from "../../../../public/images/imgMarq4.jpg";
import Img5 from "../../../../public/images/imgMarq5.jpg";
import Img6 from "../../../../public/images/imgMarq6.jpg";
import Img7 from "../../../../public/images/imgMarq7.jpg";
import { StaticImageData } from "next/image";

// DATA
const industries: { title: string; src: StaticImageData }[] = [
  { title: "Airport Transfers", src: Img1 },
  { title: "Point to Point", src: Img2 },
  { title: "Hourly Charters", src: Img3 },
  { title: "Reocurring Rides", src: Img4 },
  { title: "Corporate Accounts", src: Img5 },
  { title: "Specialty Vehicles", src: Img6 },
  { title: "Memberships", src: Img7 },
];

export default function ImageMarquee() {
  return (
    <div className={styles.slider}>
      <div className={styles.track}>
        {[...industries, ...industries].map(({ src, title }, index) => (
          <div key={`${title}-${index}`} className={styles.imgContainer}>
            <Image
              src={src}
              alt={title}
              title={title}
              fill
              className={styles.img}
              sizes='(max-width: 768px) 100vw, 300px'
              priority={index < 4}
            />
            {/* <div className={styles.overlay} aria-hidden='true' /> */}
            {/* <span className={styles.label}>{title}</span> */}
          </div>
        ))}
      </div>
    </div>
  );
}
