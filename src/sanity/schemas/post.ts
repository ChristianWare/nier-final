// schemas/post.ts
import { Rule } from "sanity";

export const post = {
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: Rule) => Rule.required().error("Title is required"),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule: Rule) => Rule.required().error("Slug is required"),
    },
    {
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    },
    {
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      validation: (Rule: Rule) =>
        Rule.max(200).warning("Shorter excerpt is usually better"),
    },
    {
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          fields: [{ name: "alt", title: "Alt text", type: "string" }],
          options: { hotspot: true },
        },
      ],
    },
    {
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    },
    {
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "reference", to: { type: "tag" } }],
    },
    {
      name: "eventDate",
      title: "Event Date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD", calendarTodayLabel: "Today" },
    },
  ],
  orderings: [
    {
      title: "Publish date, newest first",
      name: "publishDateDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
};
