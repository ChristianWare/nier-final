import styles from "./Events.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { client } from "@/sanity/lib/client";
import EventsClient from "./EventsClient";

type EventPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  publishedAt: string;
  eventDate?: string;
  coverImage?: {
    _type: "image";
    asset: { _ref: string; _type: "reference" };
    alt?: string;
  };
};

async function getAllEventPosts(): Promise<EventPost[]> {
  const query = `
    *[
      _type == "post" &&
      (
        "events" in tags[]->slug.current ||
        "events" in tags
      )
    ] | order(coalesce(dateTime(eventDate), publishedAt) desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      eventDate,
      coverImage{asset, alt, _type}
    }
  `;
  return client.fetch(query, {}, { next: { revalidate: 60 } });
}

export default async function Events() {
  const posts = await getAllEventPosts();

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Local Events' dot />
            <h3 className={styles.heading}>
              We provide transportation to all <br className={styles.br} />{" "}
              upcoming events in Phoenix and Beyond
            </h3>
          </div>
          <div className={styles.bottom}>
            <EventsClient posts={posts} />
            <div className={styles.btnContainer}>
              <Button
                href='/blog?tag=events'
                text='See all events'
                btnType='black'
                arrow
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
