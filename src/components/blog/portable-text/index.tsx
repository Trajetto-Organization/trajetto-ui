import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

import { ContentImage } from "./content-image";

/**
 * A Portable Text renderer in the Trajetto look (the slate/zinc/blue palette).
 * Shared between blog posts and the legal pages. A server component: the
 * inline image is a child client component (`ContentImage`), so no function
 * ever crosses the server→client boundary.
 */
const components: PortableTextComponents = {
  types: {
    image: ({ value }) => <ContentImage value={value} />,
  },
  block: {
    normal: ({ children }) => (
      <p className="mb-4 text-[15px] leading-relaxed text-zinc-500">
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="mt-10 mb-4 text-2xl font-bold tracking-tighter text-slate-800 sm:text-3xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-8 mb-3 text-xl font-bold tracking-tighter text-slate-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 mb-3 text-lg font-semibold tracking-tight text-slate-700">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-4 mb-2 text-base font-semibold text-slate-700">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className="my-6 rounded-r-lg border-l-4 border-blue-500
        bg-blue-50/50 py-2 pl-4 italic text-slate-700"
      >
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-6 list-disc space-y-2 pl-6 marker:text-blue-500">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol
        className="mb-6 list-decimal space-y-2 pl-6
        marker:font-semibold marker:text-blue-500"
      >
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-[15px] leading-relaxed text-zinc-500">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-[15px] leading-relaxed text-zinc-500">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => (
      <span className="underline underline-offset-2">{children}</span>
    ),
    highlight: ({ children }) => (
      <mark className="rounded bg-yellow-100 px-1">{children}</mark>
    ),
    code: ({ children }) => (
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-blue-600">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const href: string = value?.href ?? "#";
      const external = href.startsWith("http");

      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="font-medium text-blue-600 underline-offset-2
          transition-colors hover:text-blue-700 hover:underline"
        >
          {children}
        </a>
      );
    },
  },
};

interface PortableTextContentProps {
  value?: PortableTextBlock[] | null;
}

function PortableTextContent({
  value,
}: PortableTextContentProps): JSX.Element | null {
  if (!value || value.length === 0) return null;
  return <PortableText value={value} components={components} />;
}

export { PortableTextContent };
