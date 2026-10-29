import type { ComponentPropsWithoutRef } from "react";

import { baseMdxComponents } from "@/components/mdx";
import { MdxLink } from "@/components/mdx/mdx-link";
import type { MdxComponents } from "@/lib/content/mdx";
import { cn } from "@/lib/utils";

import { DocsPre } from "./code-block";
import { DOCS_INLINE_CODE, DOCS_LINK } from "./docs-type";

/**
 * Markdown from the OpenAPI document (descriptions of endpoints, fields and
 * headers), set smaller than an article's body: it sits inside tables and
 * cards, next to the thing it describes.
 */
type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

const specProseComponents: MdxComponents = {
  ...baseMdxComponents,
  p: (props: Props<"p">) => (
    <p
      className="mb-2 text-sm leading-relaxed text-site-muted last:mb-0"
      {...props}
    />
  ),
  ul: (props: Props<"ul">) => (
    <ul
      className="mb-2 list-disc space-y-1 pl-5 text-sm text-site-muted marker:text-site-pink"
      {...props}
    />
  ),
  ol: (props: Props<"ol">) => (
    <ol
      className="mb-2 list-decimal space-y-1 pl-5 text-sm text-site-muted marker:text-site-ink"
      {...props}
    />
  ),
  code: (props: Props<"code">) => (
    <code className={DOCS_INLINE_CODE} {...props} />
  ),
  h2: (props: Props<"h2">) => (
    <p className="mb-1 mt-3 text-sm font-semibold text-site-ink" {...props} />
  ),
  h3: (props: Props<"h3">) => (
    <p className="mb-1 mt-3 text-sm font-semibold text-site-ink" {...props} />
  ),
  strong: (props: Props<"strong">) => (
    <strong className="font-semibold text-site-ink" {...props} />
  ),
  a: ({ className, ...props }: Props<"a">) => (
    <MdxLink {...props} className={cn(DOCS_LINK, className)} />
  ),
  // An example inside a description gets the same frame and copy button.
  pre: DocsPre,
};

export { specProseComponents };
