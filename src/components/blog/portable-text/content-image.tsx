"use client";

import Image from "next/image";
import { sanityImageLoader, urlFor } from "@/sanity/image";

interface ContentImageValue {
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
}

/** Dimensões intrínsecas a partir do _ref (`image-<hash>-<w>x<h>-<ext>`). */
function dimsFromRef(ref?: string): { width: number; height: number } {
  const match = ref?.match(/-(\d+)x(\d+)-/);
  return match
    ? { width: Number(match[1]), height: Number(match[2]) }
    : { width: 1200, height: 800 };
}

/**
 * An inline image inside Portable Text. Here the asset arrives as a raw
 * REFERENCE rather than dereferenced, so `urlFor` builds the base — but
 * Sanity's loader is still in charge, bypassing `/_next/image`.
 */
const ContentImage = ({
  value,
}: {
  value: ContentImageValue;
}): JSX.Element | null => {
  if (!value?.asset?._ref) return null;

  const base = urlFor(value).url();
  const { width, height } = dimsFromRef(value.asset._ref);

  return (
    <figure className="my-8">
      <Image
        loader={sanityImageLoader}
        src={base}
        alt={value.alt ?? ""}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full rounded-xl border border-zinc-200"
      />
      {value.caption ? (
        <figcaption className="mt-3 text-center text-sm text-zinc-400">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

export { ContentImage };
