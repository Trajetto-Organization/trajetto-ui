#!/usr/bin/env node
/**
 * Triggers a Dokploy Application deploy through its deploy webhook.
 *
 * The Application (provider Docker, image ghcr.io/...:staging or :stable)
 * shows the webhook under Deployments. A POST to it makes Dokploy pull the
 * Application's tag again and roll the service (docs/deploy.md). This script
 * only proves Dokploy ACCEPTED the deploy: the rollout happens afterwards,
 * and a build that fails its healthcheck is rolled back by Swarm with the old
 * one still serving. deploy.yml therefore follows it with
 * .github/scripts/wait-for-build.mjs, which reads /build-id.json through the
 * real edge.
 *
 * Missing webhook: the environment does not exist yet (Dokploy is created
 * later). The script says so with a notice and exits 0, writing
 * `deployed=false`, so the pipeline still moves the image tags and the next
 * steps know nothing was deployed.
 *
 * Environment:
 *   WEBHOOK_URL               the Application's deploy webhook (a secret: the
 *                             path carries its token; never printed)
 *   WEBHOOK_SECRET_NAME       the secret's name, for the messages only
 *   WEBHOOK_TIMEOUT_SECONDS   per attempt (default 30)
 *   WEBHOOK_ATTEMPTS          attempts on a network error or a 5xx (default 3)
 *   WEBHOOK_RETRY_SECONDS     pause between attempts (default 5)
 *
 * Outputs (GITHUB_OUTPUT): deployed=true|false.
 */
import { appendFileSync } from "node:fs";

const env = process.env;
const secretName = env.WEBHOOK_SECRET_NAME || "o webhook do Dokploy";

function output(name, value) {
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function summary(line) {
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

function fail(message) {
  console.error(`::error::${message}`);
  output("deployed", "false");
  process.exit(1);
}

function positive(name, fallback) {
  const raw = env[name];

  if (raw === undefined || raw === "") return fallback;

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0)
    fail(`${name} precisa ser um número positivo.`);

  return value;
}

const raw = env.WEBHOOK_URL?.trim();

if (!raw) {
  console.log(
    `::notice::${secretName} não está definido: deploy no Dokploy pulado (a imagem já está no GHCR).`,
  );
  summary(`Deploy no Dokploy PULADO: ${secretName} ausente.`);
  output("deployed", "false");
  process.exit(0);
}

let url;

try {
  url = new URL(raw);
} catch {
  fail(`${secretName} não é uma URL válida.`);
}

// The token travels in the path: plain http only to the loopback, where the
// tests run a fake Dokploy.
const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";

if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
  fail(`${secretName} precisa ser https:// (o token do webhook vai na URL).`);
}

const timeoutMs = positive("WEBHOOK_TIMEOUT_SECONDS", 30) * 1000;
const attempts = Math.floor(positive("WEBHOOK_ATTEMPTS", 3));
const retryMs = positive("WEBHOOK_RETRY_SECONDS", 5) * 1000;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Dokploy's answer, trimmed: it explains a refusal and never holds the token. */
async function excerpt(response) {
  const text = await response.text().catch(() => "");

  return text.replace(/\s+/g, " ").trim().slice(0, 200);
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // Only the error's kind: its message could quote the URL.
    const kind = error instanceof Error ? error.name : "erro";

    console.log(
      `Tentativa ${attempt}/${attempts}: o Dokploy não respondeu (${kind}).`,
    );

    if (attempt < attempts) {
      await sleep(retryMs);
      continue;
    }

    fail(
      `O Dokploy não respondeu ao webhook depois de ${attempts} tentativas.`,
    );
  }

  if (response.ok) {
    summary(`Dokploy aceitou o deploy (HTTP ${response.status}).`);
    output("deployed", "true");
    process.exit(0);
  }

  const detail = await excerpt(response);

  // A 4xx will not change on a retry: wrong webhook, Auto Deploy off, tag
  // mismatch. A 5xx might.
  if (response.status >= 500 && attempt < attempts) {
    console.log(`Tentativa ${attempt}/${attempts}: HTTP ${response.status}.`);
    await sleep(retryMs);
    continue;
  }

  fail(
    `O Dokploy recusou o webhook: HTTP ${response.status}${detail ? ` (${detail})` : ""}.`,
  );
}
