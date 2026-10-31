import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

/**
 * The renderer of the API's console (/integration/docs), for its double.
 *
 * The console page is the API's, and it loads Scalar's `standalone.js` from
 * jsDelivr, pinned by version and by SHA-384
 * (trajetto-api/src/routes/documentation/public-docs-console.ts). The suites
 * block every third party, a CDN included, so the double serves that same
 * file — taken from the npm REGISTRY (the one network the pipeline already
 * depends on, for every install), out of the package tarball, and checked
 * against the API's hash before a byte of it reaches the page. The browser
 * checks it again (the page's `integrity`). A version bump on the API side
 * is followed automatically; a file that does not match fails here, by name.
 *
 * Cached under node_modules/.cache, so a run downloads it at most once.
 */
const API_CONSOLE = resolve(
  "../trajetto-api/src/routes/documentation/public-docs-console.ts",
);

const CACHE_DIR = resolve("node_modules/.cache/trajetto-e2e");

const FILE_IN_PACKAGE = "package/dist/browser/standalone.js";

interface PinnedScalar {
  version: string;
  integrity: string;
}

/** The version and the SHA-384 the API's console pins. */
function pinnedScalar(): PinnedScalar {
  const source = readFileSync(API_CONSOLE, "utf8");
  const version = /const SCALAR_VERSION = "([^"]+)"/.exec(source)?.[1];
  const integrity = /integrity:\s*"(sha384-[^"]+)"/.exec(source)?.[1];

  if (!version || !integrity) {
    throw new Error(
      `não achei SCALAR_VERSION e o integrity do Scalar em ${API_CONSOLE}`,
    );
  }

  return { version, integrity };
}

/** The script URL the console page asks for. */
function scalarScriptUrl(version: string): string {
  return `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${version}/dist/browser/standalone.js`;
}

function sriOf(bytes: Buffer): string {
  return `sha384-${createHash("sha384").update(bytes).digest("base64")}`;
}

/** One file out of a tar archive (ustar, as npm packs). */
function fileFromTar(tar: Buffer, wanted: string): Buffer | null {
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);

    // Two zero blocks end the archive.
    if (header.every((byte) => byte === 0)) return null;

    // A field runs to its first NUL.
    const field = (from: number, to: number) => {
      const text = header.subarray(from, to).toString("utf8");
      const end = text.indexOf("\0");

      return end < 0 ? text : text.slice(0, end);
    };

    const prefix = field(345, 500);
    const name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    const size = parseInt(field(124, 136).trim() || "0", 8);
    const start = offset + 512;

    if (name === wanted) return Buffer.from(tar.subarray(start, start + size));

    offset = start + Math.ceil(size / 512) * 512;
  }

  return null;
}

function cachePath(version: string): string {
  return resolve(CACHE_DIR, `scalar-api-reference-${version}-standalone.js`);
}

/** The cached bundle, when it is there and still matches the API's hash. */
function cachedScalarBundle(): Buffer | null {
  let pinned: PinnedScalar;

  try {
    pinned = pinnedScalar();
  } catch {
    return null;
  }

  const path = cachePath(pinned.version);

  if (!existsSync(path)) return null;

  const bytes = readFileSync(path);

  return sriOf(bytes) === pinned.integrity ? bytes : null;
}

const DOWNLOAD_ATTEMPTS = 3;

/**
 * The package tarball, the way an install fetches it: a transport error, a
 * 429 or a 5xx is tried again (a visible line each time, with a growing
 * pause); an answer such as a 404 is not, and neither is the last failure.
 */
async function downloadTarball(tarball: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt += 1) {
    let reason: string;
    let status: number | null = null;

    try {
      // A few MB: seconds on a runner; a minute means the transfer is stuck.
      const response = await fetch(tarball, {
        signal: AbortSignal.timeout(60_000),
      });

      if (response.ok) return Buffer.from(await response.arrayBuffer());

      status = response.status;
      reason = `o registro do npm respondeu ${status} para ${tarball}`;
    } catch (error) {
      reason = `o download de ${tarball} falhou: ${error instanceof Error ? error.message : String(error)}`;
    }

    // An answer about the package: asking again changes nothing.
    if (status !== null && status !== 429 && status < 500) {
      throw new Error(reason);
    }

    if (attempt >= DOWNLOAD_ATTEMPTS) {
      throw new Error(`${reason} (${DOWNLOAD_ATTEMPTS} tentativas)`);
    }

    console.warn(
      `[scalar] ${reason}; tentativa ${attempt} de ${DOWNLOAD_ATTEMPTS}, nova tentativa em ${attempt * 5} s`,
    );
    await new Promise((done) => setTimeout(done, attempt * 5_000));
  }
}

/**
 * Makes sure the bundle is cached, downloading the package from the npm
 * registry if needed. Throws with what went wrong.
 */
async function ensureScalarBundle(): Promise<void> {
  if (cachedScalarBundle()) return;

  const { version, integrity } = pinnedScalar();
  const tarball = `https://registry.npmjs.org/@scalar/api-reference/-/api-reference-${version}.tgz`;
  const archive = await downloadTarball(tarball);
  const bytes = fileFromTar(gunzipSync(archive), FILE_IN_PACKAGE);

  if (!bytes) {
    throw new Error(`${FILE_IN_PACKAGE} não está no pacote ${tarball}`);
  }

  const found = sriOf(bytes);

  if (found !== integrity) {
    throw new Error(
      `o standalone.js do Scalar ${version} não confere com o integrity da API (${found} ≠ ${integrity})`,
    );
  }

  const path = cachePath(version);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

export {
  cachedScalarBundle,
  ensureScalarBundle,
  fileFromTar,
  pinnedScalar,
  scalarScriptUrl,
  sriOf,
};
