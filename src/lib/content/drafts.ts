/**
 * Whether content marked `draft: true` is listed and rendered.
 *
 * Only outside a production build: `next dev` previews drafts, while
 * `next build` (staging and production alike) leaves them out of the static
 * params, so a draft is a real 404 wherever the site is deployed.
 */
export function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** What a visitor may see of a collection; the one rule both loaders use. */
export function visibleItems<T extends { draft: boolean }>(
  items: readonly T[],
  drafts: boolean = includeDrafts(),
): T[] {
  return items.filter((item) => drafts || !item.draft);
}
