import { client } from "./client";
import { isSanityConfigured } from "./env";

interface SanityFetchOptions {
  /** On-demand revalidation tags (Sanity webhook invalidates on publish). */
  tags?: string[];
  /**
   * Time-based revalidation window (seconds). Defaults to 1 hour in production,
   * 1 minute in development. This is the fallback; the primary trigger is the
   * webhook tag.
   */
  revalidate?: number | false;
}

/**
 * Unified Sanity fetch wrapper — ISR (time-based + tag revalidation) in
 * a single place. Two considerations:
 *
 * 1. GUARD: if no project is configured (placeholder in dev/preview), it returns
 *    `null` without making a request — pages fall back to an empty state; nothing
 *    breaks.
 * 2. Network/Sanity failure returns `null` (the page decides: empty state or
 *    notFound). No 3-layer try/catch blocks re-attempting the same fetch.
 */
async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: SanityFetchOptions = {},
): Promise<T | null> {
  if (!isSanityConfigured) return null;

  const revalidate =
    options.revalidate ?? (process.env.NODE_ENV === "production" ? 3600 : 60);

  try {
    return await client.fetch<T>(query, params, {
      next: {
        revalidate,
        tags: options.tags,
      },
    });
  } catch (error) {
    console.error("[sanityFetch] falha ao buscar do Sanity:", error);
    return null;
  }
}

export { sanityFetch };
