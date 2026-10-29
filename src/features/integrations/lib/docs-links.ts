import { API_DOCS_PATH, docsGuideHref } from "@/app/docs/_lib/navigation";

/**
 * Where Integrações points at the developer portal (decision 11.1): the
 * portal's home from the page band, and the one guide each one-time value
 * needs, next to the value.
 */
const INTEGRATION_DOCS = {
  home: API_DOCS_PATH,
  authentication: docsGuideHref("autenticacao"),
  signature: docsGuideHref("assinatura"),
} as const;

/**
 * How far a webhook's signature `t` may be from the receiver's clock, as the
 * API publishes it (`x-trajetto-webhooks.signature.tolerance_seconds`). The
 * dialogs are client components and the published document is read on the
 * server, so the hint carries the number; a test holds it to the document's
 * snapshot, which itself fails when the API's document drifts from it.
 */
const SIGNATURE_TOLERANCE_SECONDS = 300;

export { INTEGRATION_DOCS, SIGNATURE_TOLERANCE_SECONDS };
