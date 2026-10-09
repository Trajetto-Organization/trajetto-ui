/**
 * Runs once when the Next server starts (experimental.instrumentationHook in
 * next.config.mjs). A missing or invalid variable stops the boot with the
 * list of what to fix, instead of failing at the first request that needs it.
 *
 * Node only: the middleware's edge sandbox calls this too, and the check
 * there would only repeat the same result.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertWebEnv } = await import("@/env/server");

  try {
    assertWebEnv(process.env);
  } catch (error) {
    // The production server only logs a rejection from here
    // (`prepare().catch(console.error)`) and keeps serving; exiting is what
    // makes Swarm keep the old task and roll the update back.
    if (process.env.NODE_ENV === "production") {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }

    throw error;
  }
}
