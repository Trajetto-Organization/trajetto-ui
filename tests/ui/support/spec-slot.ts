import { readdirSync } from "node:fs";
import { basename, dirname } from "node:path";

/**
 * A spec file's position among the spec files of its suite folder, sorted
 * by name: the index of the seeded session it signs in with
 * (support/operation.ts). Specs that run side by side are the ones of one
 * suite, one folder, so two of them never get the same index.
 *
 * Pure (no Playwright import), so tests/unitaires/browser-suite-sessions.test.ts
 * can check every folder against the seed's number of managers.
 */
function specSlot(file: string): { index: number; count: number } {
  const specs = readdirSync(dirname(file))
    .filter((name) => name.endsWith(".spec.ts"))
    .sort();

  return { index: specs.indexOf(basename(file)), count: specs.length };
}

export { specSlot };
