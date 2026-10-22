#!/usr/bin/env node
/**
 * Waits until the site serves the build a deploy shipped, and fails when it
 * does not.
 *
 * The Dokploy step (.github/scripts/dokploy-webhook.mjs) only proves the
 * deploy was ACCEPTED: the rollout runs afterwards, and a build that fails
 * its healthcheck is rolled back by Swarm (failure_action: rollback) with
 * the old one still serving — a green run with nothing shipped.
 * /build-id.json answers the commit the serving build was made from, so this
 * polls it through the real edge (Cloudflare, Traefik) until it has answered
 * the expected commit for a whole window longer than Swarm's rollback
 * monitor (30 s: the Dokploy Application's update config, docs/deploy.md
 * section 6.4). A rollback inside the window resets it.
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

/** What the site answers now: the sha, or why there is none. */
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

    if (!response.ok) return { sha: null, answer: `HTTP ${response.status}` };

    const body = await response.json();
    const sha = typeof body?.sha === "string" ? body.sha.toLowerCase() : null;

    return { sha, answer: sha ? `sha ${sha}` : "sem sha (build sem GIT_SHA)" };
  } catch (error) {
    return {
      sha: null,
      answer: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  let since = null;
  let last = "";

  for (;;) {
    const { sha, answer } = await probe();
    const now = Date.now();

    if (isExpected(sha)) {
      since ??= now;

      if (now - since >= STABLE_MS) {
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
      console.log(`[wait-for-build] ${answer}`);
      last = answer;
    }

    if (now >= deadline) {
      fail(
        since === null
          ? `O site não serve ${EXPECTED} após ${TIMEOUT_MS / 1000}s (responde: ${answer}). O Swarm pode ter revertido o deploy: confira 'docker service ps --no-trunc <app>_trajetto-ui'.`
          : `O site serve ${EXPECTED} há só ${Math.round((now - since) / 1000)}s, menos que a janela de ${STABLE_MS / 1000}s, ao fim de ${TIMEOUT_MS / 1000}s.`,
      );
    }

    await sleep(POLL_MS);
  }
}

await main();
