import fs from "node:fs";
import path from "node:path";

import {
  ContentError,
  legalFrontmatterSchema,
  parseFrontmatter,
  readFrontmatter,
} from "@/lib/content/frontmatter";
import { visibleItems } from "@/lib/content/drafts";
import { LEGAL_DOCUMENTS } from "@/lib/content/legal-documents";

import type { LegalDocument, LegalDocumentMeta } from "@/lib/content/types";

/**
 * Legal pages from `src/content/legal/<slug>.mdx`, in the order of
 * LEGAL_DOCUMENTS. Uses `fs`: server only.
 */

export const LEGAL_DIR = path.join(process.cwd(), "src", "content", "legal");

export function parseLegalDocument(file: string, raw: string): LegalDocument {
  const { data, body } = readFrontmatter(file, raw);
  const frontmatter = parseFrontmatter(legalFrontmatterSchema, data, file);

  const entry = LEGAL_DOCUMENTS.find((doc) => doc.slug === frontmatter.slug);

  if (!entry) {
    throw new ContentError(
      file,
      "documento fora do registro; inclua o slug em src/lib/content/legal-documents.ts.",
    );
  }

  return {
    slug: frontmatter.slug,
    label: entry.label,
    title: frontmatter.title,
    description: frontmatter.description,
    updatedAt: frontmatter.updatedAt,
    effectiveAt: frontmatter.effectiveAt,
    draft: frontmatter.draft,
    body,
    file,
  };
}

let cache: LegalDocument[] | null = null;

/** Every registered document, drafts included, in registry order. */
export function loadLegalDocuments(): LegalDocument[] {
  if (cache && process.env.NODE_ENV === "production") return cache;

  const files = fs.existsSync(LEGAL_DIR)
    ? fs.readdirSync(LEGAL_DIR).filter((file) => file.endsWith(".mdx"))
    : [];

  const documents = files.map((file) =>
    parseLegalDocument(
      file,
      fs.readFileSync(path.join(LEGAL_DIR, file), "utf8"),
    ),
  );

  // The footer and the sign-in forms link to every registered slug.
  for (const { slug } of LEGAL_DOCUMENTS) {
    if (!documents.some((doc) => doc.slug === slug)) {
      throw new ContentError(
        `${slug}.mdx`,
        "documento registrado sem arquivo.",
      );
    }
  }

  cache = LEGAL_DOCUMENTS.map(({ slug }) =>
    documents.find((doc) => doc.slug === slug)!,
  );

  return cache;
}

interface VisibilityOptions {
  includeDrafts?: boolean;
}

function visibleDocuments({
  includeDrafts,
}: VisibilityOptions = {}): LegalDocument[] {
  return visibleItems(loadLegalDocuments(), includeDrafts);
}

export function getLegalDocuments(
  options?: VisibilityOptions,
): LegalDocumentMeta[] {
  return visibleDocuments(options).map(
    ({ body: _body, file: _file, ...meta }) => meta,
  );
}

export function getLegalDocument(
  slug: string,
  options?: VisibilityOptions,
): LegalDocument | null {
  return visibleDocuments(options).find((doc) => doc.slug === slug) ?? null;
}
