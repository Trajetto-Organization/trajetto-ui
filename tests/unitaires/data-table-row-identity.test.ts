import { describe, expect, it } from "vitest";

import {
  keepListedSelection,
  recordIdOf,
  rowsHaveRecordIds,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/row-identity";

/**
 * Which record a DataTable row is. The behaviour on screen (a selection that
 * survives a server sort, a filter, a revalidation) is proven in
 * data-table-server-state.test.ts; these are the rules underneath.
 */
describe("row identity", () => {
  it("keys by the record's own id, text or number", () => {
    expect(recordIdOf({ id: "delivery-1" })).toBe("delivery-1");
    expect(recordIdOf({ id: 7 })).toBe("7");
    expect(recordIdOf({ id: "" })).toBeUndefined();
    expect(recordIdOf({ id: null })).toBeUndefined();
    expect(recordIdOf({ name: "sem id" })).toBeUndefined();
    expect(recordIdOf(null)).toBeUndefined();
  });

  it("keys by record only when every row has a distinct id", () => {
    expect(rowsHaveRecordIds([{ id: "a" }, { id: "b" }])).toBe(true);
    expect(rowsHaveRecordIds([])).toBe(true);
    // Two rows under one key would select, and render, as one.
    expect(rowsHaveRecordIds([{ id: "a" }, { id: "a" }])).toBe(false);
    expect(rowsHaveRecordIds([{ id: "a" }, { name: "sem id" }])).toBe(false);
  });

  it("drops the selected records the list no longer shows", () => {
    expect(
      keepListedSelection({ a: true, b: true }, [{ id: "b" }, { id: "c" }]),
    ).toEqual({ b: true });
  });

  it("returns the same selection when nothing leaves, so the update is a no-op", () => {
    const selection = { a: true };

    expect(keepListedSelection(selection, [{ id: "a" }, { id: "b" }])).toBe(
      selection,
    );
  });
});
