#!/usr/bin/env node
/**
 * Waits until the site serves the build a deploy shipped, and fails when it
 * does not.
 *
 * The Dokploy step (.github/scripts/dokploy-deploy.mjs) only proves the
 * deploy was ACCEPTED: the rollout runs afterwards, and a build that fails
 * its healthcheck is rolled back by Swarm (failure_action: rollback) with
 * the old one still serving — a green run with nothing shipped.
 * /build-id.json answers the commit the serving build was made from, so this
 * polls it through the real edge (Cloudflare, Traefik) until it has answered
 * the expected commit for a whole window longer than Swarm's rollback
 * monitor (30 s: the Dokploy Application's update config, docs/deploy.md
 * section 6.4). A rollback inside the window resets it.
 *
 * Only an answer resets the window: a valid build id that is not the
 * expected commit (or a build with no id). A probe that got no answer (a
 * timeout, a 5xx or 52x, a 403 from the edge, a body that is not the JSON
 * of /build-id.json) counts neither for nor against: one such hiccup used to
 * restart the 90 s as if Swarm had rolled back, and a flaky edge could run
 * the whole timeout down with the right build serving (decision D10,
 * 30/10/2026). The window still closes only on an answer of the expected
 * commit, so a stretch of errors alone never passes. The failed probes are
 * counted in a warning and in the summary.
 *
 * Environment:
 *   SITE_URL              public origin of the site (its canonical host)
 *   EXPECTED_SHA          commit the shipped image was built from (7-40 hex)
 *   WAIT_TIMEOUT_SECONDS  how long to wait in total (default 600)
 *   WAIT_POLL_SECONDS     interval between requests (default 5)
 *   WAIT_STABLE_SECONDS   how long the answer must hold (default 90)
 *
 * Reviewed together with trajetto-api/infra/scripts/verify-rollout.sh, the
 * API's check (tests in trajetto-api/tests/unitaires/lifecycle/
 * compose-rollout-verify.test.ts).
 */
import { appendFileSync } from "node:fs";

const env = process.env;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function summary(line) {
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

const missing = ["SITE_URL", "EXPECTED_SHA"].filter((name) => !env[name]);

if (missing.length > 0) fail(`Defina ${missing.join(", ")}.`);

let site;

try {
  site = new URL(env.SITE_URL);
} catch {
  fail("SITE_URL não é uma URL válida.");
}

if (site.protocol !== "https:" && site.protocol !== "http:") {
  fail("SITE_URL precisa ser http(s)://.");
}

const EXPECTED = env.EXPECTED_SHA.trim().toLowerCase();

if (!/^[0-9a-f]{7,40}$/.test(EXPECTED)) {
  fail(
    "EXPECTED_SHA precisa ser o sha do commit (7 a 40 caracteres hexadecimais).",
  );
}

const ENDPOINT = `${site.origin}/build-id.json`;
const TIMEOUT_MS = Number(env.WAIT_TIMEOUT_SECONDS || 600) * 1000;
const POLL_MS = Number(env.WAIT_POLL_SECONDS || 5) * 1000;
const STABLE_MS = Number(env.WAIT_STABLE_SECONDS || 90) * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A short sha is a prefix of the full one the build carries.
const isExpected = (sha) =>
  typeof sha === "string" &&
  (sha === EXPECTED || (EXPECTED.length < 40 && sha.startsWith(EXPECTED)));

let attempt = 0;

/**
 * What the site answers now. `error` is a probe with no answer (no build
 * id was read); otherwise `sha` is the build's id, or null for a build made
 * without GIT_SHA — an answer, from a build that is not this one.
 *
 * @returns {Promise<{ sha: string | null, answer: string, error: boolean }>}
 */
async function probe() {
  attempt += 1;

  try {
    // A fresh query per request and no-cache: no cache between here and the
    // server may answer for it (the route itself sends no-store).
    const response = await fetch(`${ENDPOINT}?t=${Date.now()}-${attempt}`, {
      headers: { accept: "application/json", "cache-control": "no-cache" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { sha: null, answer: `HTTP ${response.status}`, error: true };
    }

    let body;

    try {
      body = await response.json();
    } catch {
      return {
        sha: null,
        answer: `HTTP ${response.status} sem o JSON do /build-id.json`,
        error: true,
      };
    }

    if (!body || typeof body !== "object") {
      return {
        sha: null,
        answer: `HTTP ${response.status} sem o JSON do /build-id.json`,
        error: true,
      };
    }

    const sha = typeof body.sha === "string" ? body.sha.toLowerCase() : null;

    return {
      sha,
      answer: sha ? `sha ${sha}` : "sem sha (build sem GIT_SHA)",
      error: false,
    };
  } catch (error) {
    return {
      sha: null,
      answer: error instanceof Error ? error.message : String(error),
      error: true,
    };
  }
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  let since = null;
  let lastExpected = null;
  let last = "";
  let probes = 0;
  let errors = 0;
  let lastError = "";

  /** The failed probes, said once at the end (warning and summary). */
  const reportErrors = () => {
    if (errors === 0) return;

    console.log(
      `::warning::${errors} de ${probes} consultas ao ${ENDPOINT} ficaram sem resposta (última: ${lastError}). Não contaram a favor nem contra a janela de ${STABLE_MS / 1000}s.`,
    );
    summary(
      `Site: ${errors} de ${probes} consultas ao /build-id.json sem resposta (última: ${lastError}); não zeraram a janela.`,
    );
  };

  for (;;) {
    const { sha, answer, error } = await probe();
    const now = Date.now();

    probes += 1;

    if (error) {
      // No answer: neither for nor against the window.
      errors += 1;
      lastError = answer;
    } else if (isExpected(sha)) {
      since ??= now;
      lastExpected = now;

      if (now - since >= STABLE_MS) {
        reportErrors();
        summary(
          `Site: ${ENDPOINT} serve ${EXPECTED} há ${Math.round((now - since) / 1000)}s.`,
        );
        return;
      }
    } else {
      if (since !== null) {
        console.log(
          `::warning::O site voltou a responder ${answer} depois de servir ${EXPECTED} (rollback do Swarm?).`,
        );
      }

      since = null;
    }

    if (answer !== last) {
      console.log(
        `[wait-for-build] ${answer}${error ? " (sem resposta: não conta para a janela)" : ""}`,
      );
      last = answer;
    }

    if (now >= deadline) {
      reportErrors();

      if (since === null) {
        fail(
          `O site não serve ${EXPECTED} após ${TIMEOUT_MS / 1000}s (responde: ${answer}). O Swarm pode ter revertido o deploy: confira 'docker service ps --no-trunc <app>_trajetto-ui'.`,
        );
      }

      // The window can only close on an answer of the expected commit:
      // after the last one, nothing but probes with no answer.
      fail(
        error
          ? `O site serviu ${EXPECTED} por ${Math.round((lastExpected - since) / 1000)}s e depois só deu consultas sem resposta até o fim de ${TIMEOUT_MS / 1000}s (última: ${answer}): sem resposta não há como confirmar a janela de ${STABLE_MS / 1000}s.`
          : `O site serve ${EXPECTED} há só ${Math.round((now - since) / 1000)}s, menos que a janela de ${STABLE_MS / 1000}s, ao fim de ${TIMEOUT_MS / 1000}s.`,
      );
    }

    await sleep(POLL_MS);
  }
}

await main();
