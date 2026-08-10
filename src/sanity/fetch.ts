import { client } from "./client";
import { isSanityConfigured } from "./env";

interface SanityFetchOptions {
  /** Tags de revalidação on-demand (webhook do Sanity no publish invalida). */
  tags?: string[];
  /**
   * Janela de revalidação por tempo (segundos). Default 1h em prod, 1min em
   * dev. É o fallback: o gatilho principal é a tag via webhook.
   */
  revalidate?: number | false;
}

/**
 * Wrapper único de leitura do Sanity — ISR (revalidação por tempo + tag) num
 * lugar só. Dois cuidados:
 *
 * 1. GUARD: sem projeto configurado (placeholder em dev/preview), retorna
 *    `null` sem disparar request — as páginas caem no estado vazio, nada
 *    quebra.
 * 2. Falha de rede/Sanity retorna `null` (a página decide: estado vazio ou
 *    notFound). Sem try/catch de 3 camadas fazendo o mesmo fetch de novo.
 */
async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: SanityFetchOptions = {},
): Promise<T | null> {
  if (!isSanityConfigured) return null;

  const revalidate =
    options.revalidate ?? (process.env.NODE_ENV === "production" ? 3600 : 60);

  try {
    return await client.fetch<T>(query, params, {
      next: {
        revalidate,
        tags: options.tags,
      },
    });
  } catch (error) {
    console.error("[sanityFetch] falha ao buscar do Sanity:", error);
    return null;
  }
}

export { sanityFetch };
