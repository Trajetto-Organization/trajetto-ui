import { createElement, type ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

import { evaluateSync } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

import type { MdxComponents } from "@/lib/content/mdx";

/**
 * The descriptions of the OpenAPI document, which are CommonMark.
 *
 * Compiled as plain markdown (`format: "md"`), not MDX: text from the
 * document is data, so `{` and `<` are characters, and raw HTML is dropped by
 * the compiler. Synchronous, so the reference renders in one pass and tests
 * can render it with renderToStaticMarkup. Each distinct text is compiled
 * once per process: the document changes only when the API is deployed.
 */

const compiled = new Map<
  string,
  ComponentType<{ components?: MdxComponents }>
>();

/** A ceiling well above the document's few hundred texts; never grows unbounded. */
const MAX_ENTRIES = 2_000;

function compile(
  source: string,
): ComponentType<{ components?: MdxComponents }> {
  const cached = compiled.get(source);

  if (cached) return cached;

  const { default: Content } = evaluateSync(source, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as never,
    jsxs: runtime.jsxs as never,
    development: false,
    format: "md",
    remarkPlugins: [remarkGfm],
  });

  if (compiled.size >= MAX_ENTRIES) compiled.clear();
  compiled.set(source, Content);

  return Content;
}

interface MarkdownProps {
  source: string | undefined;
  components: MdxComponents;
}

const Markdown = ({ source, components }: MarkdownProps) => {
  if (!source?.trim()) return null;

  return createElement(compile(source), { components });
};

export { Markdown };
