/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./BlogPostPage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Nav from "@/components/shared/Nav/Nav";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { PortableText, PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { notFound } from "next/navigation";
import MoreInsights from "@/components/BlogPage/MoreInsights/MoreInsights";

import type { Metadata } from "next";
import SearchIcon from "@/components/shared/icons/SearchIcon/SearchIcon";
import BlogPostSidebarCategories from "@/components/BlogPage/BlogPostSidebarCategories/BlogPostSidebarCategories";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

type Tag = { _id: string; name: string; slug?: { current?: string } };

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  coverImage?: {
    _type: "image";
    asset: { _ref?: string; _type: "reference"; _id?: string };
    alt?: string;
  };
  tags?: Tag[];
  body?: any[];
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://example.com";

export const revalidate = 60;

async function getPost(slug: string): Promise<Post | null> {
  const query = `
    *[_type == "post" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      coverImage{asset, alt},
      tags[]->{ _id, name, slug },
      body[]{
        ...,
        _type == "image" => { ..., asset-> }
      }
    }
  `;
  const post = await client.fetch<Post | null>(
    query,
    { slug },
    { next: { revalidate } }
  );
  return post;
}

async function getAllTags(): Promise<Tag[]> {
  const query = `
    *[_type == "tag"] | order(name asc) {
      _id,
      name,
      slug
    }
  `;
  return client.fetch<Tag[]>(query, {}, { next: { revalidate } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post?._id) {
    return {
      title: "Post not found | Fonts & Footers",
      robots: { index: false },
    };
  }

  const title = `${post.title}`;
  const description =
    post.excerpt ||
    "Read this article from Fonts & Footers on direct-booking websites and growth for service businesses.";
  const ogImage = post.coverImage
    ? urlFor(post.coverImage).width(1200).height(630).fit("crop").url()
    : `${SITE_URL}/og-image.png`;
  const canonical = `${SITE_URL}/blog/${post.slug.current}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: post.coverImage?.alt || post.title,
            },
          ]
        : undefined,
      publishedTime: post.publishedAt,
      tags: post.tags?.map((t) => t.name),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

const ptComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref && !value?.asset?._id) return null;
      const alt = value?.alt || "Blog image";
      const src = urlFor(value).width(1600).fit("max").url();

      return (
        <figure className={styles.ptImage}>
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={900}
            className={styles.ptImageEl}
          />
          {alt ? (
            <figcaption className={styles.ptCaption}>{alt}</figcaption>
          ) : null}
        </figure>
      );
    },
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || "#";
      const isExternal = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={styles.ptLink}
        >
          {children}
        </a>
      );
    },
    strong: ({ children }) => (
      <strong className={styles.ptStrong}>{children}</strong>
    ),
    em: ({ children }) => <em className={styles.ptEm}>{children}</em>,
    code: ({ children }) => <code className={styles.ptCode}>{children}</code>,
  },
  block: {
    h2: ({ children }) => <h2 className={styles.ptH2}>{children}</h2>,
    h3: ({ children }) => <h3 className={styles.ptH3}>{children}</h3>,
    normal: ({ children }) => <p className={styles.ptP}>{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className={styles.ptBlockquote}>{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className={styles.ptUl}>{children}</ul>,
    number: ({ children }) => <ol className={styles.ptOl}>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className={styles.ptLi}>{children}</li>,
    number: ({ children }) => <li className={styles.ptLi}>{children}</li>,
  },
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post, tags] = await Promise.all([getPost(slug), getAllTags()]);

  if (!post?._id) {
    notFound();
  }

  const prettyDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  const coverSrc = post.coverImage
    ? urlFor(post.coverImage).width(2000).height(1200).fit("crop").url()
    : undefined;

  const initialCategorySlug =
    post.tags?.find((t) => t.slug?.current)?.slug?.current || "all";

  return (
    <main className={styles.container}>
      <Nav background='cream' />
      <LayoutWrapper>
        <div className={styles.top}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              {post?.tags?.length ? (
                <ul className={styles.tags}>
                  {post.tags.map((t) => (
                    <li key={t._id}>
                      {t.slug?.current ? (
                        <SectionHeading text={t.name} dot />
                      ) : (
                        <SectionHeading text='Nier Transportation' dot />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <h1 className={`${styles.heading} h2`}>{post.title}</h1>
              <div className={styles.date}>
                Barry LaNier - Owner, CEO • {prettyDate}
              </div>
            </div>

            <div className={styles.leftBottom}>
              <article className={styles.article}>
                {coverSrc && (
                  <div className={styles.imgContainer}>
                    <Image
                      src={coverSrc}
                      alt={post?.coverImage?.alt || post.title}
                      fill
                      priority
                      className={styles.img}
                    />
                  </div>
                )}

                {post?.excerpt ? (
                  <p className={styles.introText}>{post.excerpt}</p>
                ) : null}

                {post?.body?.length ? (
                  <div className={styles.body}>
                    <PortableText value={post.body} components={ptComponents} />
                  </div>
                ) : null}
              </article>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.rightContent}>
              <div className={styles.searchContainerParent}>
                <span className={`${styles.searchHeading} h3`}>Search</span>
                <div className={styles.searchContainer}>
                  <SearchIcon className={styles.icon} />
                  <small className={styles.small}>Search</small>
                </div>
              </div>
              <div className={styles.categoriesContainer}>
                <span className={`${styles.searchHeading} h3`}>Categories</span>
                <BlogPostSidebarCategories
                  tags={tags}
                  initialSlug={initialCategorySlug}
                />
              </div>
              <div className={styles.categoriesContainer}>
                <span className={`${styles.searchHeading} h3`}>
                  Recent Posts
                </span>
                <MoreInsights currentSlug={post.slug.current} />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </main>
  );
}
