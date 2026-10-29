import { parsePublicConfig } from "@/env/public-config";

export const dynamic = "force-dynamic";

/**
 * The public configuration for pages prerendered at build time, which carry
 * none in their HTML (src/env/public-config-script.tsx). Read per request
 * from this server's environment, so the image promoted from staging answers
 * with production's values.
 *
 * The extension keeps it outside the middleware's matcher, like
 * /build-id.json. A misconfigured server answers 503 with no detail: the
 * names of what is missing are in its boot log, not on the internet.
 */
export function GET(): Response {
  const result = parsePublicConfig(process.env);

  if (!result.ok) {
    return Response.json(
      { error: "Configuração pública indisponível" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(result.config, {
    headers: { "Cache-Control": "no-store" },
  });
}
