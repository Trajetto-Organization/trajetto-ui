/**
 * The web server's environment, checked once at boot (src/instrumentation.ts).
 *
 * Before this, a missing variable surfaced at the first request that used it,
 * as a fetch to "undefined/user/me" or a captcha with no site key. Now the
 * server refuses to start and lists every variable to fix, by name only
 * (values can be secrets).
 */
import { z } from "zod";

import { isHttpUrl, parsePublicConfig, type EnvSource } from "./public-config";
import { publicConfigSchema } from "./public-config-schema";

// Not `.url().refine(new URL(...))`: zod runs the refinement even after
// `.url()` failed, so HTTP_REQUEST="api" threw out of the boot check instead
// of being listed as invalid.
const httpUrl = z.string().refine(isHttpUrl);

interface EnvCheck {
  issues: string[];
  warnings: string[];
}

function present(env: EnvSource, name: string): string | undefined {
  const raw = env[name]?.trim();

  return raw ? raw : undefined;
}

/** Server-only values: never sent to the browser. */
function serverIssues(env: EnvSource): string[] {
  const issues: string[] = [];
  const production = env.NODE_ENV === "production";

  // The URL this server calls the API on (may be an internal address).
  const api = present(env, "HTTP_REQUEST");

  if (!api)
    issues.push(
      "HTTP_REQUEST: obrigatória (URL da API usada pelo servidor da web)",
    );
  else if (!httpUrl.safeParse(api).success) {
    issues.push("HTTP_REQUEST: URL inválida (precisa ser http:// ou https://)");
  }

  if (production && !present(env, "TURNSTILE_SECRET_KEY")) {
    issues.push(
      "TURNSTILE_SECRET_KEY: obrigatória em produção (validação do captcha)",
    );
  }

  // Optional, but a short one is a typo, and the API refuses it anyway.
  const forwarder = present(env, "RATE_LIMIT_FORWARDER_SECRET");

  if (forwarder && forwarder.length < 32) {
    issues.push("RATE_LIMIT_FORWARDER_SECRET: mínimo de 32 caracteres");
  }

  return issues;
}

/** Every problem with this environment, server and public values alike. */
function checkWebEnv(env: EnvSource): EnvCheck {
  const publicResult = parsePublicConfig(env);

  // What the browser will read back without zod must pass the strict schema
  // here, once, where zod is cheap.
  const schemaIssues =
    publicResult.ok &&
    !publicConfigSchema.safeParse(publicResult.config).success
      ? [
          "Configuração pública fora do formato esperado (src/env/public-config-schema.ts)",
        ]
      : [];

  return {
    issues: [
      ...serverIssues(env),
      ...(publicResult.ok ? [] : publicResult.issues),
      ...schemaIssues,
    ],
    warnings: publicResult.warnings,
  };
}

/** Throws one error naming every missing or invalid variable. */
function assertWebEnv(
  env: EnvSource,
  warn: (message: string) => void = console.warn,
): void {
  const { issues, warnings } = checkWebEnv(env);

  for (const warning of warnings) warn(`[env] ${warning}`);

  if (issues.length === 0) return;

  throw new Error(
    [
      "Variáveis de ambiente da web ausentes ou inválidas; o servidor não inicia sem elas:",
      ...issues.map((issue) => `  - ${issue}`),
      "Modelo e explicação de cada uma: .env.example.",
    ].join("\n"),
  );
}

export { assertWebEnv, checkWebEnv };
export type { EnvCheck };
