/** Escaped so the JSON can never close the script tag, whatever a title holds. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Structured data for search engines. Raw HTML because React would
 * entity-escape the quotes of a text child, and a script's text is not
 * decoded, so the JSON would stop parsing. Only `serializeJsonLd` output
 * reaches it.
 */
const JsonLd = ({ value }: { value: Record<string, unknown> }) => {
  const data = serializeJsonLd(value);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
};

export { JsonLd };
