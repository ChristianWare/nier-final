import { Suspense } from "react";
import styles from "./WekoPaPage.module.css";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Img1 from "../../../public/images/phoenix.jpg";
import Nav from "@/components/shared/Nav/Nav";
import CountUp from "@/components/shared/CountUp/CountUp";
import Faq from "@/components/shared/Faq/Faq";
import { wekopaQuestions } from "@/lib/data";
import WekoPaBookingModal from "@/components/Wekopa/WekoPaBookingModal/WekoPaBookingModal";
import WekoPaBookingSection from "@/components/Wekopa/WekoPaBookingSection/WekoPaBookingSection";
import WekoPaBookingTrigger from "@/components/Wekopa/WekoPaBookingTrigger/WekoPaBookingTrigger";
import WekoPaPricing from "@/components/Wekopa/WekoPaPricing/WekoPaPricing";
import WekopaFinalCTA from "@/components/Wekopa/WekopaFinalCTA/WekopaFinalCTA";

const stats = [
  { id: 1, value: "36", label: "Hole Golf Facility" },
  { id: 2, value: "2", label: "Championship Courses" },
  { id: 3, value: "#1", label: "Ranked in Arizona" },
  { id: 4, value: "20+", label: "Years of Excellence" },
];

const courses = [
  {
    id: 1,
    name: "Cholla Course",
    designer: "Bill Coore & Ben Crenshaw",
    par: "Par 72",
    type: "Signature Design",
    description:
      "The flagship course at We-Ko-Pa Golf Club, designed by the legendary Bill Coore and Ben Crenshaw. The Cholla course follows the natural contours of the Sonoran Desert landscape — carrying over desert waste areas and threading between native vegetation. Elevated tee boxes deliver stunning views of the McDowell Mountains and Four Peaks.",
    tags: ["Desert Links Style", "Mountain Vistas", "Natural Terrain"],
  },
  {
    id: 2,
    name: "Saguaro Course",
    designer: "Scott Miller",
    par: "Par 72",
    type: "Sister Course",
    description:
      "Named for the iconic cactus that defines Arizona golf, the Saguaro course features wide, sweeping fairways and a more traditional desert feel. The Saguaro course plays a step more accessible off the tee while still demanding precision on approach — a pristine desert golf experience in its own right.",
    tags: ["Traditional Desert", "Wide Fairways", "Strategic Play"],
  },
];

// const facilities = [
//   { id: 1, title: "The Pro Shop", desc: "..." },
//   ...
// ];

const nierBenefits = [
  {
    id: 1,
    title: "Flight Tracking Included",
    desc: "We monitor your inbound flight in real time. Delays don't change your ride — we adjust automatically so you're never left waiting.",
  },
  {
    id: 2,
    title: "Right Vehicle for Every Group",
    desc: "Executive sedans for solo travelers. Luxury SUVs for pairs. Sprinter vans for full golf groups with clubs and luggage — sized to the trip.",
  },
  {
    id: 3,
    title: "Flat-Rate Pricing",
    desc: "No surge pricing. No surprises. One flat rate from booking to drop-off, so you know exactly what the ride costs before you get in.",
  },
];

const locationDetails = [
  { label: "From Sky Harbor Airport", value: "~45–60 min" },
  { label: "From Central Scottsdale", value: "~30–45 min" },
  { label: "Address", value: "Fort McDowell, AZ 85264" },
];

const summary = [
  "We-Ko-Pa Golf Club is a top-ranked 36-hole public facility in Fort McDowell, AZ, on Fort McDowell Yavapai Nation land northeast of Scottsdale.",
  "Two championship courses: Cholla (Bill Coore & Ben Crenshaw) and Saguaro — each distinct, both exceptional, together forming one of Arizona's premier golf destinations.",
  "Consistently recognized by Golf Digest and Golfweek as among the best desert golf courses in the country.",
  "The club facilities include a full pro shop, practice range, and the nearby We-Ko-Pa Casino Resort for extended stays.",
  "Located 30–60 minutes from Scottsdale and Sky Harbor — ground transportation planning matters.",
  "Nier Transportation is the preferred ground transportation partner: luxury vehicles, flat-rate pricing, real-time flight tracking, no surprises.",
  "Book your tee time at wekopa.com — book your ride at niertransportation.com. Arrive relaxed and ready to play.",
];

export default function WekoPaPage() {
  return (
    <main>
      <Nav />

      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <div className={styles.heroMedia}>
          <video
            preload='auto'
            autoPlay
            muted
            loop
            playsInline
            className={styles.heroVideo}
            poster='/videos/phx-poster.png'
          >
            <source src='/videos/golf.mp4' type='video/mp4' />
          </video>
          <div className={styles.heroOverlay} />
        </div>

        <LayoutWrapper>
          <div className={styles.heroContent}>
            <div className={styles.heroTag}>
              <SectionHeading
                text='Official Transportation Partner'
                color='cream'
                dot
              />
            </div>
            <h1 className={styles.heroHeading}>
              Arrive in Style
              <br />
              at We-Ko-Pa
              <br />
              Golf Club
            </h1>
            <p className={styles.heroCopy}>
              Arizona&apos;s most celebrated desert golf experience — two
              award-winning championship courses on Fort McDowell Yavapai Nation
              land northeast of Scottsdale. Nier Transportation gets you there
              on time, in a vehicle that matches the caliber of the course.
            </p>
            <div className={styles.heroBtns}>
              <WekoPaBookingTrigger
                text='Book Your Ride'
                btnType='underlinedWhite'
              />
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className={styles.statsBar}>
        <LayoutWrapper>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <div key={s.id} className={styles.statItem}>
                <CountUp
                  from={0}
                  to={parseInt(s.value.replace(/\D/g, ""), 10)}
                  duration={1.2}
                  separator=','
                  className={styles.statValue}
                />
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── INTRO / OVERVIEW ─── */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <div className={styles.introLeft}>
              <SectionHeading text='About We-Ko-Pa' dot />
              <h2 className={styles.introHeading}>
                Arizona&apos;s Most Award-Winning Golf Destination
              </h2>
              <p className={styles.introCopy}>
                We-Ko-Pa Golf Club has earned a reputation that extends well
                beyond the Scottsdale area. Recognized by Golf Digest and
                Golfweek alike, the facility consistently ranks among the top
                public courses in Arizona — and for good reason. The club
                features two distinct championship courses set against the raw,
                unspoiled beauty of the Sonoran Desert.
              </p>
              <p className={styles.introCopy}>
                Unlike many resort-adjacent facilities, We-Ko-Pa keeps the focus
                entirely on the game. No residential developments line the
                fairways. No distractions — just pristine desert terrain,
                dramatic elevation changes, and the kind of silence you can only
                find this far from the city. Located on Toh Vee Circle in Fort
                McDowell, AZ 85264, on Fort McDowell Yavapai Nation land.
              </p>
              <div className={styles.introBtn}>
                <Button
                  href='https://wekopa.com'
                  text='Visit We-Ko-Pa'
                  target='_blank'
                  btnType='underlinedBlack'
                  arrow
                />
              </div>
            </div>

            <div className={styles.introRight}>
              <div className={styles.introImgWrap}>
                <Image
                  src={Img1}
                  alt='We-Ko-Pa Golf Club Arizona'
                  title='We-Ko-Pa Golf Club — Arizona Golf'
                  fill
                  className={styles.introImg}
                />
                <div className={styles.introImgBadge}>
                  <span className={styles.badgeEyebrow}>Golf Digest</span>
                  <span className={styles.badgeText}>
                    Top Ranked Course
                    <br />
                    in Arizona
                  </span>
                </div>
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── TWO COURSES ─── */}
      <section className={styles.courses}>
        <LayoutWrapper>
          <div className={styles.coursesTop}>
            <SectionHeading text='The Courses' dot />
            <h2 className={styles.coursesHeading}>
              Cholla &amp; Saguaro &mdash;
              <br />
              Two Courses, One Unforgettable Round
            </h2>
          </div>

          <div className={styles.coursesGrid}>
            {courses.map((c, i) => (
              <div
                key={c.id}
                className={`${styles.courseCard} ${i === 0 ? styles.courseCardDark : styles.courseCardLight}`}
              >
                <div className={styles.courseCardHeader}>
                  <SectionHeading text={c.type} color='red' dot />
                  <span className={styles.coursePar}>{c.par}</span>
                </div>
                <h3 className={styles.courseName}>{c.name}</h3>
                <p className={styles.courseDesigner}>
                  Designed by {c.designer}
                </p>
                <p className={styles.courseDesc}>{c.description}</p>
                <div className={styles.courseTags}>
                  {c.tags.map((tag) => (
                    <span key={tag} className={styles.courseTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── DESIGNERS CALLOUT ─── */}
      {/* <section className={styles.designers}>...</section> */}

      {/* ─── CLUB FACILITIES ─── */}
      {/* <section className={styles.facilities}>...</section> */}

      {/* ─── LOCATION / GETTING THERE ─── */}
      <section className={styles.location}>
        <LayoutWrapper>
          <div className={styles.locationContent}>
            <div className={styles.locationMedia}>
              <video
                preload='auto'
                autoPlay
                muted
                loop
                playsInline
                className={styles.locationVideo}
                poster='/videos/phx-poster.png'
              >
                <source src='/videos/phx.mp4' type='video/mp4' />
              </video>
              <div className={styles.locationOverlay} />
            </div>

            <div className={styles.locationRight}>
              <SectionHeading text='Getting There' dot />
              <h2 className={styles.locationHeading}>
                30–60 Minutes from
                <br />
                Scottsdale &amp; Sky Harbor
              </h2>
              <p className={styles.locationCopy}>
                We-Ko-Pa Golf Club sits on Toh Vee Circle in Fort McDowell, AZ
                85264, on Fort McDowell Yavapai Nation land northeast of the
                Scottsdale area. The distance is part of what makes the setting
                so special — it&apos;s why the course feels remote and the
                McDowell mountain vistas are so uninterrupted. But it also means
                rideshare apps aren&apos;t always reliable in this corridor.
              </p>
              <div className={styles.locationDetails}>
                {locationDetails.map((d) => (
                  <div key={d.label} className={styles.locationDetail}>
                    <span className={styles.locationDetailLabel}>
                      {d.label}
                    </span>
                    <span className={styles.locationDetailValue}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.locationBtn}>
                <WekoPaBookingTrigger
                  text='Book Your Ride There'
                  btnType='black'
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── NIER PARTNERSHIP ─── */}
      <section className={styles.partnership}>
        <LayoutWrapper>
          <div className={styles.partnershipTop}>
            <SectionHeading
              text='Preferred Transportation Partner'
              color='cream'
              dot
            />
            <h2 className={`${styles.partnershipHeading}`}>
              Your Round Starts
              <br />
              Before You Arrive
            </h2>
            <p className={styles.partnershipCopy}>
              Nier Transportation has served the Phoenix and Scottsdale area
              since 2004. A round at We-Ko-Pa is an investment in a premium golf
              experience. The tee time, the travel, the occasion — all of it
              deserves transportation that matches the caliber of the
              destination. Our late-model luxury vehicles arrive clean, on time,
              and driven by professionals who understand that your trip begins
              the moment you get in the car.
            </p>
          </div>

          <div className={styles.partnershipGrid}>
            {nierBenefits.map((b) => (
              <div key={b.id} className={styles.partnershipCard}>
                <span className={styles.partnershipNum}>0{b.id}</span>
                <h3 className={`${styles.partnershipCardTitle} h4`}>
                  {b.title}
                </h3>
                <p className={styles.partnershipCardDesc}>{b.desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.partnershipCTA}>
            <WekoPaBookingTrigger
              text='Book Your Ride to We-Ko-Pa'
              btnType='red'
            />
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── BOOKING CTA ─── */}
      <WekoPaPricing />
      <section className={styles.booking}>
        <LayoutWrapper>
          <div className={styles.bookingContent}>
            <div className={styles.bookingLeft}>
              <SectionHeading text='Ready to Play?' dot />
              <h2 className={styles.bookingHeading}>
                Book Your Tee Time.
                <br />
                Book Your Ride.
              </h2>
              <p className={styles.bookingCopy}>
                Reserve your tee time directly at wekopa.com — then let Nier
                handle the rest. We coordinate your pickup around your tee time,
                track your flight if you&apos;re arriving from out of state, and
                make sure you arrive at We-Ko-Pa Golf Club relaxed and ready.
                For corporate golf outings or multi-stop group pickups, our team
                manages the full logistics.
              </p>
            </div>
            <div className={styles.bookingRight}>
              <div className={styles.bookingExternalBtn}>
                <span className={styles.bookingBtnLabel}>Step 1</span>
                {/* Intentional external navigation — stays as Button */}
                <Button
                  href='https://wekopa.com'
                  text='Book Tee Time at We-Ko-Pa'
                  target='_blank'
                  btnType='black'
                  arrow
                />
              </div>
              <div className={styles.bookingDivider} />
              <div className={styles.bookingNierBtn}>
                <span className={styles.bookingBtnLabel}>Step 2</span>
                <WekoPaBookingTrigger
                  text='Book Your Nier Ride'
                  btnType='red'
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* ─── SUMMARY ─── */}
      <section className={styles.summary}>
        <LayoutWrapper>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLeft}>
              <SectionHeading text='Key Takeaways' dot color='cream' />
              <h2 className={styles.summaryHeading}>
                Everything You
                <br />
                Need to Know
              </h2>
            </div>
            <ul className={styles.summaryList}>
              {summary.map((item, i) => (
                <li key={i} className={styles.summaryItem}>
                  <span className={styles.summaryIndex}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.summaryText}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </LayoutWrapper>
      </section>

      <Faq items={wekopaQuestions} />
      <WekopaFinalCTA />

      {/* ─── BOOKING MODAL ───────────────────────────────────────────────────
          Mounted once at the root. WekoPaBookingSection is a server component
          — its DB queries run at page-load time on the server. The modal just
          reveals the already-rendered output when the user clicks any trigger.
      ─────────────────────────────────────────────────────────────────────── */}
      <WekoPaBookingModal>
        <Suspense
          fallback={
            <div
              style={{
                padding: "6rem 3rem",
                textAlign: "center",
                fontSize: "1.6rem",
                opacity: 0.4,
              }}
            >
              Loading...
            </div>
          }
        >
          <WekoPaBookingSection />
        </Suspense>
      </WekoPaBookingModal>
    </main>
  );
}
