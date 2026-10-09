/**
 * The quote fields' limits, the same as trajetto-api's createQuoteSchema.
 *
 * Kept apart from the schema so any module can read them without zod. The
 * quote form now runs quoteSchema itself for live validation (decision
 * 16.700), so the page ships zod either way.
 */
const QUOTE_LIMITS = {
  name: 100,
  company: 150,
  email: 100,
  message: 230,
} as const;

export { QUOTE_LIMITS };
