import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The driver's card lists at 768px (visual sweep, wave 4b).
 *
 * `md:grid-cols-2` reads the window; at 768px the sidebar leaves ~400px, so
 * two 180px cards sat side by side and the service order's "Em Andamento"
 * badge broke in two lines over the date. Two columns start at `lg` now, and
 * the card header wraps instead of overlapping.
 */
const DIR = resolve(__dirname, "../../src/app/(protected)/_components/driver");

const read = (name: string) =>
  readFileSync(resolve(DIR, name, "index.tsx"), "utf8");

describe("driver card lists", () => {
  for (const name of ["vehicles", "fuels", "service-orders"]) {
    it(`${name}: two columns only from lg up`, () => {
      const source = read(name);

      expect(source).not.toMatch(/\bmd:grid-cols-2\b/);
      expect(source).toMatch(/\blg:grid-cols-2\b/);
    });
  }

  it("the service order status badge neither wraps nor covers the date", () => {
    const source = read("service-orders");

    expect(
      source.match(/shrink-0 whitespace-nowrap bg-(green|yellow)-100/g),
    ).toHaveLength(2);
    expect(source).toContain(
      "flex flex-wrap justify-between items-start gap-2",
    );
  });
});
