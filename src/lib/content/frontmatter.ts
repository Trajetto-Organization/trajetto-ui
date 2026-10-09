import matter from "gray-matter";
import { z } from "zod";

import { BLOG_CATEGORIES } from "@/content/blog/categories";
import { MAX_PAGE_TITLE_LENGTH, TITLE_SUFFIX, siteConfig } from "@/lib/site";

/**
 * Frontmatter contracts of the MDX content. A file that breaks them fails the
 * build (every page is prerendered) and the unit suite, never production.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Keys that would put an image in a post; the blog has none by decision. */
const IMAGE_KEYS = ["image", "cover", "coverAlt", "featuredImage", "ogImage"];

/** YAML reads an unquoted 2026-09-28 as a Date at UTC midnight of that day. */
function toCalendarDay(value: unknown): unknown {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;

  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${value.getUTCFullYear()}-${month}-${day}`;
}

function isRealDay(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * A calendar day in the frontmatter: a YAML date becomes AAAA-MM-DD, and a
 * day that does not exist is refused. Shared by every MDX collection (blog,
 * legal pages, developer portal).
 */
export const calendarDay = z.preprocess(
  toCalendarDay,
  z
    .string({ required_error: "obrigatório" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato AAAA-MM-DD")
    .refine(isRealDay, "data inexistente"),
);

const TITLE_LIMIT_MESSAGE = `até ${MAX_PAGE_TITLE_LENGTH} caracteres: com "${TITLE_SUFFIX}" o título da busca chega a 60`;

/** The text that ends up in <title>, before the layout appends the brand. */
const pageTitle = z
  .string()
  .trim()
  .max(MAX_PAGE_TITLE_LENGTH, TITLE_LIMIT_MESSAGE);

const categorySlugs = Object.keys(BLOG_CATEGORIES) as [string, ...string[]];

export const blogFrontmatterSchema = z
  .object({
    title: z.string().trim().min(10).max(110),
    description: z.string().trim().min(50).max(200),
    slug: z.string().regex(SLUG_PATTERN, "use kebab-case sem acentos"),
    date: calendarDay,
    updated: calendarDay.optional(),
    category: z.enum(categorySlugs, {
      errorMap: () => ({
        message: `categoria desconhecida; use uma de: ${categorySlugs.join(", ")} (src/content/blog/categories.ts)`,
      }),
    }),
    tags: z.array(z.string().trim().min(2).max(40)).min(1).max(8),
    // Decision 10.3: posts are signed by the team.
    author: z.literal(siteConfig.blogAuthor).default(siteConfig.blogAuthor),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    seo: z
      .object({
        // Search result title; `title` stays the h1 and the social card.
        title: pageTitle.optional(),
        description: z.string().trim().max(160).optional(),
        keywords: z.array(z.string().trim().min(2)).max(12).default([]),
      })
      .strict()
      .default({}),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.updated && value.updated < value.date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updated"],
        message: "não pode ser anterior a date",
      });
    }

    if (!value.seo.title && value.title.length > MAX_PAGE_TITLE_LENGTH) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seo", "title"],
        message: `obrigatório quando title passa de ${MAX_PAGE_TITLE_LENGTH} caracteres (${value.title.length}); ${TITLE_LIMIT_MESSAGE}`,
      });
    }
  });

export const legalFrontmatterSchema = z
  .object({
    title: pageTitle.min(5),
    description: z.string().trim().min(30).max(200),
    slug: z.string().regex(SLUG_PATTERN, "use kebab-case sem acentos"),
    updatedAt: calendarDay,
    effectiveAt: calendarDay,
    draft: z.boolean().default(false),
  })
  .strict();

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
export type LegalFrontmatter = z.infer<typeof legalFrontmatterSchema>;

export class ContentError extends Error {
  constructor(file: string, message: string) {
    super(`[conteúdo] ${file}: ${message}`);
    this.name = "ContentError";
  }
}

/** How gray-matter spells YAML after the opening "---" (nothing = YAML). */
const YAML_LANGUAGES = new Set(["", "yaml", "yml"]);

/**
 * Splits a file into its frontmatter and its body. Only YAML is read.
 *
 * Content is data. gray-matter reads a block opened with `---js` through
 * eval(), and `---json` or `---coffee` through other engines. Any language
 * other than YAML is refused, using gray-matter's own detection. The
 * JavaScript engine is also replaced, so eval() cannot run at all.
 */
export function readFrontmatter(
  file: string,
  raw: string,
): { data: Record<string, unknown>; body: string } {
  const refuse = (): never => {
    throw new ContentError(
      file,
      'frontmatter só em YAML: abra o bloco com "---" sozinho na primeira linha.',
    );
  };

  // Seen as gray-matter sees it: without a BOM, and "----" opens no block.
  const text = raw.replace(/^﻿/, "");
  const opensBlock = matter.test(text) && text.charAt(3) !== "-";

  if (
    opensBlock &&
    !YAML_LANGUAGES.has(matter.language(text).name.toLowerCase())
  ) {
    refuse();
  }

  try {
    // Passing options also turns off gray-matter's cache keyed by content.
    const { data, content } = matter(raw, {
      engines: { javascript: refuse, js: refuse },
    });

    return { data, body: content };
  } catch (error) {
    if (error instanceof ContentError) throw error;

    // A YAML syntax error names the line; without the file, nobody can find it.
    const reason = error instanceof Error ? error.message : String(error);
    throw new ContentError(file, `frontmatter inválido: ${reason}`);
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map(
      (issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`,
    )
    .join("; ");
}

/**
 * Validates one file's frontmatter. The slug must match the file name: the
 * URL comes from the file, so a divergent slug would link to the wrong place.
 */
export function parseFrontmatter<T extends z.ZodTypeAny>(
  schema: T,
  data: Record<string, unknown>,
  file: string,
  options: { forbidImages?: boolean } = {},
): z.infer<T> {
  if (options.forbidImages) {
    const imageKey = IMAGE_KEYS.find((key) => key in data);

    if (imageKey) {
      throw new ContentError(
        file,
        `"${imageKey}" não é aceito: o blog não usa imagens (a imagem social é gerada por post).`,
      );
    }
  }

  const result = schema.safeParse(data);
  if (!result.success)
    throw new ContentError(file, describeIssues(result.error));

  const expectedSlug = file.replace(/\.mdx$/, "");

  if (result.data.slug !== expectedSlug) {
    throw new ContentError(
      file,
      `slug "${result.data.slug}" difere do nome do arquivo ("${expectedSlug}").`,
    );
  }

  return result.data;
}
