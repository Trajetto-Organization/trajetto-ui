import { PublicConfigPrefetch } from "./public-config-prefetch";
import {
  PUBLIC_CONFIG_ELEMENT_ID,
  parsePublicConfig,
  serializePublicConfig,
  type EnvSource,
} from "./public-config";

/**
 * The public configuration, written into the page for src/env/client.ts.
 *
 * A JSON data block, not a script: the browser never executes it, so the
 * Content-Security-Policy (nonce or not) has nothing to allow, and no
 * `headers()` read is needed, which would turn every prerendered page
 * dynamic (tests/unitaires/public-pages-static.test.ts).
 *
 * Nothing is written while `next build` prerenders: those pages are served
 * as they are by staging and production alike, so a value baked there would
 * be the build's. They fetch /public-config.json instead.
 */
function PublicConfigScript({
  env = process.env,
}: {
  env?: EnvSource;
}): JSX.Element {
  const result =
    env.NEXT_PHASE === "phase-production-build" ? null : parsePublicConfig(env);

  return (
    <>
      {result?.ok && (
        <script
          id={PUBLIC_CONFIG_ELEMENT_ID}
          type="application/json"
          // Escaped by serializePublicConfig: inert inside <script>.
          dangerouslySetInnerHTML={{
            __html: serializePublicConfig(result.config),
          }}
        />
      )}
      <PublicConfigPrefetch />
    </>
  );
}

export { PublicConfigScript };
