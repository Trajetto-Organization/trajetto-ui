/**
 * cmdk filter for lists whose items carry an id as `value` and their visible
 * text as `keywords`.
 *
 * cmdk merges items with equal values, so an item must be identified by its
 * row id; but its default filter scores the value too, and a UUID's hex
 * letters made a search for "a" or "de" keep every row. Matching only the
 * keywords, as a case- and accent-insensitive substring, keeps the search
 * about what the person can read.
 */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function commandKeywordFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  const term = fold(search);

  if (!term) return 1;

  // Without keywords the value is the only text there is (cmdk's own rule).
  const haystack = keywords && keywords.length > 0 ? keywords : [value];

  return haystack.some((text) => fold(text).includes(term)) ? 1 : 0;
}

export { commandKeywordFilter };
