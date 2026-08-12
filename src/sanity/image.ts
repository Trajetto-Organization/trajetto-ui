import createImageUrlBuilder from "@sanity/image-url";

import type { SanityImageSource } from "@sanity/image-url";
import type { ImageLoaderProps } from "next/image";

import { dataset, safeProjectId } from "./env";

const builder = createImageUrlBuilder({
  projectId: safeProjectId,
  dataset,
});

/** Sanity image URL builder (`urlFor(img).width(800).url()`). */
const urlFor = (source: SanityImageSource) => builder.image(source);

/**
 * `next/image` loader that returns the already-optimized Sanity CDN URL
 * (`auto=format` → Sanity's edge serves WebP/AVIF automatically).
 *
 * `src` arrives as the base URL (without dimensions); Next calls the loader once
 * per `srcset` entry, varying the `width`. This bypasses `/_next/image`
 * (zero re-encoding on the app server).
 */
function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}&q=${quality || 75}&auto=format&fit=max`;
}

export { urlFor, sanityImageLoader };
