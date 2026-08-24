import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Every page on the site is one .mdx file in src/content/pages/.
 * The filename is the slug: `huisarts.mdx` → /pages/huisarts.
 * `home.mdx` is special-cased to render at /.
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    /** Page title; rendered as "Grip – {title}" and used for og:title. */
    title: z.string(),
    description: z.string().default(''),
    /**
     * `page` renders the MDX body as-is.
     * `news` adds the article masthead, publication date and share links.
     */
    type: z.enum(['page', 'news']).default('page'),
    /** Publication date — required for news articles, which sort on it. */
    date: z.coerce.date().optional(),
    /** Cover image: the article masthead and the news index card. */
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    /** Breadcrumb label; falls back to the title. */
    crumb: z.string().optional(),
    /** Which top-level nav item to mark active on this page. */
    nav: z.enum(['huisarts', 'patient', 'nieuws', 'over-ons']).optional(),
  }),
});

export const collections = { pages };
