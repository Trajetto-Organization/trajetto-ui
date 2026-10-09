/**
 * The shape of the tokens in the public links: tracking, opt-out and proof
 * verification. 32 random bytes as lowercase hex — exactly what the API's
 * `publicTokenParamsSchema` and `verifyProofParamsSchema` accept.
 *
 * Checked HERE, before the token becomes a segment of an API path this server
 * requests. The API's own check comes too late for that: URL parsing resolves
 * `..` before the request leaves, so `../../user/session?` never reaches a
 * public route at all — it reaches /user/session, from this server's address.
 */
const PUBLIC_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isPublicToken(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_TOKEN_PATTERN.test(value);
}
