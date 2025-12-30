import styles from './ImageMarquee.module.css'
import Image from "next/image";
import Img1 from "../../../../public/images/wedding.jpg";
import Img2 from "../../../../public/images/blog.jpg";
import Img3 from "../../../../public/images/mesaii.jpg";
import Img4 from "../../../../public/images/mesa.jpg";
import Img5 from "../../../../public/images/airport3.jpg";
import Img6 from "../../../../public/images/airport2.jpg";
import Img7 from "../../../../public/images/airport.jpg";
import { StaticImageData } from "next/image";


// DATA
const industries: { title: string; src: StaticImageData }[] = [
  { title: "Ecommerce (Coming soon)", src: Img1 },
  { title: "Salons & Studios", src: Img2 },
  { title: "Equipment Rentals", src: Img3 },
  { title: "Med-Spa & Clinics", src: Img4 },
  { title: "Vacation Rentals", src: Img5 },
  { title: "Luxury Transport", src: Img6 },
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
              fill
              className={styles.img}
              sizes='(max-width: 768px) 100vw, 300px'
              priority={index < 4}
            />
            <div className={styles.overlay} aria-hidden='true' />
            <span className={styles.label}>{title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}