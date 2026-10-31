/**
 * Where the server checks a Turnstile token.
 *
 * Always Cloudflare's siteverify, with one exception that exists for the
 * browser suites: their job runs this server as a production build with
 * Cloudflare's documented TEST keys, and every login then asked Cloudflare
 * over the internet — a pipeline that failed when Cloudflare hiccupped, with
 * no defect in the code. With a test secret, TURNSTILE_SITEVERIFY_URL may
 * point the check at a local double instead.
 *
 * The exception cannot weaken a real deployment:
 * - only Cloudflare's published test secrets unlock it. A real secret is
 *   always sent to Cloudflare, whatever the variable says — and a test
 *   secret makes Cloudflare itself accept any test token, so the double
 *   grants nothing the key had not already granted;
 * - only a loopback address is accepted, so the secret never leaves the
 *   machine for a host somebody typed.
 *
 * Kept out of the "use server" module on purpose: every export there is a
 * Server Action anybody can call.
 */
const CLOUDFLARE_SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare's test secrets: 1x… always passes, 2x… always fails, 3x…
 * answers "token already spent" (developers.cloudflare.com, Turnstile,
 * "Testing").
 */
const TEST_SECRET = /^[123]x0{31}AA$/;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isTurnstileTestSecret(secret: string): boolean {
  return TEST_SECRET.test(secret);
}

/** The local double's URL, when it is one this server may use. */
function loopbackOverride(value: string | undefined): string | null {
  const raw = value?.trim();

  if (!raw) return null;

  try {
    const url = new URL(raw);
    const web = url.protocol === "http:" || url.protocol === "https:";

    return web && LOOPBACK_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function turnstileSiteverifyUrl(
  secret: string,
  override: string | undefined,
): string {
  if (!isTurnstileTestSecret(secret)) return CLOUDFLARE_SITEVERIFY;

  return loopbackOverride(override) ?? CLOUDFLARE_SITEVERIFY;
}

export { CLOUDFLARE_SITEVERIFY, isTurnstileTestSecret, turnstileSiteverifyUrl };
