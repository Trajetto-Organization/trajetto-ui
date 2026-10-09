/**
 * The "reenviar código" cooldown, kept across a reload so refreshing the
 * page does not skip it.
 *
 * One fixed key holding only a timestamp. The old key was
 * `lastResendTime-<e-mail>`: the account's e-mail in the name of an entry
 * that outlives the logout. The cooldown is a courtesy (the API rate-limits
 * resends), so sharing it between accounts on one browser costs nothing.
 *
 * Storage can be missing or throw (private window, blocked site data);
 * every access is guarded and the cooldown then lasts for the page only.
 */

const RESEND_COOLDOWN_KEY = "trajetto:2fa-resend-at";
const RESEND_COOLDOWN_SECONDS = 10;

/** Prefix of the old per-e-mail entries, removed wherever they are found. */
const LEGACY_KEY_PREFIX = "lastResendTime-";

function purgeLegacyEntries(storage: Storage): void {
  const legacy: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(LEGACY_KEY_PREFIX)) legacy.push(key);
  }

  legacy.forEach((key) => storage.removeItem(key));
}

/** Seconds left before another resend, after dropping the legacy entries. */
function readResendCooldown(now = Date.now()): number {
  try {
    purgeLegacyEntries(localStorage);

    const sentAt = Number(localStorage.getItem(RESEND_COOLDOWN_KEY));
    if (!Number.isFinite(sentAt) || sentAt <= 0) return 0;

    const remaining =
      RESEND_COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000);

    return Math.min(Math.max(remaining, 0), RESEND_COOLDOWN_SECONDS);
  } catch {
    return 0;
  }
}

function recordResend(now = Date.now()): void {
  try {
    localStorage.setItem(RESEND_COOLDOWN_KEY, String(now));
  } catch {
    // The timer still runs for this page.
  }
}

export {
  RESEND_COOLDOWN_KEY,
  RESEND_COOLDOWN_SECONDS,
  readResendCooldown,
  recordResend,
};
