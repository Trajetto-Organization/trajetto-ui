"use client";

import Image from "next/image";

import { sanityImageLoader } from "@/sanity/image";
import type { SanityImage as SanityImageType } from "@/sanity/types";

interface SanityImageProps {
  /** Imagem já DEREFERENCIADA na query (`asset->{ url, metadata }`). */
  image?: SanityImageType | null;
  /** Sobrescreve o alt do documento (senão usa `image.alt`). */
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Modo `fill` pra containers com aspect-ratio (cards). */
  fill?: boolean;
  /** Dimensões fixas (senão usa as intrínsecas da metadata). */
  width?: number;
  height?: number;
}

/**
 * Imagem do Sanity servida via CDN otimizado (`auto=format`), SEM passar pelo
 * otimizador do Next — zero re-encode no servidor (ver `@/sanity/image`).
 * Usa a `asset.url` já dereferenciada como base e o LQIP nativo do Sanity
 * como blur placeholder instantâneo.
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
