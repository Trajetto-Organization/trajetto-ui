import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BRAZILIAN_TIME_ZONE_OPTIONS,
  BRAZILIAN_TIME_ZONES,
  DEFAULT_BUSINESS_TIMEZONE,
  timeZoneLabel,
} from "@/app/(protected)/_components/admin/business/timezone-field/timezones";
import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";

/**
 * The company's time zone in the business form (decision 1.1): Brazil's
 * zones only, labelled in pt-BR by the states they cover, and the same list
 * the API accepts — a zone the web offers and the API refuses would only be
 * found after the round trip.
 */

const API_BUSINESS_DAY = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "shared",
  "time",
  "business-day.ts",
);

const hasApi = existsSync(API_BUSINESS_DAY);

describe.skipIf(!hasApi)(
  `the zones match the API's${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("offers exactly the zones the API accepts, with the same default", () => {
      const source = readFileSync(API_BUSINESS_DAY, "utf8");
      const block = /const BRAZILIAN_TIME_ZONES = \[([\s\S]*?)\] as const/.exec(
        source,
      );
      const apiZones = [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
        (match) => match[1],
      );

      expect([...BRAZILIAN_TIME_ZONES].sort()).toEqual(apiZones.sort());
      expect(source).toContain(
        `DEFAULT_BUSINESS_TIMEZONE = "${DEFAULT_BUSINESS_TIMEZONE}"`,
      );
    });
  },
);

describe("the time zone field", () => {
  it("labels each zone in pt-BR with its offset, never by the IANA name alone", () => {
    for (const option of BRAZILIAN_TIME_ZONE_OPTIONS) {
      expect(option.label).toMatch(/\(UTC−[2-5]\)$/);
      expect(option.label).not.toContain("America/");
    }

    expect(
      new Set(BRAZILIAN_TIME_ZONE_OPTIONS.map((option) => option.value)).size,
    ).toBe(BRAZILIAN_TIME_ZONE_OPTIONS.length);
  });

  it("shows the default for a company saved before the column, and a stray value as is", () => {
    expect(timeZoneLabel(undefined)).toBe(timeZoneLabel("America/Sao_Paulo"));
    expect(timeZoneLabel("America/Manaus")).toBe("Manaus — AM leste (UTC−4)");
    expect(timeZoneLabel("Europe/Lisbon")).toBe("Europe/Lisbon");
  });

  it("the form's schema accepts a Brazilian zone and refuses anything else", () => {
    const shape = createUpdateBusinessFormSchema.shape.timezone;

    expect(shape.safeParse("America/Cuiaba").success).toBe(true);
    expect(shape.safeParse(undefined).success).toBe(true);

    const refused = shape.safeParse("Europe/Lisbon");

    expect(refused.success).toBe(false);
    expect(refused.success ? "" : refused.error.issues[0].message).toBe(
      "Fuso horário inválido. Escolha um dos fusos do Brasil.",
    );
  });
});
