import { test, expect } from "@playwright/test";

import { resolveCheckState } from "../../src/features/deliveries/chat/lib/check-state";

const CREATED_AT = "2026-09-08T12:00:00.000Z";

const BEFORE = "2026-09-08T11:59:00.000Z";
const AFTER = "2026-09-08T12:01:00.000Z";

test.describe("resolveCheckState", () => {
  test("is pending while the optimistic message is in flight", () => {
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        pending: true,
        counterpartDeliveredAt: AFTER,
        counterpartLastReadAt: AFTER,
      }),
    ).toBe("pending");
  });

  test("is sent while no cursor covers the message", () => {
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: null,
        counterpartLastReadAt: null,
      }),
    ).toBe("sent");

    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: BEFORE,
        counterpartLastReadAt: BEFORE,
      }),
    ).toBe("sent");
  });

  test("is delivered once the device cursor reaches the message", () => {
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: AFTER,
        counterpartLastReadAt: null,
      }),
    ).toBe("delivered");

    // The cursor sitting exactly on the message still covers it.
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: CREATED_AT,
        counterpartLastReadAt: BEFORE,
      }),
    ).toBe("delivered");
  });

  test("is read once the read cursor reaches the message", () => {
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: AFTER,
        counterpartLastReadAt: AFTER,
      }),
    ).toBe("read");

    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: AFTER,
        counterpartLastReadAt: CREATED_AT,
      }),
    ).toBe("read");
  });

  test("keeps read ahead of delivered, never the other way around", () => {
    // The read cursor can legitimately run ahead of the delivery one; a
    // lagging (or missing) delivery cursor must not demote a read message.
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: BEFORE,
        counterpartLastReadAt: AFTER,
      }),
    ).toBe("read");

    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        counterpartDeliveredAt: null,
        counterpartLastReadAt: AFTER,
      }),
    ).toBe("read");
  });

  test("ignores an explicit pending false", () => {
    expect(
      resolveCheckState({
        createdAt: CREATED_AT,
        pending: false,
        counterpartDeliveredAt: AFTER,
        counterpartLastReadAt: null,
      }),
    ).toBe("delivered");
  });
});
