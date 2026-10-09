import type { ComponentPropsWithoutRef, ComponentType } from "react";

import {
  EditorialCallout,
  editorialMdxComponents,
} from "@/components/site/editorial/prose";
import type { MdxComponents } from "@/lib/content/mdx";
import { cn } from "@/lib/utils";

import { DOCS_CONSOLE_PATH } from "../_lib/navigation";
import { fetchPublicSpec, type PublicSpec } from "../_lib/public-spec";

import { CodeTabs, DocsPre } from "./code-block";
import { DOCS_LINK } from "./docs-type";
import { GUIDE_SPEC_VIEWS } from "./guide-spec";

/**
 * The components a guide may use: the site's editorial prose (the blog and
 * legal type, decision 16) with the portal's pink as the accent (`--acc`, set
 * by the guide page), code frames with a copy button, tabs of the same
 * example in several languages, callouts, and the views that print numbers
 * from the public document.
 */

type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

const EditorialLink = editorialMdxComponents.a as ComponentType<Props<"a">>;
const EditorialH2 = editorialMdxComponents.h2 as ComponentType<Props<"h2">>;

/**
 * The console link is a redirect to the API's origin: a plain anchor in a new
 * tab, not a prefetched client navigation that would follow it cross-origin.
 */
const DocsLink = ({ href, children, className, ...rest }: Props<"a">) =>
  href === DOCS_CONSOLE_PATH ? (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(DOCS_LINK, className)}
    >
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  ) : (
    <EditorialLink href={href} className={className} {...rest}>
      {children}
    </EditorialLink>
  );

const guideMarkdown: MdxComponents = {
  ...editorialMdxComponents,
  a: DocsLink,
  // The first section opens right under the page header: no top gap.
  h2: ({ className, children, ...props }: Props<"h2">) => (
    <EditorialH2 className={cn("first:mt-0", className)} {...props}>
      {children}
    </EditorialH2>
  ),
  pre: DocsPre,
  Callout: EditorialCallout,
  CodeTabs,
};

type SpecView = ComponentType<
  { spec: PublicSpec | null } & Record<string, unknown>
>;

const VIEWS = GUIDE_SPEC_VIEWS as unknown as Record<string, SpecView>;

/** Bound to a given document: the tests, and anything rendered once. */
function docsMdxComponentsFor(spec: PublicSpec | null): MdxComponents {
  return {
    ...guideMarkdown,
    ...Object.fromEntries(
      Object.entries(VIEWS).map(([name, View]) => [
        name,
        (props: Record<string, unknown>) => <View {...props} spec={spec} />,
      ]),
    ),
  };
}

/**
 * Bound to the live document: each view is a server component that reads it
 * when the page renders. Next deduplicates the identical requests of one
 * render and serves them from its data cache, so a guide with five views asks
 * the API at most once every few minutes. Static, so a compiled guide can be
 * kept per process.
 */
const docsMdxComponents: MdxComponents = {
  ...guideMarkdown,
  ...Object.fromEntries(
    Object.entries(VIEWS).map(([name, View]) => {
      const Live = async (props: Record<string, unknown>) => (
        <View {...props} spec={await fetchPublicSpec()} />
      );

      Live.displayName = `Live${name}`;

      return [name, Live as unknown as ComponentType<Record<string, unknown>>];
    }),
  ),
};

export { docsMdxComponents, docsMdxComponentsFor, guideMarkdown };
