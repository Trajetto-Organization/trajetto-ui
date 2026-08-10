/**
 * Config do Sanity (lado CONSUMO — o Studio é um projeto separado, o
 * trajetto-studio).
 *
 * NÃO lança quando falta env: em dev/preview, com placeholder,
 * `isSanityConfigured` fica `false` e as páginas curto-circuitam pra estado
 * vazio em vez de disparar requisição pra um projeto inexistente. Preencha as
 * envs `NEXT_PUBLIC_SANITY_*` quando o projeto no sanity.io estiver pronto e o
 * conteúdo aparece sozinho.
 */
// `||` (não `??`) de propósito: env de template vem como STRING VAZIA, não
// undefined — um `.env.production` de placeholder sobrepõe o `.env` no
// `next build` e, com `??`, o "" vazava pro createClient (que lança
// "Invalid API version string" no load do módulo).
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "";

const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-05-22";

/** Só há projeto real quando o projectId foi preenchido. */
const isSanityConfigured = projectId.trim().length > 0;

/**
 * projectId "seguro" pro `createClient`/`imageUrlBuilder`, que lançam se
 * receberem string vazia. Com placeholder, o cliente existe mas nunca é
 * usado (guardado por `isSanityConfigured`).
 */
const safeProjectId = isSanityConfigured ? projectId : "placeholder";

export { projectId, dataset, apiVersion, isSanityConfigured, safeProjectId };
