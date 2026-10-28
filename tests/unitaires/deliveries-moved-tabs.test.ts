import { describe, expect, it } from "vitest";

import { isMovedDeliveryTab } from "@/features/deliveries/lib/tabs";

/**
 * The Entregas tabs that moved to the Torre de controle (meeting of
 * 14/10/2026) keep their old links working through a redirect. The check
 * used `in`, which also accepted the object's inherited names: `?tab=toString`
 * redirected to the Torre with a function's source as the view.
 */
describe("isMovedDeliveryTab", () => {
  it.each(["monitoring", "occurrences", "chat", "proof-audits"])(
    "recognises the moved tab %s",
    (tab) => {
      expect(isMovedDeliveryTab(tab)).toBe(true);
    },
  );

  it.each([
    "toString",
    "constructor",
    "__proto__",
    "hasOwnProperty",
    "valueOf",
    "deliveries",
    "imports",
    "",
  ])("does not treat %s as a moved tab", (tab) => {
    expect(isMovedDeliveryTab(tab)).toBe(false);
  });

  it("ignores anything that is not a string", () => {
    expect(isMovedDeliveryTab(undefined)).toBe(false);
    expect(isMovedDeliveryTab(["chat"])).toBe(false);
  });
});
