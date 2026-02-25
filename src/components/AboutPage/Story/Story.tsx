import styles from "./Story.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Image from "next/image";
import Img1 from "../../../../public/images/safety.jpg";
import Img2 from "../../../../public/images/punctuality.jpg";
import Img3 from "../../../../public/images/exceptional.jpg";

const values = [
  {
    id: 1,
    title: "Safety First",
    description:
      "Your well-being is never negotiable. Every vehicle in our fleet is regularly inspected, cleaned, and maintained to the highest standards. Our chauffeurs are background-checked, insured, and trained in defensive driving — so you can relax and let us handle the road.",
    src: Img1,
  },
  {
    id: 2,
    title: "Punctuality",
    description:
      "We know your time is your most valuable asset. That's why we track your flight in real time, monitor traffic conditions, and build buffer time into every route. If we're ever late without cause, the first hour is on us — no questions asked.",
    src: Img2,
  },
  {
    id: 3,
    title: "Exceptional Service",
    description:
      "From the moment you book to the moment you arrive, every detail is considered. Uniformed chauffeurs. Complimentary water. A quiet, comfortable cabin. And a team that genuinely cares about making your experience seamless.",
    src: Img3,
  },
];

export default function Story() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='How It Started' dot />
              <h2 className={`${styles.headingMain} h6`}>
                Nier Transportation was founded in 2004 with a single
                conviction: that every traveler — whether heading to a board
                meeting, a wedding, or the airport at 4 a.m. — deserves the same
                level of care, professionalism, and comfort normally reserved
                for private aviation.
              </h2>
            </div>
            <div className={styles.right}>
              <h2 className={styles.heading}>
                We haven&apos;t grown by cutting corners. We&apos;ve grown
                because our clients keep coming back — and keep telling their
                friends.
              </h2>
              <p className={styles.copy}>
                What started as a small fleet serving the Scottsdale corridor
                has grown into one of Arizona&apos;s most trusted black car
                services, with thousands of satisfied clients ranging from
                Fortune 500 executives to families celebrating life&apos;s most
                meaningful moments.
              </p>
              <div className={styles.leftii}>
                <SectionHeading text='How It Started' dot />
                <h2 className={`${styles.headingMain} h6`}>
                  Nier Transportation was founded in 2004 with a single
                  conviction: that every traveler — whether heading to a board
                  meeting, a wedding, or the airport at 4 a.m. — deserves the
                  same level of care, professionalism, and comfort normally
                  reserved for private aviation.
                </h2>
              </div>
              <div>
                <div
                  style={{
                    marginBottom: "2rem",
                    borderBottom: "2px solid var(--stroke)",
                    paddingBottom: "1rem",
                  }}
                >
                  <SectionHeading text='Values we live by' dot />
                </div>
                <div className={styles.bottom}>
                  {values.map((x) => (
                    <div key={x.id} className={styles.card}>
                      <div className={styles.titleDescBox}>
                        <div className={styles.idTitleBox}>
                          {/* <div className={styles.idBox}>
                            <span className={styles.id}>{x.id}</span>
                          </div> */}
                          <h3 className={`${styles.title} cardTitle bgWhite h5`}>{x.title}</h3>
                        </div>
                        <p className={styles.desc}>{x.description}</p>
                      </div>
                      <div className={styles.imgContainer}>
                        <Image
                          src={x.src}
                          alt={x.title}
                          fill
                          className={styles.img}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
