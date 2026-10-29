// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: () => new Headers() }));

import { isDenial } from "@/lib/public-api";

/**
 * What the public proof and tracking pages say when the API does not answer.
 *
 * Every failure used to read as "this proof matches no document" — so a
 * rate-limited minute, a deploy or a network blip told a recipient scanning
 * the QR of a GENUINE proof that it did not exist. That sentence is only true
 * when the API says so.
 */
const failure = (status: number) => ({ ok: false, status, data: null });

describe("a failed public lookup", () => {
  it.each([
    [404, "an unknown token"],
    [400, "a malformed token"],
  ])("%i (%s) denies that the document exists", (status) => {
    expect(isDenial(failure(status))).toBe(true);
  });

  it.each([
    [429, "rate limited"],
    [500, "the API broke"],
    [502, "the proxy lost the API"],
    [503, "the API is draining or down"],
    [0, "the network failed"],
  ])("%i (%s) only says it could not check now", (status) => {
    expect(isDenial(failure(status))).toBe(false);
  });
});
