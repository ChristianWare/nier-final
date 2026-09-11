import styles from "./Events.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import EventsClient from "./EventsClient";
import { getAllPosts, isEventPost } from "@/lib/blog";

type EventPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  publishedAt: string;
  eventDate?: string;
  coverImage?: { src: string; alt?: string };
};

function getAllEventPosts(): EventPost[] {
  return (
    getAllPosts()
      .filter(isEventPost)
      .map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        eventDate: p.eventDate,
        coverImage: p.coverImage,
      }))
      // Same ordering the old GROQ query used: coalesce(eventDate, publishedAt) desc.
      // EventsClient re-sorts into upcoming/past tabs either way.
      .sort((a, b) => {
        const aDate = (a.eventDate ?? a.publishedAt).slice(0, 10);
        const bDate = (b.eventDate ?? b.publishedAt).slice(0, 10);
        return bDate.localeCompare(aDate);
      })
  );
}

export default function Events() {
  const posts = getAllEventPosts();

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
