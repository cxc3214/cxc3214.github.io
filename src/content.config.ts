import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    updated: z.date().optional(),
    tags: z.array(z.string()),
    topic: z.enum(["web", "engineering", "data"]),
    kind: z.enum(["仓库实践", "排查记录", "技术指南", "设计笔记"]),
    scope: z.string(),
  }),
});

export const collections = { blog };
