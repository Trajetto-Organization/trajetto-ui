// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the integrations screens promise, against what the API does.
 *
 * The key dialog offered "Entregas — escrita" for a scope no endpoint of the
 * public API required: a customer created a write key to push orders from
 * their ERP and found nothing to push them to. Now that the write exists
 * (decision 5.10) the rule is the same, stated the other way round: every
 * scope the dialog offers is one some public route requires. The webhook
 * panel said retries last "até seis horas" while the schedule adds up to
 * about seven — the API's public reference now derives that number from the
 * schedule itself.
 */
const read = (path: string) =>
  readFileSync(resolve(process.cwd(), "src", path), "utf8");

const API_ROUTES = resolve(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "routes",
  "integration-routes.ts",
);

const hasApi = existsSync(API_ROUTES);

const offeredScopes = () =>
  [
    ...read("features/integrations/api-keys/create-dialog/index.tsx").matchAll(
      /scope:\s*"([^"]+)"/g,
    ),
  ].map((match) => match[1]);

describe("the integrations screens", () => {
  it("offer the write scope and not the one still reserved", () => {
    expect(offeredScopes()).toContain("deliveries:write");
    expect(offeredScopes()).not.toContain("webhooks:manage");
  });

  it("do not understate how long a webhook is retried", () => {
    const panel = read("features/integrations/webhooks/panel.tsx");

    expect(panel).not.toContain("seis horas");
    expect(panel).toContain("sete horas");
  });
});

describe.skipIf(!hasApi)(
  `the scopes on offer${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("are exactly the ones some public route requires", () => {
      const required = new Set(
        [
          ...readFileSync(API_ROUTES, "utf8").matchAll(
            /verifyApiScope\("([^"]+)"\)/g,
          ),
        ].map((match) => match[1]),
      );

      expect([...offeredScopes()].sort()).toEqual([...required].sort());
    });
  },
);
