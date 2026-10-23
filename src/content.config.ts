import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const shared = {
  title: z.string(),
  description: z.string(),
  lang: z.literal('en'),
  slug: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
};

export const collections = {
  resume: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/resume' }),
    schema: z.object({
      lang: z.literal('en'),
      published: z.boolean().default(false),
      experiences: z.array(z.object({
        company: z.string(),
        role: z.string(),
        start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        end: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        logo: z.string(),
      })).default([]),
      awards: z.array(z.object({
        competition: z.string(),
        prize: z.string(),
      })).default([]),
    }),
  }),
  cases: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/cases', generateId: ({ data }) => `${data.lang}/${data.slug}` }),
    schema: z.object({
      ...shared, repository: z.string(), pr: z.number(),
      order: z.number(), evidence: z.string(),
    }),
  }),
  writing: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/writing', generateId: ({ data }) => `${data.lang}/${data.slug}` }),
    schema: z.object(shared),
  }),
};
