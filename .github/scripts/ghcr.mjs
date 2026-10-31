#!/usr/bin/env node
/**
 * Reads and moves tags in GHCR without taking a transport error for an
 * answer (decision D10, 30/10/2026).
 *
 * The workflow asked `docker buildx imagetools inspect … 2>/dev/null ||
 * true`: any failure (a 502 from the registry, a reset connection) read as
 * "this tag does not exist", and the promote stopped with a misleading
 * message, or skipped a check. Every GHCR read and tag write of deploy.yml
 * goes through here instead, and the registry's answer is classified:
 *
 *   - not found (the registry's answer for a missing tag): an answer.
 *     `digest` exits 3, and the caller decides what a missing tag means;
 *   - refused (401/403, denied): a login or permission problem, which a
 *     retry does not change. It fails at once, saying so;
 *   - anything else is transient: tried again, up to GHCR_ATTEMPTS times
 *     with doubling pauses, each retry a visible warning, and then it fails
 *     with the registry's last words.
 *
 * Moving a tag (`create`) is idempotent: pointing a tag at the digest it
 * already points at changes nothing, so retrying it is safe.
 *
 * CLI:
 *   node .github/scripts/ghcr.mjs digest <ref>
 *     prints the manifest digest of <ref>; exit 3 when the tag does not
 *     exist, 1 when GHCR could not answer.
 *   node .github/scripts/ghcr.mjs revision <ref>
 *     prints the commit the image was built from (its
 *     org.opencontainers.image.revision label; empty for a build without
 *     it), read from the registry without pulling the image.
 *   node .github/scripts/ghcr.mjs create --tag <target> <source>
 *     points <target> at <source> (docker buildx imagetools create).
 *
 * Environment:
 *   GHCR_ATTEMPTS        tries per operation while the error is transient (default 4)
 *   GHCR_RETRY_SECONDS   first pause between tries, doubled after each (default 5)
 */
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Exit code of `digest` and `revision` when the tag does not exist. */
export const NOT_FOUND = 3;

const DIGEST = /^sha256:[0-9a-f]{64}$/;

/**
 * What a failed docker call's output means.
 *
 * @param {string} output stderr and stdout of the failed call
 * @returns {"not-found" | "refused" | "transient"}
 */
export function classify(output) {
  const text = String(output ?? "");

  if (/:\s*not found\s*$/im.test(text) || /manifest[ _]unknown/i.test(text)) {
    return "not-found";
  }

  if (/unauthorized|forbidden|denied/i.test(text)) return "refused";

  return "transient";
}

const firstLine = (text) =>
  String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "(sem mensagem)";

/** Seconds for a message: whole in production, exact in the tests' 0.01 s. */
const seconds = (ms) => Number((ms / 1000).toFixed(2));

/**
 * @typedef {{ code: number, stdout: string, stderr: string }} RunResult
 * @typedef {{
 *   run: (args: string[]) => Promise<RunResult>,
 *   sleep: (ms: number) => Promise<void>,
 *   log: (line: string) => void,
 *   attempts: number,
 *   pauseMs: number,
 * }} Deps
 * @typedef {{ ok: true, value: string, attempts: number }
 *   | { ok: false, kind: "not-found" | "refused" | "transient", output: string, attempts: number }} Outcome
 */

/**
 * Runs `docker <args>` until it succeeds, the error is an answer (not found,
 * refused), or the tries run out.
 *
 * @param {string} label what is being done, for the warnings
 * @param {string[]} args
 * @param {(stdout: string) => string | null} accept the value, or null when a
 *   0 exit still printed nothing usable (counted as transient)
 * @param {Deps} deps
 * @returns {Promise<Outcome>}
 */
async function attempt(label, args, accept, deps) {
  let output = "";

  for (let number = 1; number <= deps.attempts; number += 1) {
    const result = await deps.run(args);

    output = `${result.stderr}\n${result.stdout}`.trim();

    if (result.code === 0) {
      const value = accept(result.stdout);

      if (value !== null) return { ok: true, value, attempts: number };

      output = `resposta inesperada: ${firstLine(result.stdout)}`;
    } else {
      const kind = classify(output);

      if (kind !== "transient")
        return { ok: false, kind, output, attempts: number };
    }

    if (number < deps.attempts) {
      const pause = deps.pauseMs * 2 ** (number - 1);

      deps.log(
        `::warning::GHCR: ${label} falhou (tentativa ${number} de ${deps.attempts}: ${firstLine(output)}); nova tentativa em ${seconds(pause)}s.`,
      );
      await deps.sleep(pause);
    }
  }

  return { ok: false, kind: "transient", output, attempts: deps.attempts };
}

/**
 * The digest out of `{{json .Manifest}}`. Not `{{.Manifest.Digest}}`: buildx
 * 0.30 answers that template with its whole human-readable listing (measured
 * 30/10/2026), while the JSON form is the same in every version. A bare
 * digest is accepted too.
 *
 * @param {string} stdout
 * @returns {string | null}
 */
export function digestOf(stdout) {
  const text = stdout.trim();

  if (DIGEST.test(text)) return text;

  try {
    const digest = JSON.parse(text)?.digest;

    return typeof digest === "string" && DIGEST.test(digest) ? digest : null;
  } catch {
    return null;
  }
}

/**
 * The manifest digest a tag (or digest reference) points at.
 *
 * @param {string} ref
 * @param {Deps} deps
 */
export function inspectDigest(ref, deps) {
  return attempt(
    `ler o digest de ${ref}`,
    ["buildx", "imagetools", "inspect", ref, "--format", "{{json .Manifest}}"],
    digestOf,
    deps,
  );
}

/**
 * The label org.opencontainers.image.revision of an image, from its config
 * in the registry: the linux/amd64 one of an index (the image's only
 * platform; the other entries are attestations), or the image's own.
 *
 * @param {string} stdout `{{json .Image}}` of imagetools inspect
 * @returns {string | null} the revision, "" when the label is absent, null
 *   when the answer is not an image config at all
 */
export function revisionOf(stdout) {
  let image;

  try {
    image = JSON.parse(stdout);
  } catch {
    return null;
  }

  if (!image || typeof image !== "object") return null;

  const config = image.config ? image : image["linux/amd64"];

  if (!config || typeof config !== "object" || !config.config) return null;

  const revision = config.config.Labels?.["org.opencontainers.image.revision"];

  return typeof revision === "string" ? revision.trim().toLowerCase() : "";
}

/**
 * @param {string} ref
 * @param {Deps} deps
 */
export function inspectRevision(ref, deps) {
  return attempt(
    `ler o commit de origem de ${ref}`,
    ["buildx", "imagetools", "inspect", ref, "--format", "{{json .Image}}"],
    revisionOf,
    deps,
  );
}

/**
 * Points `target` at `source`, server side.
 *
 * @param {string} target
 * @param {string} source
 * @param {Deps} deps
 */
export function createTag(target, source, deps) {
  return attempt(
    `apontar ${target} para ${source}`,
    ["buildx", "imagetools", "create", "--tag", target, source],
    () => "",
    deps,
  );
}

/** @returns {Promise<RunResult>} */
function runDocker(args) {
  return new Promise((done) => {
    execFile(
      "docker",
      args,
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 120_000 },
      (error, stdout, stderr) => {
        if (!error) {
          done({ code: 0, stdout, stderr });
          return;
        }

        // A spawn failure or a kill by the timeout has no numeric code.
        const code = typeof error.code === "number" ? error.code : 1;
        const killed = error.killed ? "\ntempo esgotado (120 s)" : "";

        done({ code, stdout, stderr: `${stderr}${killed}` || error.message });
      },
    );
  });
}

/** @returns {Deps} */
export function defaultDeps(env = process.env) {
  return {
    run: runDocker,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(line),
    attempts: Math.max(1, Math.floor(Number(env.GHCR_ATTEMPTS || 4))),
    pauseMs: Math.max(0, Number(env.GHCR_RETRY_SECONDS ?? 5) * 1000),
  };
}

/**
 * The message for an operation that did not succeed.
 *
 * @param {Outcome & { ok: false }} outcome
 * @param {string} what
 */
export function failureMessage(outcome, what) {
  if (outcome.kind === "refused") {
    return `O GHCR recusou o acesso ao ${what} (${firstLine(outcome.output)}). É login ou permissão, não rede: confira o login no GHCR e a permissão packages do job.`;
  }

  return `O GHCR não respondeu sobre ${what} depois de ${outcome.attempts} tentativa(s): ${firstLine(outcome.output)}. É falha de transporte do registry, não uma resposta sobre a imagem.`;
}

async function main(argv) {
  const [command, ...rest] = argv;
  const deps = defaultDeps();

  if ((command === "digest" || command === "revision") && rest.length === 1) {
    const [ref] = rest;
    const outcome =
      command === "digest"
        ? await inspectDigest(ref, deps)
        : await inspectRevision(ref, deps);

    if (outcome.ok) {
      process.stdout.write(`${outcome.value}\n`);
      return 0;
    }

    if (outcome.kind === "not-found") {
      console.error(`GHCR: ${ref} não existe.`);
      return NOT_FOUND;
    }

    console.error(`::error::${failureMessage(outcome, ref)}`);
    return 1;
  }

  if (command === "create" && rest[0] === "--tag" && rest.length === 3) {
    const [, target, source] = rest;
    const outcome = await createTag(target, source, deps);

    if (outcome.ok) {
      if (outcome.attempts > 1) {
        console.log(
          `::warning::GHCR: ${target} apontado para ${source} só na tentativa ${outcome.attempts}.`,
        );
      }
      return 0;
    }

    console.error(
      `::error::${outcome.kind === "not-found" ? `A origem ${source} não existe no GHCR.` : failureMessage(outcome, `${target} (${source})`)}`,
    );
    return 1;
  }

  console.error(
    "Uso: ghcr.mjs digest <ref> | ghcr.mjs revision <ref> | ghcr.mjs create --tag <destino> <origem>",
  );
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(await main(process.argv.slice(2)));
}
