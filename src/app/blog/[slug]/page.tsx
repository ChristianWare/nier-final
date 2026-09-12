import styles from "./BlogPostPage.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Nav from "@/components/shared/Nav/Nav";
import Image from "next/image";
import { notFound } from "next/navigation";
import MoreInsights from "@/components/BlogPage/MoreInsights/MoreInsights";
import type { Metadata } from "next";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import TableOfContents from "./TableOfContents";
import { SITE_URL } from "@/lib/site";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { getAllPosts, getPostBySlug, slugify } from "@/lib/blog";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

const CLIENT_NAME = process.env.CLIENT_NAME || "Nier Transportation";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug.current }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || (process.env.NODE_ENV === "production" && post.draft)) {
    return {
      title: `Post not found | ${CLIENT_NAME}`,
      robots: { index: false },
    };
  }

  const title = `${post.title}`;
  const description =
    post.excerpt ||
    `Read this article from ${CLIENT_NAME} on luxury ground transportation in Phoenix and Scottsdale.`;
  const ogImage = post.coverImage
    ? `${SITE_URL}${post.coverImage.src}`
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
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.coverImage?.alt || post.title,
        },
      ],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags?.map((t) => t.name),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ── helpers for the MDX component map ──
function getText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getText).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    (children as { props?: { children?: ReactNode } }).props
  ) {
    return getText(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

const mdxComponents: MDXComponents = {
  h2: ({ children }) => {
    const id = slugify(getText(children));
    return (
      <h2 id={id} className={`${styles.ptH2}`}>
        {children}
      </h2>
    );
  },
  h3: ({ children }) => <h3 className={styles.ptH3}>{children}</h3>,
  p: ({ children }) => <p className={styles.ptP}>{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className={styles.ptBlockquote}>{children}</blockquote>
  ),
  ul: ({ children }) => <ul className={styles.ptUl}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.ptOl}>{children}</ol>,
  li: ({ children }) => <li className={styles.ptLi}>{children}</li>,
  strong: ({ children }) => (
    <strong className={styles.ptStrong}>{children}</strong>
  ),
  em: ({ children }) => <em className={styles.ptEm}>{children}</em>,
  code: ({ children }) => <code className={styles.ptCode}>{children}</code>,
  hr: () => <hr className={styles.ptHr} />,
  a: ({ href, children }) => {
    const url = href || "#";
    const isExternal = /^https?:\/\//.test(url);
    return (
      <a
        href={url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={styles.ptLink}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string") return null;
    const altText = alt || "Blog image";
    return (
      <figure className={styles.ptImage}>
        <Image
          src={src}
          alt={altText}
          title={altText}
          width={1600}
          height={900}
          className={styles.ptImageEl}
          style={{ width: "100%", height: "auto" }}
        />
        {alt ? <figcaption className={styles.ptCaption}>{alt}</figcaption> : null}
      </figure>
    );
  },
  table: ({ children }) => (
    <div className={styles.ptTableWrap}>
      <table className={styles.ptTable}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={styles.ptThead}>{children}</thead>,
  th: ({ children }) => <th className={styles.ptTh}>{children}</th>,
  td: ({ children }) => <td className={styles.ptTd}>{children}</td>,
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || (process.env.NODE_ENV === "production" && post.draft))
    notFound();

  const prettyDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  const prettyEventDate = post.eventDate
    ? new Date(`${post.eventDate}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "2-digit",
        year: "numeric",
      })
    : null;

  const postUrl = `${SITE_URL}/blog/${post.slug.current}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    url: postUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
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
    ...(post.coverImage && {
      image: {
        "@type": "ImageObject",
        url: `${SITE_URL}${post.coverImage.src}`,
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
          {post.tags?.length ? (
            <ul className={styles.tags}>
              {post.tags.map((t) => (
                <li key={t._id}>
                  <SectionHeading text={t.name} dot />
                </li>
              ))}
            </ul>
          ) : null}
          <h1 className={`${styles.heading} h2`}>{post.title}</h1>
          {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
          {prettyEventDate && (
            <p className={styles.eventDate}>Event date: {prettyEventDate}</p>
          )}
        </header>

        {/* ── Cover image: full width ── */}
        {post.coverImage && (
          <div className={styles.coverWrap}>
            <Image
              src={post.coverImage.src}
              alt={post.coverImage.alt || post.title}
              title={post.coverImage.alt || post.title}
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
              <TableOfContents headings={post.headings} />
            </div>
          </aside>

          {/* Col 2: Article body */}
          <article className={styles.articleBody}>
            <MDXRemote
              source={post.content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
            <div className={styles.sideCta}>
              <p className={styles.sideCtaText}>
                Ready to book your ride with Nier Transportation?
              </p>
              <Button href='/book' text='Book your Ride' btnType='red' arrow />
            </div>
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
      <div style={{ marginBottom: '20rem' }} />
        <AboutNumbers />
    </main>
  );
}