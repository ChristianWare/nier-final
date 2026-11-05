// The venues and events a charter page covers, as a centered list of pills.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./CharterVenues.module.css";

export default function CharterVenues({
  heading,
  copy,
  venues,
}: {
  heading: string;
  copy: string;
  venues: string[];
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Where we drive' dot />
          <h2 className='h3'>{heading}</h2>
          <p className={styles.copy}>{copy}</p>
        </div>
        <ul className={styles.venues}>
          {venues.map((v) => (
            <li key={v} className={styles.venue}>
              {v}
            </li>
          ))}
        </ul>
      </LayoutWrapper>
    </section>
  );
}
