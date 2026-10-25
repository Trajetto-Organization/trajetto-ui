/**
 * The strict zod schema of the public configuration, for the server only:
 * the boot check (src/env/server.ts) holds what parsePublicConfig builds to
 * it, and the tests hold the browser's zod-free reader (`readPublicConfig`)
 * to the same answers. Kept out of src/env/public-config.ts so zod is not in
 * every page's bundle.
 */
import { z } from "zod";

import { isHttpUrl, type PublicConfig } from "./public-config";

// One predicate, not `.url().refine(new URL(...))`: zod runs a refinement
// even after `.url()` failed, and `new URL("/api")` then threw out of
// safeParse instead of failing it.
const httpUrl = z.string().refine(isHttpUrl, {
  message: "precisa ser uma URL http:// ou https://",
});

const publicConfigSchema = z.object({
  apiUrl: httpUrl,
  siteUrl: httpUrl.nullable(),
  turnstileSiteKey: z.string().min(1).nullable(),
  appEnv: z.enum(["development", "staging", "production"]),
  mapTiles: z
    .object({
      url: z.string(),
      attribution: z.string(),
      dark: z.object({ url: z.string(), attribution: z.string() }).optional(),
    })
    .nullable(),
});

// The interface the browser reads and the schema must not drift apart.
type SchemaConfig = z.infer<typeof publicConfigSchema>;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameShape: Same<SchemaConfig, PublicConfig> = true;

void sameShape;

export { publicConfigSchema };
