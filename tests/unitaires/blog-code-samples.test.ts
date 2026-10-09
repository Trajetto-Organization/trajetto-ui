import { createHmac } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The code integrators copy from the blog, executed as published.
 *
 * The webhook article's Node sample is what a partner pastes into a
 * receiver. It called `header.split` first thing, so a request without
 * `X-Trajetto-Signature` (a probe, a misconfigured proxy) threw instead of
 * answering false, and the receiver answered 500. The API's own public-docs
 * sample already guarded it; this one now does too, and a header the API
 * signs still verifies.
 */
const POST = resolve(
  process.cwd(),
  "src/content/blog/integracao-erp-tms-api-webhooks.mdx",
);

type Verify = (rawBody: string, header: unknown, secret: string) => boolean;

function jsBlocks(mdx: string): string[] {
  return [...mdx.matchAll(/```js\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
}

/** The header shape the API sends: `t=<seconds>,v1=<hex>[,v1=<hex>]`. */
function signed(secrets: string[], body: string, at = Date.now()): string {
  const timestamp = Math.floor(at / 1000);
  const values = secrets.map(
    (secret) =>
      `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`,
  );

  return [`t=${timestamp}`, ...values].join(",");
}

describe("the signature check published on the blog", () => {
  const SECRET = "whsec_segredo-de-teste";
  const BODY = '{"id":"evt_1","topic":"delivery.delivered"}';

  let dir = "";
  let isSignatureValid: Verify;

  beforeAll(async () => {
    const samples = jsBlocks(readFileSync(POST, "utf8")).filter((block) =>
      block.includes("isSignatureValid"),
    );

    expect(samples, "um exemplo de verificação em Node").toHaveLength(1);

    // Inside node_modules: vite-node hands those files to Node's own ESM
    // loader, so the sample runs exactly as published (a file outside the
    // project root is refused by the dev server).
    const cache = resolve(
      process.cwd(),
      "node_modules",
      ".cache",
      "blog-samples",
    );
    mkdirSync(cache, { recursive: true });
    dir = mkdtempSync(join(cache, "run-"));
    const file = join(dir, "verify.mjs");
    writeFileSync(file, samples[0]);

    ({ isSignatureValid } = (await import(/* @vite-ignore */ file)) as {
      isSignatureValid: Verify;
    });
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("accepts the header the API signs", () => {
    expect(isSignatureValid(BODY, signed([SECRET], BODY), SECRET)).toBe(true);
  });

  it("accepts the old secret during a rotation (two v1)", () => {
    expect(
      isSignatureValid(BODY, signed(["whsec_novo", SECRET], BODY), SECRET),
    ).toBe(true);
  });

  it("refuses a changed body and an old signature", () => {
    expect(isSignatureValid(`${BODY} `, signed([SECRET], BODY), SECRET)).toBe(
      false,
    );
    expect(
      isSignatureValid(
        BODY,
        signed([SECRET], BODY, Date.now() - 10 * 60 * 1000),
        SECRET,
      ),
    ).toBe(false);
  });

  it("returns false, without throwing, when the header is missing or is not text", () => {
    for (const header of [undefined, null, 42, ["t=1,v1=00"]]) {
      expect(
        () => isSignatureValid(BODY, header, SECRET),
        String(header),
      ).not.toThrow();
      expect(isSignatureValid(BODY, header, SECRET), String(header)).toBe(
        false,
      );
    }
  });
});
