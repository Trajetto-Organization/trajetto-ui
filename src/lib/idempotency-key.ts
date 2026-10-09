/**
 * The Idempotency-Key a panel form sends with its create (IDEMP-14).
 *
 * One key per submission as filled in (keyForSubmission), renewed after a
 * success: a server action that lost the API's answer after the commit, and
 * the user pressing "Salvar" again on the same form, send the SAME key, and
 * the API answers with the record it already created instead of a second
 * fine, bill, order or delivery with its own notifications.
 *
 * It travels as a header, never as a body field: an API older than this web
 * ignores an unknown header, where it would refuse an unknown field.
 */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A random v4 UUID.
 *
 * `crypto.randomUUID` exists only in secure contexts; the panel opened over
 * plain http (a LAN address in development) has `getRandomValues` alone, so
 * the UUID is assembled from it there.
 */
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/** The header for a key the form sent, or nothing when it is not one. */
function idempotencyHeaderOf(key: unknown): Record<string, string> {
  return typeof key === "string" && UUID.test(key)
    ? { "Idempotency-Key": key }
    : {};
}

/** The field the create forms carry their key in, to the server action. */
const IDEMPOTENCY_FIELD = "idempotency_key";

/** A key, and the content of the submission it was sent with. */
interface SubmissionKey {
  key: string;
  fingerprint: string;
}

/** Everything a submission sends but its own key, in the order it is sent. */
function submissionFingerprint(payload: FormData): string {
  const entries: Array<[string, string]> = [];

  payload.forEach((value, name) => {
    if (name === IDEMPOTENCY_FIELD) return;

    entries.push([
      name,
      typeof value === "string"
        ? value
        : `${value.name}:${value.size}:${value.lastModified}`,
    ]);
  });

  return JSON.stringify(entries);
}

/**
 * The key for this submission: the previous one when the form sends exactly
 * what it sent with it, a new one when anything changed.
 *
 * Renewing only after a success was not enough. The fine, bill and service
 * order forms stay mounted while their dialog is closed, so after a save
 * whose answer was lost the key stayed, and the NEXT record typed into the
 * form went out with it — the API answered with the first record, and the
 * second was never created behind a success message. Tied to the content, a
 * resend of the same form is still one record, and a different record is
 * always a new key: at worst the duplicate the key did not exist to prevent.
 */
function keyForSubmission(
  previous: SubmissionKey | null,
  payload: FormData,
): SubmissionKey {
  const fingerprint = submissionFingerprint(payload);

  return previous?.fingerprint === fingerprint
    ? previous
    : { key: newIdempotencyKey(), fingerprint };
}

export {
  IDEMPOTENCY_FIELD,
  idempotencyHeaderOf,
  keyForSubmission,
  newIdempotencyKey,
  type SubmissionKey,
};
