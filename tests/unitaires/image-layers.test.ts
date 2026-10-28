// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * How the web image is built and cut into layers (§14, 28/10/2026).
 *
 * - The runtime base is Alpine plus the node binary: the Node image's npm,
 *   corepack, yarn and C headers no longer ride along under a whiteout.
 * - That binary is built against its Alpine minor's musl and libstdc++, so
 *   the runtime base must be the same minor: a bump of one without the
 *   other fails here, not at the first `node` in staging.
 * - The standalone output's node_modules is copied apart from the server
 *   code, before it. Its layer keeps its digest from one commit to the next,
 *   so a deploy no longer re-sends ~13 MB (compressed) of unchanged
 *   dependencies over the VPS's flaky route to GHCR.
 *
 * Text-based, like the other Dockerfile checks; the image itself runs in CI
 * before it is pushed (deploy.yml, "Smoke test the image").
 */
const dockerfile = readFileSync(
  resolve(process.cwd(), "Dockerfile"),
  "utf8",
).replace(/\r\n/g, "\n");

/** The instructions, continuation lines joined, comments dropped. */
const instructions = dockerfile
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n")
  .replace(/\\\n\s*/g, " ")
  .split("\n")
  .map((line) => line.trim().replace(/\s+/g, " "))
  .filter(Boolean);

function stage(name: string): string[] {
  const start = instructions.findIndex((line) =>
    new RegExp(`^FROM \\S+ AS ${name}$`).test(line),
  );

  expect(start, `stage ${name}`).toBeGreaterThan(-1);

  const end = instructions.findIndex(
    (line, at) => at > start && /^FROM /.test(line),
  );

  return instructions.slice(start, end < 0 ? undefined : end);
}

describe("the web image's runtime base", () => {
  it("is the Alpine minor the node binary was built for", () => {
    const node =
      /^FROM node:[\d.]+-alpine(\d+\.\d+)@sha256:[0-9a-f]{64} AS node$/m.exec(
        dockerfile,
      )?.[1];
    const alpine =
      /^FROM alpine:(\d+\.\d+)\.\d+@sha256:[0-9a-f]{64} AS base$/m.exec(
        dockerfile,
      )?.[1];

    expect(node, "FROM node:<versão>-alpine<minor>@sha256:… AS node").toMatch(
      /^\d+\.\d+$/,
    );
    expect(alpine).toBe(node);
  });

  it("takes only the node binary from the Node image, plus what node and sharp link against", () => {
    expect(instructions.filter((line) => /^FROM /.test(line))).toEqual([
      expect.stringMatching(/^FROM node:\S+ AS node$/),
      "FROM node AS node-binary",
      expect.stringMatching(/^FROM alpine:\S+ AS base$/),
      "FROM node AS builder",
      "FROM base AS runner",
    ]);
    expect(instructions.filter((line) => /--from=node/.test(line))).toEqual([
      "COPY --link --from=node-binary /out/ /",
    ]);
    // The first COPY of the runtime base: a layer on its own (`--link`).
    expect(stage("base")[1]).toBe("COPY --link --from=node-binary /out/ /");
    // node and libvips need libstdc++ (libgcc comes with it); dumb-init is
    // the ENTRYPOINT; busybox wget, the HEALTHCHECK, is Alpine's own.
    expect(stage("base")).toContain(
      "RUN apk upgrade --no-cache libcrypto3 libssl3 && apk add --no-cache ca-certificates dumb-init libstdc++",
    );
    expect(stage("runner")).toContain('ENTRYPOINT ["dumb-init", "--"]');
  });

  it("copies the node binary as a reproducible tree, the same blob as the API's", () => {
    /*
      `COPY --from=node /usr/local/bin/node …` stamped /usr, /usr/local and
      /usr/local/bin with the build's time: every uncached build made a new
      ~46 MB blob of the same binary, and the web and API images, which
      once shared the Node image's layers, shared nothing but Alpine. With
      the directories at the binary's own mtime, the layer depends on the
      Node image digest alone. The API's Dockerfile has this exact stage
      (trajetto-api tests/unitaires/lifecycle/image-layers.test.ts pins the
      same text); while both repos are on the same Node image digest, the
      VPS keeps one blob for both (measured 28/10/2026, docs/arquitetura.md).
    */
    expect(stage("node-binary").slice(1)).toEqual([
      "RUN mkdir -p /out/usr/local/bin && cp -p /usr/local/bin/node /out/usr/local/bin/node && touch -h -r /usr/local/bin/node /out/usr/local/bin /out/usr/local /out/usr",
    ]);
  });
});

describe("the web image's app layers", () => {
  it("copy the traced node_modules apart from the server code, most stable first", () => {
    expect(stage("runner").filter((line) => /^COPY /.test(line))).toEqual([
      "COPY --from=builder --chown=nextjs:nodejs /app/standalone-node_modules ./node_modules",
      "COPY --from=builder --chown=nextjs:nodejs /app/public ./public",
      "COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./",
      "COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static",
    ]);
  });

  it("move node_modules out of the standalone output after the build and the sharp cleanup", () => {
    const builder = stage("builder");
    const build = builder.indexOf("RUN yarn build");
    const sharp = builder.findIndex((line) =>
      line.includes("@img/sharp-linux-x64"),
    );
    const move = builder.indexOf(
      "RUN mv .next/standalone/node_modules /app/standalone-node_modules",
    );

    expect(build).toBeGreaterThan(-1);
    expect(sharp).toBeGreaterThan(build);
    expect(move).toBeGreaterThan(sharp);
  });
});
