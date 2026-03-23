import styles from "./ServiceAreas.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/areas/phoenix.jpg";
import Button from "@/components/shared/Button/Button";
import Logo from "@/components/shared/Logo/Logo";
import Link from "next/link";

const cities = [
  { name: "Phoenix", slug: "phoenix" },
  { name: "Scottsdale", slug: "scottsdale" },
  { name: "Tempe", slug: "tempe" },
  { name: "Chandler", slug: "chandler" },
  { name: "Gilbert", slug: "gilbert" },
  { name: "Peoria", slug: "peoria" },
  { name: "Glendale", slug: "glendale" },
  { name: "Surprise", slug: "surprise" },
  { name: "Avondale", slug: "avondale" },
  { name: "Goodyear", slug: "goodyear" },
];

export default function ServiceAreas() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          <div className={styles.leftContent}>
            <h2 className={`${styles.heading} h3`}>
              No matter where you are in the Phoenix area, Nier Transportation
              is ready to provide top-notch service to enhance your travel
              experience.
            </h2>
            <p className={styles.copy}>
              We proudly serve the entire Phoenix metropolitan area, including
              but not limited to:
            </p>
            <ul className={styles.list}>
              {cities.map((city) => (
                <li key={city.slug}>
                  <span className={styles.dot}>•</span>
                  <Link
                    href={`/locations/${city.slug}`}
                    className={styles.cityLink}
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
              {/* <li>
                <span className={styles.dot}>•</span> And More!
              </li> */}
            </ul>
            <div className={styles.btnContainer}>
              <Button
                href='/locations'
                text='See all locations'
                btnType='black'
                arrow
              />
            </div>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.imgContainer}>
            <div className={styles.menuImageOverlay} />
            <div className={styles.logoContainer}>
              <Logo className={styles.logo} />
            </div>
            <Image
              src={Img1}
              alt='Phoenix Nier Transportation'
              title='Phoenix Nier Transportation'
              fill
              className={styles.img}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
