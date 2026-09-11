import fs from "fs";
import path from "path";
import matter from "gray-matter";

/**
 * File-based blog content layer.
 * Posts live in /content/blog/*.mdx — filename (minus .mdx) IS the slug.
 * Shapes intentionally mirror the old Sanity types (slug.current, tag objects)
 * so the existing components keep working with minimal changes.
 * Server-only: import from server components, never from "use client" files.
 */

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export type BlogTag = {
  _id: string;
  name: string;
  slug: { current: string };
};

export type BlogPost = {
  _id: string; // = slug (stable key for React lists)
  title: string;
  slug: { current: string };
  publishedAt: string; // ISO
  updatedAt: string; // ISO — falls back to publishedAt
  excerpt?: string;
  relatedLink?: { label?: string; href?: string };
  coverImage?: { src: string; alt?: string };
  tags?: BlogTag[];
  eventDate?: string; // "YYYY-MM-DD" — powers the homepage Events section
  draft?: boolean;
  content: string; // raw MDX body
  headings: { text: string; id: string }[]; // H2s, for the TOC
};

// ── identical to the slugify the TOC anchors have always used ──
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function cleanHeadingText(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/[*_`]/g, "")
    .trim();
}

function extractHeadings(content: string): { text: string; id: string }[] {
  return content
    .split("\n")
    .filter((line) => /^##\s+/.test(line)) // H2s only, same as before
    .map((line) => {
      const text = cleanHeadingText(line.replace(/^##\s+/, ""));
      return { text, id: slugify(text) };
    })
    .filter((h) => h.text.length > 0);
}

function toISO(value: unknown, fallback?: string): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback ?? new Date().toISOString();
}

function toDateOnly(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) return value.slice(0, 10);
  return undefined;
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.mdx?$/, ""));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const mdxPath = path.join(POSTS_DIR, `${slug}.mdx`);
  const mdPath = path.join(POSTS_DIR, `${slug}.md`);
  const fullPath = fs.existsSync(mdxPath)
    ? mdxPath
    : fs.existsSync(mdPath)
      ? mdPath
      : null;
  if (!fullPath) return null;

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  const publishedAt = toISO(data.publishedAt);
  const tagNames: string[] = Array.isArray(data.tags)
    ? data.tags.map((t: unknown) => String(t)).filter(Boolean)
    : [];

  const tags: BlogTag[] = tagNames.map((name) => ({
    _id: slugify(name),
    name,
    slug: { current: slugify(name) },
  }));

  const coverImage =
    typeof data.coverImage === "string" && data.coverImage.trim()
      ? {
          src: data.coverImage as string,
          alt: (data.coverImageAlt as string) || (data.title as string) || "",
        }
      : undefined;

  const relatedLink =
    data.relatedLinkHref && data.relatedLinkLabel
      ? {
          label: String(data.relatedLinkLabel),
          href: String(data.relatedLinkHref),
        }
      : undefined;

  return {
    _id: slug,
    title: String(data.title ?? slug),
    slug: { current: slug },
    publishedAt,
    updatedAt: toISO(data.updatedAt, publishedAt),
    excerpt: data.excerpt ? String(data.excerpt) : undefined,
    relatedLink,
    coverImage,
    tags: tags.length ? tags : undefined,
    eventDate: toDateOnly(data.eventDate),
    draft: data.draft === true,
    content,
    headings: extractHeadings(content),
  };
}

/** All posts, newest first. Drafts are excluded in production builds. */
export function getAllPosts(): BlogPost[] {
  const posts = getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is BlogPost => p !== null)
    .filter((p) => process.env.NODE_ENV !== "production" || !p.draft);

  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getAllTags(): BlogTag[] {
  const map = new Map<string, BlogTag>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags ?? []) map.set(tag._id, tag);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function isEventPost(post: BlogPost): boolean {
  return (post.tags ?? []).some((t) => t.slug.current === "events");
}
