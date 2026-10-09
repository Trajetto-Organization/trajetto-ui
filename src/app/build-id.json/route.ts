export const dynamic = "force-dynamic";

/**
 * Which build this server runs, for the tabs that may be running another.
 *
 * `NEXT_PUBLIC_BUILD_SHA` is inlined at build time (Dockerfile, from GIT_SHA),
 * into this handler and into the client bundle alike, so a page compares the
 * build it was loaded from with the build answering now
 * (`DeploymentSkewGuard`).
 *
 * The path has an extension on purpose: the middleware's matcher skips those,
 * so polling this never runs the session refresh behind the person's back.
 */
export function GET(): Response {
  return Response.json(
    { sha: process.env.NEXT_PUBLIC_BUILD_SHA || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
