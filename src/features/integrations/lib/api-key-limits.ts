/**
 * The per-key ceilings the API enforces, mirrored so the dialog can say them
 * up front.
 *
 * The API is the authority (src/shared/integration/api-key-rules.ts there): a
 * company administrator provisions a key up to 600 requests a minute, and only
 * the platform's MASTER above it, up to 6,000. The dialog used to offer 6,000
 * to anybody. The form's schema (api-key-form-schema.ts) states them under the
 * field; if they drift from the API, the API's refusal still reaches the
 * person — this only saves them the round trip.
 */
const TENANT_API_KEY_RATE_CEILING = 600;
const PLATFORM_API_KEY_RATE_CEILING = 6000;
const MIN_API_KEY_RATE = 10;

/**
 * "admin" is the master's screen (/admin is MASTER-only in the middleware);
 * "dashboard" is the company's own.
 */
type IntegrationsMode = "admin" | "dashboard";

function apiKeyRateCeiling(mode: IntegrationsMode): number {
  return mode === "admin"
    ? PLATFORM_API_KEY_RATE_CEILING
    : TENANT_API_KEY_RATE_CEILING;
}

export {
  MIN_API_KEY_RATE,
  PLATFORM_API_KEY_RATE_CEILING,
  TENANT_API_KEY_RATE_CEILING,
  apiKeyRateCeiling,
};
export type { IntegrationsMode };
