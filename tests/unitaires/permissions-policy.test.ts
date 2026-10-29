// @vitest-environment node
import { describe, expect, it } from "vitest";

/**
 * The Permissions-Policy header next.config.mjs sends on every path.
 *
 * It listed `browsing-topics=()`. Chrome dropped the Topics API and no longer
 * recognizes the feature, so every page logged "Error with Permissions-Policy
 * header: Unrecognized feature: 'browsing-topics'" to the console, and
 * Lighthouse counted it against Best Practices on the production site
 * (29/10/2026). A feature the browser does not know turns nothing off; it only
 * adds an error.
 */
type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

async function permissionsPolicy(): Promise<string[]> {
  const { default: config } = await import("../../next.config.mjs");
  const rules: HeaderRule[] = await config.headers!();
  const value = rules
    .find((rule) => rule.source === "/(.*)")
    ?.headers.find((item) => item.key === "Permissions-Policy")?.value;

  expect(value, "Permissions-Policy").toBeTruthy();

  return value!.split(",").map((item) => item.trim());
}

describe("the Permissions-Policy header", () => {
  it("lists no feature the browser no longer recognizes", async () => {
    const features = (await permissionsPolicy()).map(
      (item) => item.split("=")[0],
    );

    expect(features).not.toContain("browsing-topics");
    expect(features).not.toContain("interest-cohort");
  });

  it("still keeps geolocation to this origin and the camera, microphone and payments off", async () => {
    const policy = await permissionsPolicy();

    expect(policy).toContain("geolocation=(self)");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("payment=()");
  });
});
