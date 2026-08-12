import { createClient } from "@sanity/client";
import { apiVersion, dataset, safeProjectId } from "./env";

/**
 * READ client for the blog/legal section. `useCdn: false` because we serve via ISR
 * (time-based + tag revalidation): the GROQ query runs only during revalidation
 * (~once an hour or upon a publish webhook), never per visitor—so we want fresh
 * data from the API, not the CDN cache, which could return a stale version.
 *
 * `perspective: "published"` ignores drafts—the public only sees what has
 * been published in the Studio.
 */
const client = createClient({
  projectId: safeProjectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
});

export { client };
