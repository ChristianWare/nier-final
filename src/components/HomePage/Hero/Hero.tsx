import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import Button from "@/components/shared/Button/Button";
// import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Marquee from "@/components/shared/Marquee/Marquee";
import Image from "next/image";
import HomeBookingWidget, {
  type WidgetServiceTypeDTO,
  type WidgetVehicleDTO,
} from "../HomeBookingWidget/HomeBookingWidget";

export default function Hero({
  serviceTypes = [],
  vehicles = [],
  companyTimezone = "America/Phoenix",
  companyTimezoneLabel = "Phoenix, AZ (MST)",
}: {
  serviceTypes?: WidgetServiceTypeDTO[];
  vehicles?: WidgetVehicleDTO[];
  companyTimezone?: string;
  companyTimezoneLabel?: string;
}) {
  return (
    <section className={styles.container}>
      <div className={styles.media}>
        {/* Mobile: static poster image, no video download */}
        <div className={styles.mobileMedia}>
          <Image
            src='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_750,q_60,f_auto/phx-poster_bps55j'
            alt='Black car service in Phoenix'
            fill
            priority
            sizes='100vw'
            style={{ objectFit: "cover" }}
          />
        </div>
        {/* Desktop: video */}
        <video
          preload='none'
          autoPlay
          muted
          loop
          playsInline
          className={styles.video}
          poster='https://res.cloudinary.com/dkxlrhwjd/image/upload/w_1200,q_70,f_auto/phx-poster_bps55j'
        >
          <source
            src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto,f_webm/phx_y9t0y5'
            type='video/webm'
          />
          <source
            src='https://res.cloudinary.com/dkxlrhwjd/video/upload/q_auto/phx_y9t0y5'
            type='video/mp4'
          />
        </video>

        <div className={styles.imgOverlay} />
        <div className={styles.marqueeWrap}>
          <div className={styles.cc2}>
            {/* <div className={styles.left2}>
              <p className={styles.copyii}>
                Executive sedans, luxury SUVs, Sprinter vans, and 56 passenger
                Motor Coach Buses — available 24/7 across the Phoenix metro.
                Book your ride in under two minutes.
              </p>
            </div>
            <div className={styles.right2}>
              <p className={styles.copyii}>Discover more</p>
              <Arrow className={styles.arrow} />
            </div> */}
          </div>
          <Marquee
            words={[
              "Phoenix",
              "Scottsdale",
              "Mesa",
              "Chandler",
              "Goodyear",
              "Peoria",
            ]}
            speedSeconds={90}
          />
        </div>
      </div>
      <p className={styles.intrSection}>
        <span className={styles.span}>saff</span>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Aut, ea repudiandae. Nemo, at tenetur magni beatae ipsam dolorum neque, veniam assumenda rerum inventore iste culpa expedita recusandae doloribus non odio tempora reiciendis iure earum. Beatae eaque quis rerum odit officia veritatis deserunt ullam earum? Nihil sint, quaerat sapiente at eaque a consectetur aspernatur nisi, tempora amet aliquam asperiores in officia temporibus quis veritatis sed enim aperiam explicabo mollitia consequatur neque numquam ut? Animi molestiae, ratione rerum earum dignissimos iste voluptate adipisci ut illum soluta rem laborum recusandae sit quisquam, accusamus inventore officia provident omnis veritatis amet itaque, ipsam quam ea in. Repudiandae rerum delectus saepe! Quam, pariatur ea, repudiandae voluptatum dolore nostrum repellendus error corrupti quibusdam iste quas nemo suscipit rem officia porro repellat, qui nam officiis tempora. Illum dignissimos accusantium fugiat laboriosam ratione officiis quaerat dolorum sit maiores est obcaecati consequatur, ducimus hic quidem perspiciatis voluptatem impedit consequuntur commodi, doloremque aliquam! Odio, minus nostrum provident quasi repudiandae fugit molestiae officia accusantium earum molestias mollitia doloremque non odit dignissimos numquam, facere dolore iure explicabo veniam, fuga quod eum! Fugiat quae quasi consequuntur totam laudantium. Inventore pariatur itaque ut corrupti. Numquam maiores a atque sed eaque repudiandae possimus, itaque optio hic provident necessitatibus iste. Optio possimus unde soluta accusantium mollitia, aut voluptatum perferendis voluptate veniam sed alias magnam aliquam nulla eveniet corporis quos officiis iste ex voluptates deleniti dolores? Repellat quam nulla, ducimus optio provident eum consequatur rerum laudantium atque laborum harum reprehenderit repellendus quo! Inventore quidem voluptates libero temporibus dolorem quam, soluta aliquid optio minima iusto eligendi maxime repellendus voluptas! Quos autem omnis, cumque obcaecati culpa reprehenderit accusantium deserunt distinctio tempora! Beatae labore perferendis nobis possimus dolorem quisquam, cumque molestias debitis sit asperiores consequuntur ipsam est facere ullam, nostrum sint eius accusamus nam. Accusantium voluptatibus, tempore nobis quasi temporibus eos necessitatibus similique ipsam, corrupti ab corporis eius quae vitae natus quia, fugit neque nam animi accusamus error voluptate aperiam voluptas magnam expedita? Vel cum quis ea nihil cumque, reiciendis laborum ipsa ipsam, ab inventore dolorem. Dolore perspiciatis, molestiae sequi ut, nemo cum doloribus ipsam nam earum, itaque officiis dolores provident quas. Voluptatibus vitae iure voluptatem blanditiis numquam, voluptate accusantium vel, nemo accusamus, quisquam excepturi? Deleniti reiciendis doloremque quia necessitatibus fuga minima in tenetur mollitia, fugiat, explicabo laborum hic molestias. Accusamus fugiat vel deleniti cupiditate, dignissimos velit tenetur amet sequi enim minus eligendi eaque dolores, perspiciatis voluptates sed facere est reprehenderit numquam facilis illo? Quisquam, vel fugit? Dolorem, numquam harum voluptatem ipsa corrupti culpa doloribus illum. Repellendus, deserunt quas voluptas ducimus ipsa, assumenda iure, tempore voluptates ea nam culpa quam commodi doloremque? Cum id non sequi quo, rem dolorem modi illo repellat molestias reiciendis molestiae, amet consequuntur repudiandae voluptates minima consectetur ea voluptatibus architecto corporis similique velit exercitationem hic soluta. Reiciendis, dicta eligendi. Iste velit, odit nisi corporis perspiciatis maiores maxime laboriosam amet? Velit quibusdam in perspiciatis, nulla iusto quaerat culpa a quae, consequatur officia sint soluta vero laboriosam maiores. Repudiandae, eius harum? Iusto, laboriosam! Numquam minima tenetur aperiam dicta inventore!
      </p>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.contentChildren}>
            {/* ── Existing headline block (unchanged) ── */}
            <div className={styles.cc1}>
              <div className={styles.left}>
                <h1 className={styles.heading}>
                  Black Car Service in Phoenix &amp; Scottsdale — <br className={styles.break} /> Trusted Since
                  2004
                </h1>
                <p className={styles.copy}>
                  At Nier Transportation, we&apos;re more than a car service;
                  we&apos;re your trusted partner in high end transportation.
                </p>
                <div className={styles.btnContainerii}>
                  <Button
                    href='/book'
                    text='Book your Ride'
                    btnType='red'
                    arrow
                  />
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.widgetRow}>
                  <HomeBookingWidget
                    serviceTypes={serviceTypes}
                    vehicles={vehicles}
                    companyTimezone={companyTimezone}
                    companyTimezoneLabel={companyTimezoneLabel}
                  />
                </div>
              </div>
            </div>

            {/* ── Quick-book widget ── */}
            {/* Sits below the headline, left-aligned.
                On mobile it stacks naturally since the hero is single-column. */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
