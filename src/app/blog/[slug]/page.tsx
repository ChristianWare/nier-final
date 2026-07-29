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
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import TableOfContents from "./TableOfContents";
import { SITE_URL } from "@/lib/site";
import Link from "next/link";

type Tag = { _id: string; name: string; slug?: { current?: string } };

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  relatedLink?: { label?: string; href?: string };
  coverImage?: {
    _type: "image";
    asset: { _ref?: string; _type: "reference"; _id?: string };
    alt?: string;
  };
  tags?: Tag[];
  body?: any[];
};

const CLIENT_NAME = process.env.CLIENT_NAME || "Nier Transportation";

// const SITE_URL =
//   process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://example.com";

export const revalidate = 60;

async function getPost(slug: string): Promise<Post | null> {
  const query = `
    *[_type == "post" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      relatedLink,
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
    { next: { revalidate } },
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
      title: `Post not found | ${CLIENT_NAME}`,
      robots: { index: false },
    };
  }

  const title = `${post.title}`;
  const description =
    post.excerpt ||
    `Read this article from ${CLIENT_NAME} on direct-booking websites and growth for service businesses.`;
  const ogImage = post.coverImage
    ? urlFor(post.coverImage).width(1200).height(630).fit("crop").url()
    : `${SITE_URL}/og-image.png`;
  const canonical = `${SITE_URL}/blog/${post.slug.current}`;

  return {
    title,
    description,
    alternates: { canonical },
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractHeadings(body: any[]): { text: string; id: string }[] {
  return body
    .filter((b) => b._type === "block" && b.style === "h2")
    .map((b) => {
      const text = b.children?.map((c: any) => c.text).join("") || "";
      return { text, id: slugify(text) };
    })
    .filter((h) => h.text.length > 0);
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
            title={alt}
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
    h2: ({ children, value }) => {
      const text = value?.children?.map((c: any) => c.text).join("") || "";
      const id = slugify(text);
      return (
        <h2 id={id} className={`${styles.ptH2} cardTitleii h2`}>
          {children}
        </h2>
      );
    },
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
  const [post] = await Promise.all([getPost(slug), getAllTags()]);

  if (!post?._id) notFound();

  const prettyDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  const coverSrc = post.coverImage
    ? urlFor(post.coverImage).width(2000).height(1200).fit("crop").url()
    : undefined;

  const headings = post.body ? extractHeadings(post.body) : [];
  const postUrl = `${SITE_URL}/blog/${post.slug.current}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    url: postUrl,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Person",
      name: "Barry LaNier",
      jobTitle: "Owner, CEO",
      worksFor: { "@type": "Organization", name: CLIENT_NAME },
    },
    publisher: {
      "@type": "Organization",
      name: CLIENT_NAME,
      logo: {
        "@type": "ImageObject",
        url: "https://www.niertransportation.com/nierLogo.png",
      },
    },
    ...(coverSrc && {
      image: {
        "@type": "ImageObject",
        url: coverSrc,
        width: 2000,
        height: 1200,
      },
    }),
    ...(post.tags?.length && {
      keywords: post.tags.map((t) => t.name).join(", "),
    }),
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
  };

  return (
    <main className={styles.container}>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Nav background='white' />

      <LayoutWrapper>
        {/* ── Post header: tags + title + excerpt ── */}
        <header className={styles.header}>
          {post?.tags?.length ? (
            <ul className={styles.tags}>
              {post.tags.map((t) => (
                <li key={t._id}>
                  <SectionHeading
                    text={t.slug?.current ? t.name : CLIENT_NAME}
                    dot
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <h1 className={`${styles.heading} h2`}>{post.title}</h1>
          {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        </header>

        {/* ── Cover image: full width ── */}
        {coverSrc && (
          <div className={styles.coverWrap}>
            <Image
              src={coverSrc}
              alt={post?.coverImage?.alt || post.title}
              title={post?.coverImage?.alt || post.title}
              fill
              priority
              className={styles.coverImg}
            />
          </div>
        )}

        {post.relatedLink?.href && post.relatedLink?.label && (
          <p className={styles.relatedCta}>
            Related:{" "}
            <Link href={post.relatedLink.href}>{post.relatedLink.label}</Link>
          </p>
        )}

        {/* ── Author + share bar ── */}
        <div className={styles.authorBar}>
          <div className={styles.authorLeft}>
            <div className={styles.authorAvatar}>BL</div>
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>Barry LaNier</span>
              <span className={styles.authorRole}>
                Owner, CEO • {prettyDate}
              </span>
            </div>
          </div>
          <div className={styles.shareRow}>
            <span className={styles.shareLabel}>Share</span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.shareBtn}
              aria-label='Share on Facebook'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.shareBtn}
              aria-label='Share on LinkedIn'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z' />
                <rect x='2' y='9' width='4' height='12' />
                <circle cx='4' cy='4' r='2' />
              </svg>
            </a>
            <a
              href={`https://x.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.shareBtn}
              aria-label='Share on X'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Three-column body ── */}
        <div className={styles.threeCol}>
          {/* Col 1: Sticky sidebar — CTA + TOC */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSticky}>
              <div className={styles.sideCta}>
                <p className={styles.sideCtaText}>
                  Ready to book your ride with Nier Transportation?
                </p>
                <Button
                  href='/book'
                  text='Book your Ride'
                  btnType='red'
                  arrow
                />
              </div>
              <TableOfContents headings={headings} />
            </div>
          </aside>

          {/* Col 2: Article body */}
          <article className={styles.articleBody}>
            {post?.body?.length ? (
              <PortableText value={post.body} components={ptComponents} />
            ) : null}
          </article>

          {/* Col 3: More insights */}
          <aside className={styles.insightsSidebar}>
            <div className={styles.sidebarSticky}>
              <span className={`${styles.insightsHeading} h4`}>
                More Articles
              </span>
              <MoreInsights currentSlug={post.slug.current} />
            </div>
          </aside>
        </div>
      </LayoutWrapper>
    </main>
  );
}
