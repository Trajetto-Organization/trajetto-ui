import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The web container rotates its own log (OBS-14).
 *
 * Docker's default json-file driver with no options never rotates: unless the
 * host's daemon.json says otherwise — and that file is versioned nowhere —
 * the log grows until the node's disk is full, and that node also carries the
 * database's local volume. The compose file is the one place the rotation
 * ships with the deploy.
 */
const compose = readFileSync(
  resolve(process.cwd(), "compose.production.yaml"),
  "utf8",
);

describe("the trajetto-ui container's log", () => {
  it("uses the json-file driver, explicitly", () => {
    expect(compose).toMatch(/\n    logging:\r?\n      driver: json-file\r?\n/);
  });

  it("rotates by size, keeping a bounded number of files", () => {
    expect(compose).toMatch(/\n        max-size: "\d+m"\r?\n/);
    expect(compose).toMatch(/\n        max-file: "\d+"\r?\n/);
  });
});
