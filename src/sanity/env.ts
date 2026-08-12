/**
 * Sanity config (consumption side — the Studio is a separate project,
 * trajetto-studio).
 *
 * Does not throw an error when env vars are missing: in dev/preview, with
 * placeholders, `isSanityConfigured` becomes `false` and pages short-circuit
 * to an empty state instead of firing a request to a non-existent project.
 * Fill in the `NEXT_PUBLIC_SANITY_*` env vars once the sanity.io project is
 * ready, and the content will appear automatically.
 */
// Using `||` (not `??`) intentionally: template env vars come through as an
// EMPTY STRING, not `undefined` — a placeholder `.env.production` overrides
// `.env` during `next build`, and with `??`, the empty string would leak into
// `createClient` (which throws "Invalid API version string" upon module load).
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "";

const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-05-22";

/** A real project exists only when the projectId has been filled in. */
const isSanityConfigured = projectId.trim().length > 0;

/**
 * A "safe" projectId for `createClient`/`imageUrlBuilder`, which throw an error
 * if passed an empty string. With the placeholder, the client exists but is
 * never used (guarded by `isSanityConfigured`).
 */
const safeProjectId = isSanityConfigured ? projectId : "placeholder";

export { projectId, dataset, apiVersion, isSanityConfigured, safeProjectId };
