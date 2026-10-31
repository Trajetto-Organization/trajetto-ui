// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  cachedScalarBundle,
  fileFromTar,
  pinnedScalar,
  scalarScriptUrl,
  sriOf,
} from "../ui/support/scalar-bundle";

/**
 * The API console's renderer, for the browser suites' double.
 *
 * The console page (the API's) loads Scalar from jsDelivr; the suites reach
 * no third party, so the double serves the same file out of the npm package,
 * checked against the SHA-384 the API pins. These run without network: the
 * tar reading on an archive built here, the pin read from the API's source.
 */

/** A ustar archive of `files` (name, prefix and size are all the reader needs). */
function tarOf(
  files: Array<{ name: string; prefix?: string; body: string }>,
): Buffer {
  const blocks: Buffer[] = [];

  for (const file of files) {
    const header = Buffer.alloc(512);
    const body = Buffer.from(file.body);

    header.write(file.name, 0, "utf8");
    header.write(body.length.toString(8).padStart(11, "0"), 124, "utf8");
    header.write("ustar\u000000", 257, "utf8");
    if (file.prefix) header.write(file.prefix, 345, "utf8");

    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }

  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}

describe("reading the renderer out of the package", () => {
  it("finds the file by its full path, past the ones before it", () => {
    const tar = tarOf([
      { name: "package/package.json", body: '{"name":"x"}' },
      { name: "package/dist/browser/standalone.js", body: "window.Scalar={}" },
    ]);

    expect(
      fileFromTar(tar, "package/dist/browser/standalone.js")?.toString(),
    ).toBe("window.Scalar={}");
  });

  it("joins the ustar prefix of a long path", () => {
    const tar = tarOf([
      { prefix: "package/dist", name: "browser/standalone.js", body: "ok" },
    ]);

    expect(
      fileFromTar(tar, "package/dist/browser/standalone.js")?.toString(),
    ).toBe("ok");
  });

  it("says nothing is there rather than handing over another file", () => {
    const tar = tarOf([{ name: "package/README.md", body: "leia-me" }]);

    expect(fileFromTar(tar, "package/dist/browser/standalone.js")).toBeNull();
  });

  it("writes the hash the way a page's integrity attribute does", () => {
    expect(sriOf(Buffer.from(""))).toBe(
      "sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb",
    );
  });
});

const API_CONSOLE = resolve(
  "../trajetto-api/src/routes/documentation/public-docs-console.ts",
);

describe.skipIf(!existsSync(API_CONSOLE))(
  "the pin it is checked against (../trajetto-api)",
  () => {
    it("is the version and SHA-384 the API's console loads", () => {
      const { version, integrity } = pinnedScalar();

      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(integrity).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
      expect(scalarScriptUrl(version)).toBe(
        `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${version}/dist/browser/standalone.js`,
      );
    });

    it("is never served from a cached file that does not match it", () => {
      const cached = cachedScalarBundle();

      // Absent until a browser run fetched it; when present, it matches.
      if (cached) expect(sriOf(cached)).toBe(pinnedScalar().integrity);
    });
  },
);
