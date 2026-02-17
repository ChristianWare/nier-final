"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./Events.module.css";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { urlFor } from "@/sanity/lib/image";

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

type Tab = "upcoming" | "past";

export default function EventsClient({ posts }: { posts: EventPost[] }) {
  const hasUpcoming = posts.some((post) => {
    const dateStr = (post.eventDate ?? post.publishedAt).slice(0, 10);
    return dateStr >= new Date().toISOString().slice(0, 10);
  });

  const [activeTab, setActiveTab] = useState<Tab>(
    hasUpcoming ? "upcoming" : "past",
  );

  const router = useRouter();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const { upcoming, past } = useMemo(() => {
    const upcoming: EventPost[] = [];
    const past: EventPost[] = [];

    for (const post of posts) {
      const dateStr = (post.eventDate ?? post.publishedAt).slice(0, 10);
      if (dateStr >= todayStr) {
        upcoming.push(post);
      } else {
        past.push(post);
      }
    }

    // Upcoming: soonest first
    upcoming.sort((a, b) => {
      const aDate = (a.eventDate ?? a.publishedAt).slice(0, 10);
      const bDate = (b.eventDate ?? b.publishedAt).slice(0, 10);
      return aDate.localeCompare(bDate);
    });

    // Past: most recent first
    past.sort((a, b) => {
      const aDate = (a.eventDate ?? a.publishedAt).slice(0, 10);
      const bDate = (b.eventDate ?? b.publishedAt).slice(0, 10);
      return bDate.localeCompare(aDate);
    });

    // Past: most recent first
    past.sort((a, b) => {
      const aDate = (a.eventDate ?? a.publishedAt).slice(0, 10);
      const bDate = (b.eventDate ?? b.publishedAt).slice(0, 10);
      return bDate.localeCompare(aDate);
    });

    return { upcoming: upcoming.slice(0, 10), past: past.slice(0, 10) };
  }, [posts, todayStr]);

  const displayPosts = activeTab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className={styles.tabs}>
        <button
          type='button'
          onClick={() => setActiveTab("upcoming")}
          className={`${styles.tab} ${activeTab === "upcoming" ? styles.tabActive : ""}`}
        >
          Upcoming Events
          <span className={styles.tabCount}>{upcoming.length}</span>
        </button>
        <button
          type='button'
          onClick={() => setActiveTab("past")}
          className={`${styles.tab} ${activeTab === "past" ? styles.tabActive : ""}`}
        >
          Past Events
          {past.length > 0 && (
            <span className={styles.tabCount}>{past.length}</span>
          )}
        </button>
      </div>

      <div className={styles.mapDataContainer}>
        {displayPosts.length === 0 ? (
          <p className={styles.emptyState}>
            {activeTab === "upcoming"
              ? "No upcoming events right now. Check back soon!"
              : "No past events to show."}
          </p>
        ) : (
          displayPosts.map((event) => {
            const dateStr = (event.eventDate ?? event.publishedAt).slice(0, 10);
            const img = event.coverImage
              ? urlFor(event.coverImage)
                  .width(1200)
                  .height(800)
                  .fit("crop")
                  .url()
              : undefined;
            return (
              <div
                key={event._id}
                className={styles.card}
                onClick={() => router.push(`/blog/${event.slug.current}`)}
              >
                {" "}
                <div className={styles.cardLeft}>
                  <div className={styles.dateContainer}>
                    <SectionHeading text={dateStr} dot />
                  </div>
                  <div className={styles.imgContainer}>
                    {img && (
                      <Image
                        src={img}
                        alt={event.coverImage?.alt || event.title}
                        fill
                        className={styles.img}
                      />
                    )}
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.meta}>
                    <h4 className={styles.title}>{event.title}</h4>
                    {event.excerpt ? (
                      <p className={styles.desc}>{event.excerpt}</p>
                    ) : null}
                  </div>
                  <div className={styles.circlBtnContainer}>
                    <Button
                      btnType='blackReg'
                      text='View Event'
                      href={`/blog/${event.slug.current}`}
                    />
                  </div>
                  <div className={styles.btnContainerii}>
                    <Button
                      href={`/blog/${event.slug.current}`}
                      text='More details'
                      btnType='blackReg'
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
