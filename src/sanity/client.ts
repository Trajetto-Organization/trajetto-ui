import { createClient } from "@sanity/client";
import { apiVersion, dataset, safeProjectId } from "./env";

/**
 * Cliente de LEITURA do blog/legal. `useCdn: false` porque servimos via ISR
 * (revalidação por tempo + tag): a query GROQ roda só na revalidação (~1x/h
 * ou no webhook de publish), nunca por visitante — então queremos o dado
 * fresco da API, não o cache do CDN que poderia devolver versão stale.
 *
 * `perspective: "published"` ignora rascunhos — o público só vê o que foi
 * publicado no Studio.
 */
const client = createClient({
  projectId: safeProjectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
});

export { client };
