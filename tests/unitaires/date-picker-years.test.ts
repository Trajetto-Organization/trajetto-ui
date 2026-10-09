import { describe, expect, it } from "vitest";

import { pickerYears } from "@/app/(protected)/_components/shared/custom/date-picker-field/helpers";

/**
 * The year dropdown of the date picker (FLEET-VEH-3 remainder).
 *
 * It listed the current year and the hundred before it, whatever the field
 * allowed. A bill due next year, a delivery expected in January or a CNH
 * that expires in 2030 could not be reached from the dropdown, and a stored
 * value in a later year opened with the dropdown blank.
 */
describe("the years the date picker offers", () => {
  it("goes back a hundred years, newest first", () => {
    const years = pickerYears(2026, false);

    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(1926);
    expect(years).toHaveLength(101);
  });

  it("reaches ahead when the field takes future dates", () => {
    const years = pickerYears(2026, true);

    expect(years.slice(0, 6)).toEqual([2031, 2030, 2029, 2028, 2027, 2026]);
    expect(years.at(-1)).toBe(1926);
  });

  it("always lists the year of the value on screen", () => {
    expect(pickerYears(2026, false, 2029)[0]).toBe(2029);
    expect(pickerYears(2026, true, 2040)[0]).toBe(2040);
    expect(pickerYears(2026, false, 1900).at(-1)).toBe(1900);

    const years = pickerYears(2026, true, 2028);

    expect(new Set(years).size).toBe(years.length);
  });
});
