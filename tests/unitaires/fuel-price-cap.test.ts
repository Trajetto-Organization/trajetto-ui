import { describe, expect, it } from "vitest";

import {
  createUpdateFuelSchema,
  updateFuelFormSchema,
} from "@/schemas/create-update-fuel-schema";

/**
 * The price per litre (decision 15.9): more than zero and at most R$ 50,00,
 * mirrored from the API and the app (the ceiling was R$ 999,99).
 */
const priceIssues = (
  schema: typeof createUpdateFuelSchema | typeof updateFuelFormSchema,
  price: unknown,
) => {
  const result = schema.safeParse({ price_per_liter: price });

  return result.success
    ? []
    : result.error.issues
        .filter((issue) => issue.path[0] === "price_per_liter")
        .map((issue) => issue.message);
};

describe.each([
  ["create form", createUpdateFuelSchema],
  ["edit form", updateFuelFormSchema],
] as const)("%s: price per litre", (_name, schema) => {
  it("accepts up to R$ 50,00", () => {
    expect(priceIssues(schema, "R$ 5,899")).toEqual([]);
    expect(priceIssues(schema, "50,00")).toEqual([]);
  });

  it("refuses above R$ 50,00", () => {
    expect(priceIssues(schema, "50,001")).toEqual([
      "O preço por litro não pode exceder R$ 50,00.",
    ]);
    expect(priceIssues(schema, "599")).toEqual([
      "O preço por litro não pode exceder R$ 50,00.",
    ]);
  });

  it("refuses zero", () => {
    expect(priceIssues(schema, "0").length).toBeGreaterThan(0);
  });
});
