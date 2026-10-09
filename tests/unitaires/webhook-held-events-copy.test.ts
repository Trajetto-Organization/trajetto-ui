// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the webhook panel says about an endpoint we switched off.
 *
 * The API used to DROP every event while the breaker was open. It now holds
 * them for up to 30 days and sends them when somebody reactivates the
 * endpoint — which is the one thing the admin reading this note has to know
 * to act: fixing the receiver is not enough. Saving the endpoint unchanged
 * was the only way to do that, and Salvar is now disabled on an untouched
 * form (decision 2.5), so the note points at "Reativar envios" (CRIT-24).
 */
const panel = readFileSync(
  resolve(process.cwd(), "src", "features/integrations/webhooks/panel.tsx"),
  "utf8",
);

describe("the note on a switched-off endpoint", () => {
  it("says the events are being kept, and for how long", () => {
    expect(panel).toMatch(/guardados\s+por\s+até\s+30\s+dias/);
  });

  it("says Reativar envios sends what was held, not saving it again", () => {
    expect(panel).toMatch(
      /Reativar envios&rdquo;[\s\S]*o que ficou\s+retido é enviado/,
    );
    expect(panel).not.toMatch(/salvar o endpoint outra vez/);
  });
});
