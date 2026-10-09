/**
 * What the tower can see of a driver (decision 7.3).
 *
 * Background tracking is built and tested in the app but switched off until
 * the owner files the background-location declaration in the Play Console.
 * Until then a phone reports only while the app is open, and a dispatcher who
 * is not told reads a quiet dot as a stopped truck. The screen says so.
 *
 * One switch, read on the server per request like the map tiles: the image is
 * promoted from staging (decision 12.2), so a value inlined at build time
 * would be staging's. It mirrors the app's `EXPO_PUBLIC_BACKGROUND_TRACKING`
 * and is turned on together with it; the same spelling, only "true" is on.
 */

const FOREGROUND_ONLY_NOTICE =
  "O motorista aparece no mapa só com o aplicativo aberto: o rastreamento em segundo plano ainda não está ligado.";

function isBackgroundTrackingOn(value: string | null | undefined): boolean {
  return value?.trim() === "true";
}

/** Read through a variable so the bundler cannot inline a build-time value. */
function readBackgroundTracking(): boolean {
  const env = process.env as Record<string, string | undefined>;
  const name = "BACKGROUND_TRACKING";

  return isBackgroundTrackingOn(env[name]);
}

export {
  FOREGROUND_ONLY_NOTICE,
  isBackgroundTrackingOn,
  readBackgroundTracking,
};
