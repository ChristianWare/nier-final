import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Car from "@/components/shared/icons/Car/Car";
import Location from "@/components/shared/icons/Location/Location";
import { CELL_LOTS } from "@/lib/airportGuides";
import LotImg from "../../../../public/images/other/parking.jpg";
import styles from "./CellPhoneLots.module.css";

const icons = [Car, Car, Location];

/**
 * Sky Harbor's three free cell phone lots, laid out like the About page's
 * MissionValues section: copy and lot list on the left, photo with a stat
 * card on the right.
 */
export default function CellPhoneLots() {
  const totalSpaces = CELL_LOTS.lots.reduce((n, l) => n + l.spaces, 0);

  return (
    <section className={styles.container} aria-labelledby='cell-lots-heading'>
      <LayoutWrapper>
        <div className={styles.top}>
          <div className={styles.left}>
            <SectionHeading text='Picking someone up?' color='red' />
            <h2 id='cell-lots-heading' className={`${styles.heading} h3`}>
              {CELL_LOTS.heading}
            </h2>
            <p className={styles.mainCopy}>{CELL_LOTS.intro}</p>

            <ul className={styles.list}>
              {CELL_LOTS.lots.map((lot, i) => {
                const Icon = icons[i] ?? Car;
                return (
                  <li key={lot.name} className={styles.card}>
                    <div className={styles.iconContainer}>
                      <Icon className={styles.icon} aria-hidden='true' />
                    </div>
                    <div className={styles.cardRight}>
                      <h3 className={styles.title}>{lot.name}</h3>
                      <p className={styles.desc}>
                        <span className={styles.spaces}>
                          {lot.spaces} spaces
                        </span>
                        {lot.amenities}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.right}>
            <div className={styles.media}>
              <Image
                src={LotImg}
                alt='Cars waiting at Phoenix Sky Harbor'
                fill
                placeholder='blur'
                sizes='(max-width: 1268px) 100vw, 66vw'
                className={styles.img}
              />
              <div className={styles.imgOverlay} />
            </div>

            <div className={styles.statBox}>
              <div className={styles.statNumber}>
                {CELL_LOTS.lots.length}
                <span className={styles.statUnit}>free lots</span>
              </div>
              <h3 className={styles.subheading}>
                Open 24 hours, {totalSpaces} spaces in all
              </h3>
              <p className={styles.copy}>
                Stay with your vehicle and keep waits to 30 minutes or less.
                Riding with Nier? Your chauffeur handles all of this for you.
              </p>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
