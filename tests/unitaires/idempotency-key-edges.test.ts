import { afterEach, describe, expect, it, vi } from "vitest";

import {
  IDEMPOTENCY_FIELD,
  idempotencyHeaderOf,
  keyForSubmission,
  newIdempotencyKey,
} from "@/lib/idempotency-key";

/**
 * Edges of the panel's idempotency key left alive by the 06/10 mutation run:
 * a UUID with anything around it, a non-string that prints as one, and the
 * fingerprint of a submission (text fields and files).
 */

const UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("idempotencyHeaderOf", () => {
  it("only sends a whole UUID", () => {
    expect(idempotencyHeaderOf(UUID)).toEqual({ "Idempotency-Key": UUID });
    expect(idempotencyHeaderOf(`x${UUID}`)).toEqual({});
    expect(idempotencyHeaderOf(`${UUID}x`)).toEqual({});
  });

  it("only sends a string, even one that prints as a UUID", () => {
    expect(idempotencyHeaderOf({ toString: () => UUID })).toEqual({});
  });
});

describe("keyForSubmission", () => {
  it("fingerprints the fields in order, leaving out the key itself", () => {
    const payload = new FormData();
    payload.append("amount", "10");
    payload.append(IDEMPOTENCY_FIELD, UUID);
    payload.append("note", "ok");

    expect(IDEMPOTENCY_FIELD).toBe("idempotency_key");
    expect(keyForSubmission(null, payload).fingerprint).toBe(
      JSON.stringify([
        ["amount", "10"],
        ["note", "ok"],
      ]),
    );
  });

  it("fingerprints a file by name, size and date", () => {
    const payload = new FormData();
    payload.append(
      "photo",
      new File(["abc"], "foto.jpg", { lastModified: 1_700_000_000_000 }),
    );

    expect(keyForSubmission(null, payload).fingerprint).toBe(
      JSON.stringify([["photo", "foto.jpg:3:1700000000000"]]),
    );
  });
});

describe("newIdempotencyKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Both paths give a valid v4 UUID (panel-idempotency-key.test.ts proves the
  // getRandomValues fallback); this pins that a secure context uses the
  // platform's own generator rather than the hand-assembled one.
  it("uses crypto.randomUUID where the platform has it", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue(UUID);
    const getRandomValues = vi.spyOn(crypto, "getRandomValues");

    expect(newIdempotencyKey()).toBe(UUID);
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(getRandomValues).not.toHaveBeenCalled();
  });
});
