/**
 * A tab that outlived the build it was loaded from.
 *
 * Every deploy replaces `.next/static` and the Server Action ids. A page
 * loaded before it keeps asking for chunks the new server no longer has
 * (ChunkLoadError) and calling actions it no longer knows (Next 14 answers
 * with the not-found page and the action resolves `undefined`). Neither
 * recovers by retrying in place: the page itself has to be loaded again.
 *
 * Pure on purpose — the storage and the reload are passed in — so the rules
 * are testable without a browser.
 */

/** Errors that mean "this page is from another build", not "this screen is broken". */
const SKEW_MESSAGES = [
  /Loading chunk [\w/.-]+ failed/i,
  /Loading CSS chunk [\w/.-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Failed to find Server Action/i,
];

export function isDeploymentSkewError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  if (error.name === "ChunkLoadError") return true;

  return SKEW_MESSAGES.some((pattern) => pattern.test(error.message));
}

const RELOAD_MARK = "trajetto:skew-reload:";

/**
 * Reload the page once for `key` (a build id), and remember that it did.
 *
 * The mark is what keeps a chunk that is really missing from reloading the
 * page forever. So without storage there is no automatic reload at all: the
 * error screen and its buttons stay, which is the worse experience but never
 * a loop.
 */
export function reloadOnce(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
  reload: () => void,
): boolean {
  try {
    if (storage.getItem(RELOAD_MARK + key)) return false;

    storage.setItem(RELOAD_MARK + key, String(Date.now()));
  } catch {
    return false;
  }

  reload();

  return true;
}

/** A build id that means something: set at build time, and not the local fallback. */
function knownBuild(value: string | null | undefined): value is string {
  return typeof value === "string" && value !== "" && value !== "dev";
}

/**
 * Whether the server now serves another build than the one this page runs.
 *
 * Only when both sides know their build: an image built without GIT_SHA, or
 * `next dev`, must never tell anybody to reload.
 */
export function isNewBuild(
  mine: string | null | undefined,
  served: string | null | undefined,
): boolean {
  return knownBuild(mine) && knownBuild(served) && mine !== served;
}
