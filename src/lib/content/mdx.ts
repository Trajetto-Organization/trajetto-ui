import { createElement, type ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

import { evaluate } from "@mdx-js/mdx";

import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { ContentError } from "@/lib/content/frontmatter";
import type { TocItem } from "@/lib/content/types";

/**
 * MDX → React, on the server only.
 *
 * Every blog post and legal page is prerendered, so this runs at build time;
 * the compiler never reaches the browser. The same function renders the page
 * and backs the unit suite that compiles every file, so a post that renders
 * in the test renders in the build.
 */

/** The slice of mdast/hast these plugins read. */
interface ContentNode {
  type: string;
  depth?: number;
  name?: string | null;
  tagName?: string;
  value?: string | null | { type?: string };
  attributes?: ContentNode[];
  properties?: Record<string, unknown>;
  data?: { estree?: { body?: unknown[] } | null };
  children?: ContentNode[];
}

function walk(node: ContentNode, visit: (node: ContentNode) => void): void {
  visit(node);
  node.children?.forEach((child) => walk(child, visit));
}

function textOf(node: ContentNode): string {
  if (node.type === "text")
    return typeof node.value === "string" ? node.value : "";

  return (node.children ?? []).map(textOf).join("");
}

/** JSX tags that would put an image on the page. */
const IMAGE_ELEMENTS = new Set(["img", "Image", "picture", "svg", "video"]);

const JSX_ELEMENTS = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);

interface GuardOptions {
  file: string;
  allowImages: boolean;
  /** The only JSX names the content may use: the page's own components. */
  jsxNames: ReadonlySet<string>;
}

/**
 * Only comments (or nothing) inside the braces. Decided on the parsed
 * program, not on the text: `{/* a *\/ code() /* b *\/}` starts and ends
 * like a comment and still runs code.
 */
function isCommentOnly(node: ContentNode): boolean {
  return node.data?.estree?.body?.length === 0;
}

/**
 * Rules the content must follow, enforced where the MDX is parsed:
 * - no `#` heading: the page renders the only <h1>;
 * - no import/export and no `{expression}` other than comments: content is
 *   data;
 * - JSX only for the page's own components, with plain string attributes.
 *   A raw JSX tag bypasses the component map, so a JSX <a> would skip the
 *   link scheme check and a <script> would run on the dashboard's origin;
 * - no image when the collection has none (the blog, decision 10.1).
 */
function remarkContentGuard({ file, allowImages, jsxNames }: GuardOptions) {
  const allowed = [...jsxNames].sort().join(", ") || "nenhum";

  return (tree: ContentNode) => {
    walk(tree, (node) => {
      if (node.type === "heading" && node.depth === 1) {
        throw new ContentError(
          file,
          `título "# ${textOf(node)}" no corpo; o título da página já é o h1, comece as seções com ##.`,
        );
      }

      if (node.type === "mdxjsEsm") {
        throw new ContentError(
          file,
          "import/export não é aceito no conteúdo; use os componentes do mapa MDX.",
        );
      }

      if (
        (node.type === "mdxFlowExpression" ||
          node.type === "mdxTextExpression") &&
        !isCommentOnly(node)
      ) {
        const code = typeof node.value === "string" ? node.value : "";

        throw new ContentError(
          file,
          `expressão "{${code}}" não é aceita; escape a chave como \\{ se ela for texto. Comentários {/* … */} são aceitos.`,
        );
      }

      const isMarkdownImage =
        node.type === "image" || node.type === "imageReference";
      const isJsx = JSX_ELEMENTS.has(node.type);

      if (
        !allowImages &&
        (isMarkdownImage || (isJsx && IMAGE_ELEMENTS.has(node.name ?? "")))
      ) {
        throw new ContentError(
          file,
          "imagem no corpo; este conteúdo não usa imagens (decisão 10.1).",
        );
      }

      if (!isJsx) return;

      if (!node.name || !jsxNames.has(node.name)) {
        throw new ContentError(
          file,
          `elemento <${node.name ?? ""}> não é aceito; use markdown ou um dos componentes desta página: ${allowed}.`,
        );
      }

      const hasCode = (node.attributes ?? []).some(
        (attribute) =>
          attribute.type === "mdxJsxExpressionAttribute" ||
          (typeof attribute.value === "object" &&
            attribute.value?.type === "mdxJsxAttributeValueExpression"),
      );

      if (hasCode) {
        throw new ContentError(
          file,
          `atributo com expressão em <${node.name}>; use só texto entre aspas, como type="dica".`,
        );
      }
    });
  };
}

/** Collects the ## and ### headings, after rehype-slug gave them ids. */
function rehypeCollectToc({ toc }: { toc: TocItem[] }) {
  return (tree: ContentNode) => {
    walk(tree, (node) => {
      if (node.type !== "element") return;
      if (node.tagName !== "h2" && node.tagName !== "h3") return;

      const id = node.properties?.id;
      if (typeof id !== "string") return;

      toc.push({
        id,
        text: textOf(node).trim(),
        level: node.tagName === "h2" ? 2 : 3,
      });
    });
  };
}

/**
 * Names each table after the heading of the section it sits in ("Tabela:
 * Dados que coletamos"), so the scroll regions the table components wrap
 * them in are told apart in a screen reader's landmark list. A second table
 * in the same section gets its position; a table before any heading, its
 * number on the page. The table components read the result through
 * TABLE_LABEL_PROP (./table-label).
 */
function rehypeTableLabels() {
  return (tree: ContentNode) => {
    let heading: string | null = null;
    let inSection = 0;
    let unlabeled = 0;

    walk(tree, (node) => {
      if (node.type !== "element") return;

      if (
        node.tagName === "h2" ||
        node.tagName === "h3" ||
        node.tagName === "h4"
      ) {
        heading = textOf(node).trim() || null;
        inSection = 0;
        return;
      }

      if (node.tagName !== "table") return;

      let label: string;

      if (heading) {
        inSection += 1;
        label = `Tabela: ${heading}${inSection > 1 ? ` (${inSection})` : ""}`;
      } else {
        unlabeled += 1;
        label = `Tabela ${unlabeled}`;
      }

      node.properties = { ...node.properties, dataTableLabel: label };
    });
  };
}

export type MdxComponents = Record<string, ComponentType<any>>;

export interface RenderedMdx {
  /** Already bound to the map the content was checked against. */
  Content: ComponentType;
  toc: TocItem[];
}

/** Capitalised keys are components; lowercase ones restyle markdown. */
function componentNames(components: MdxComponents): Set<string> {
  return new Set(Object.keys(components).filter((name) => /^[A-Z]/.test(name)));
}

export async function renderMdx(
  source: string,
  {
    file,
    components,
    allowImages = false,
  }: { file: string; components: MdxComponents; allowImages?: boolean },
): Promise<RenderedMdx> {
  const toc: TocItem[] = [];
  const jsxNames = componentNames(components);

  try {
    const { default: Compiled } = await evaluate(source, {
      Fragment: runtime.Fragment,
      jsx: runtime.jsx as never,
      jsxs: runtime.jsxs as never,
      development: false,
      remarkPlugins: [
        remarkGfm,
        [remarkContentGuard, { file, allowImages, jsxNames }],
      ],
      rehypePlugins: [
        rehypeSlug,
        [rehypeCollectToc, { toc }],
        rehypeTableLabels,
      ],
    });

    const Content = () => createElement(Compiled, { components });

    return { Content, toc };
  } catch (error) {
    if (error instanceof ContentError) throw error;

    // Syntax errors from the MDX parser say where, not which file.
    throw new ContentError(file, (error as Error).message);
  }
}
