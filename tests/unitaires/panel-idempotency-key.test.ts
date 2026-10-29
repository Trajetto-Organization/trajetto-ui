import { afterEach, describe, expect, it, vi } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { idempotencyHeaderOf, newIdempotencyKey } from "@/lib/idempotency-key";

/**
 * One key per panel form, repeated when the same form is saved again
 * (IDEMP-14).
 *
 * A server action that lost the API's answer after the commit, and the user
 * pressing "Salvar" again, created a second fine, bill, service order or
 * delivery — each with its own notifications. The API now answers a repeated
 * `Idempotency-Key` with the record it already created. The key is a HEADER
 * on purpose: an API older than this web ignores it, where an unknown body
 * field would be refused.
 *
 * The wiring is checked against the source, like dialog-dismissal.test.ts:
 * every create form sends its key and every create action forwards it.
 */
const SOURCE = resolve(__dirname, "../../src");

const read = (path: string) =>
  readFileSync(resolve(SOURCE, path), "utf8").replace(/\r\n/g, "\n");

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the key itself", () => {
  it("is a v4 UUID", () => {
    expect(newIdempotencyKey()).toMatch(UUID_V4);
  });

  it("is a v4 UUID where crypto.randomUUID does not exist (plain http)", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: <T extends ArrayBufferView>(array: T) => {
        const bytes = array as unknown as Uint8Array;
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = (index * 37 + 11) & 0xff;
        }
        return array;
      },
    });

    const key = newIdempotencyKey();

    expect(key).toMatch(UUID_V4);
    // The fallback key must survive the header filter, or the create goes
    // out without Idempotency-Key.
    expect(idempotencyHeaderOf(key)).toEqual({ "Idempotency-Key": key });
  });

  it("becomes the header only when it is a UUID", () => {
    const key = "018f0000-0000-4000-8000-00000000ab01";

    expect(idempotencyHeaderOf(key)).toEqual({ "Idempotency-Key": key });
    expect(idempotencyHeaderOf("não é uma chave")).toEqual({});
    expect(idempotencyHeaderOf(null)).toEqual({});
  });
});

describe("the panel's create actions", () => {
  const actions = [
    "actions/fine/create-fine/index.ts",
    "actions/account-payable/create-account-payable/index.ts",
    "actions/service-order/create-service-order/index.ts",
    "actions/delivery/create-delivery/index.ts",
  ];

  it.each(actions)("%s forwards the form's key as the header", (path) => {
    const source = read(path);

    expect(source).toMatch(/idempotencyHeaderOf\([^)]*idempotency_key/);
  });
});

describe("the panel's create forms", () => {
  const forms = [
    "features/fine/form-dialog/index.tsx",
    // One form for /admin and /dashboard since decision 8.7.
    "features/account-payable/form-dialog/index.tsx",
    "features/service-order/create-form/index.tsx",
    "features/deliveries/deliveries/form-dialog/index.tsx",
  ];

  it.each(forms)("%s sends one key per form", (path) => {
    const source = read(path);

    expect(source).toMatch(/useIdempotencyKey\(/);
    expect(source).toMatch(/idempotency_key/);
  });
});

describe("the other panel writes", () => {
  it("an occurrence registered on the web carries its submission id", () => {
    expect(
      read("actions/delivery/report-delivery-occurrence/index.ts"),
    ).toMatch(/client_submission_id\?: string/);
    expect(
      read("features/deliveries/deliveries/detail-dialog/index.tsx"),
    ).toMatch(/client_submission_id:/);
  });

  it("a mass chat notice carries its key as a header", () => {
    const action = read("actions/chat/send-chat-message/index.ts");

    expect(action).toMatch(/broadcastKey/);
    expect(action).toMatch(/idempotencyHeaderOf\(broadcastKey\)/);

    expect(read("features/deliveries/chat/broadcast-dialog.tsx")).toMatch(
      /broadcastKey/,
    );
  });
});
