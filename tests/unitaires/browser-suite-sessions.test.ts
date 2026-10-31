// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { specSlot } from "../ui/support/spec-slot";

/**
 * One seeded manager per spec, within a suite.
 *
 * The API counts socket handshakes per user (thirty a minute). Specs that
 * signed in as the same manager spent one budget between them, and a refused
 * handshake reads, on the screen, as a broken realtime board. The manager was
 * picked by a hash of the file name — and four pairs of ui specs collided —
 * or was simply managers[0]. It is now the spec's position in its folder
 * (tests/ui/support/spec-slot.ts): distinct within a folder by construction,
 * as long as the folder has no more specs than the seed has managers.
 */
const SUITES = ["tests/ui", "tests/a11y", "tests/responsive"];

const API_SEED = resolve(process.cwd(), "../trajetto-api/tests/load/seed.ts");

/** LOAD_MANAGERS' default in the API's seed (the CI seeds with it). */
function seededManagers(): number {
  if (!existsSync(API_SEED)) return 50;

  const found = /LOAD_MANAGERS \?\? (\d+)/.exec(readFileSync(API_SEED, "utf8"));

  return found ? Number(found[1]) : 50;
}

describe("the manager each spec signs in with", () => {
  for (const dir of SUITES) {
    it(`is a different one for every spec of ${dir}`, () => {
      const folder = resolve(process.cwd(), dir);
      const files = readdirSync(folder)
        .filter((name) => name.endsWith(".spec.ts"))
        .map((name) => resolve(folder, name));

      const slots = files.map((file) => specSlot(file));
      const indexes = slots.map((slot) => slot.index);

      expect(new Set(indexes).size).toBe(files.length);
      expect(Math.min(...indexes)).toBe(0);
      expect(slots.every((slot) => slot.count === files.length)).toBe(true);
      expect(
        files.length,
        `${dir} tem mais specs que o seed tem gestores: dois specs dividiriam um`,
      ).toBeLessThanOrEqual(seededManagers());
    });
  }

  it.skipIf(!existsSync(API_SEED))(
    "is drawn from the fifty the API's seed creates by default",
    () => {
      expect(seededManagers()).toBe(50);
    },
  );
});
