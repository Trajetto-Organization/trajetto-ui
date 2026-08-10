import createImageUrlBuilder from "@sanity/image-url";

import type { SanityImageSource } from "@sanity/image-url";
import type { ImageLoaderProps } from "next/image";

import { dataset, safeProjectId } from "./env";

const builder = createImageUrlBuilder({
  projectId: safeProjectId,
  dataset,
});

/** Builder de URL de imagem do Sanity (`urlFor(img).width(800).url()`). */
const urlFor = (source: SanityImageSource) => builder.image(source);

/**
 * Loader do `next/image` que devolve a URL do CDN do Sanity já otimizada
 * (`auto=format` → o edge do Sanity serve WebP/AVIF por conta própria).
 *
 * `src` chega como a URL base (sem tamanho); o Next chama o loader uma vez
 * por entrada do srcset, variando `width`. Isso bypassa o `/_next/image`
 * (zero re-encode no servidor do app).
 */
function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}&q=${quality || 75}&auto=format&fit=max`;
}

export { urlFor, sanityImageLoader };
