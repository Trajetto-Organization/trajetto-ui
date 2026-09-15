"use client";

import Image from "next/image";

import { sanityImageLoader } from "@/sanity/image";
import type { SanityImage as SanityImageType } from "@/sanity/types";

interface SanityImageProps {
  /** An image already DEREFERENCED in the query (`asset->{ url, metadata }`). */
  image?: SanityImageType | null;
  /** Overrides the document's alt (otherwise `image.alt` is used). */
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** `fill` mode, for containers with an aspect-ratio (cards). */
  fill?: boolean;
  /** Fixed dimensions (otherwise the intrinsic ones from the metadata). */
  width?: number;
  height?: number;
}

/**
 * A Sanity image served through their optimised CDN (`auto=format`), WITHOUT
 * going through Next's optimiser — no re-encoding on our server at all (see
 * `@/sanity/image`). It uses the already-dereferenced `asset.url` as the base
 * and Sanity's native LQIP as an instant blur placeholder.
 *
 * `"use client"`: o `loader` é uma função, que não cruza a fronteira
 * server→client como prop. Mantendo o componente client, o Image ainda
 * renderiza no HTML do servidor (SSR), então LCP/SEO seguem ok.
 */
function SanityImage({
  image,
  alt,
  className,
  sizes,
  priority,
  fill,
  width,
  height,
}: SanityImageProps): JSX.Element | null {
  const url = image?.asset?.url;
  if (!url) return null;

  const lqip = image?.asset?.metadata?.lqip;
  const dims = image?.asset?.metadata?.dimensions;

  const resolvedAlt = alt ?? image?.alt ?? "";
  const blurProps = lqip
    ? ({ placeholder: "blur", blurDataURL: lqip } as const)
    : {};

  if (fill) {
    return (
      <Image
        loader={sanityImageLoader}
        src={url}
        alt={resolvedAlt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        {...blurProps}
      />
    );
  }

  return (
    <Image
      loader={sanityImageLoader}
      src={url}
      alt={resolvedAlt}
      width={width ?? dims?.width ?? 1200}
      height={height ?? dims?.height ?? 675}
      className={className}
      sizes={sizes}
      priority={priority}
      {...blurProps}
    />
  );
}

export { SanityImage };
