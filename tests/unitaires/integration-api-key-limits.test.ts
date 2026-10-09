// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  PLATFORM_API_KEY_RATE_CEILING,
  TENANT_API_KEY_RATE_CEILING,
  apiKeyRateCeiling,
} from "@/features/integrations/lib/api-key-limits";
import {
  digitsOnly,
  validateApiKeyForm,
} from "@/features/integrations/lib/api-key-form-schema";

/**
 * The key dialog offers the ceiling the API will accept from this person.
 *
 * The API refuses a company administrator above 600 a minute per key (only
 * the platform's MASTER provisions more, up to 6,000). The dialog used to
 * offer 6,000 to anybody, which ended in a refusal after the form was filled;
 * the form's schema says the ceiling up front, under the field.
 */
const base = { name: "ERP Protheus", scopes: ["deliveries:read" as const] };

function rateError(
  rate: string,
  mode: "admin" | "dashboard",
): string | undefined {
  const result = validateApiKeyForm(
    { ...base, rate_limit_per_minute: rate },
    mode,
  );

  return result.errors?.rate_limit_per_minute;
}

describe("the per-key ceiling the dialog offers", () => {
  it("is the tenant's on the company screen, the platform's on the master one", () => {
    expect(apiKeyRateCeiling("dashboard")).toBe(TENANT_API_KEY_RATE_CEILING);
    expect(apiKeyRateCeiling("admin")).toBe(PLATFORM_API_KEY_RATE_CEILING);

    expect(TENANT_API_KEY_RATE_CEILING).toBe(600);
    expect(PLATFORM_API_KEY_RATE_CEILING).toBe(6000);
  });

  it("names the problem before the request, in the API's words", () => {
    expect(rateError("1000", "dashboard")).toMatch(/até 600/);
    expect(rateError("1000", "admin")).toBeUndefined();
    expect(rateError("600", "dashboard")).toBeUndefined();
    expect(rateError("5", "admin")).toMatch(/mínimo/);
  });
});

describe("the rate the form sends (DLVB-20)", () => {
  it("is whatever digits were typed, and nothing when the field is empty", () => {
    expect(
      validateApiKeyForm({ ...base, rate_limit_per_minute: "240" }, "dashboard")
        .values,
    ).toEqual({ ...base, rate_limit_per_minute: 240 });

    // Empty is the documented default, not a number standing in for "--".
    expect(
      validateApiKeyForm({ ...base, rate_limit_per_minute: "" }, "dashboard")
        .values,
    ).toEqual(base);
  });

  it("refuses signs and decimals that reach it by another way than typing", () => {
    expect(rateError("--", "dashboard")).toMatch(/só números inteiros/);
    expect(rateError("12.5", "dashboard")).toMatch(/só números inteiros/);
    expect(rateError("1e3", "dashboard")).toMatch(/só números inteiros/);
  });

  it("keeps only digits from a keystroke or a paste, up to four", () => {
    expect(digitsOnly("--120")).toBe("120");
    expect(digitsOnly("+1e3")).toBe("13");
    expect(digitsOnly("12.5")).toBe("125");
    expect(digitsOnly("123456")).toBe("1234");
  });
});

describe("the name of a key", () => {
  it("is required, trimmed, and follows the text rules", () => {
    expect(
      validateApiKeyForm(
        { ...base, name: " ", rate_limit_per_minute: "" },
        "admin",
      ).errors?.name,
    ).toMatch(/pelo menos dois caracteres/);

    expect(
      validateApiKeyForm(
        { ...base, name: "ERP  Protheus", rate_limit_per_minute: "" },
        "admin",
      ).errors?.name,
    ).toMatch(/espaços consecutivos/);

    expect(
      validateApiKeyForm(
        { ...base, name: "  ERP Protheus ", rate_limit_per_minute: "" },
        "admin",
      ).values?.name,
    ).toBe("ERP Protheus");
  });

  it("needs at least one scope", () => {
    expect(
      validateApiKeyForm(
        { ...base, scopes: [], rate_limit_per_minute: "" },
        "admin",
      ).errors?.scopes,
    ).toMatch(/ao menos um escopo/);
  });
});
