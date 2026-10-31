// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  classify,
  createTag,
  digestOf,
  failureMessage,
  inspectDigest,
  inspectRevision,
  revisionOf,
} from "../../.github/scripts/ghcr.mjs";

/**
 * GHCR reads and tag moves of deploy.yml (decision D10, 30/10/2026).
 *
 * `imagetools inspect … 2>/dev/null || true` read any failure as "this tag
 * does not exist": a 502 of the registry stopped the promote with "o
 * staging nunca rodou esse build", or skipped a check. Here the registry's
 * answer is classified, a transport error is retried with a visible warning
 * per try, and only the registry's own "not found" means missing.
 *
 * The messages below are the ones `docker buildx imagetools` prints
 * (measured 30/10/2026 against ghcr.io).
 */
const DIGEST = `sha256:${"a".repeat(64)}`;
const NOT_FOUND =
  "ERROR: ghcr.io/trajetto-organization/trajetto-ui:staged-0a1b2c3: not found";
const REFUSED =
  "ERROR: failed to authorize: failed to fetch anonymous token: unexpected status from GET request to https://ghcr.io/token?scope=repository%3Atrajetto-organization%2Ftrajetto-ui%3Apull&service=ghcr.io: 401 Unauthorized";
const TRANSIENT =
  'ERROR: failed to do request: Head "https://ghcr.io/v2/trajetto-organization/trajetto-ui/manifests/sha-0a1b2c3": read tcp: connection reset by peer';
const BAD_GATEWAY =
  "ERROR: unexpected status from HEAD request to https://ghcr.io/v2/x/manifests/y: 502 Bad Gateway";

type Answer = { code: number; stdout?: string; stderr?: string };

/** A docker that answers `answers` in turn (the last repeats). */
function fakeDeps(answers: Answer[], attempts = 4) {
  const calls: string[][] = [];
  const lines: string[] = [];
  const pauses: number[] = [];

  return {
    calls,
    lines,
    pauses,
    deps: {
      run: async (args: string[]) => {
        calls.push(args);
        const answer = answers[Math.min(calls.length, answers.length) - 1];

        return {
          code: answer.code,
          stdout: answer.stdout ?? "",
          stderr: answer.stderr ?? "",
        };
      },
      sleep: async (ms: number) => {
        pauses.push(ms);
      },
      log: (line: string) => lines.push(line),
      attempts,
      pauseMs: 5000,
    },
  };
}

describe("classify", () => {
  it.each([
    [NOT_FOUND, "not-found"],
    ["ERROR: manifest unknown: manifest unknown", "not-found"],
    [REFUSED, "refused"],
    ["denied: requested access to the resource is denied", "refused"],
    ["unexpected status: 403 Forbidden", "refused"],
    [TRANSIENT, "transient"],
    [BAD_GATEWAY, "transient"],
    ["context deadline exceeded", "transient"],
    ["", "transient"],
  ])("%s → %s", (output, kind) => {
    expect(classify(output)).toBe(kind);
  });
});

describe("digestOf", () => {
  it("reads the digest of `{{json .Manifest}}`", () => {
    expect(
      digestOf(
        JSON.stringify({
          schemaVersion: 2,
          mediaType: "application/vnd.oci.image.index.v1+json",
          digest: DIGEST,
          size: 3772,
        }),
      ),
    ).toBe(DIGEST);
  });

  it("accepts a bare digest", () => {
    expect(digestOf(`${DIGEST}\n`)).toBe(DIGEST);
  });

  // buildx 0.30 answers `{{.Manifest.Digest}}` with its whole listing: a
  // digest read out of it would be the first line, "Name: …".
  it("refuses the human-readable listing", () => {
    expect(
      digestOf(
        `Name:      ghcr.io/x/y:sha-1\nMediaType: application/vnd.oci.image.index.v1+json\nDigest:    ${DIGEST}\n`,
      ),
    ).toBeNull();
  });
});

describe("inspectDigest", () => {
  it("returns the digest", async () => {
    const fake = fakeDeps([
      { code: 0, stdout: JSON.stringify({ digest: DIGEST }, null, 2) },
    ]);

    expect(await inspectDigest("ghcr.io/x/y:sha-1", fake.deps)).toEqual({
      ok: true,
      value: DIGEST,
      attempts: 1,
    });
    expect(fake.calls[0]).toEqual([
      "buildx",
      "imagetools",
      "inspect",
      "ghcr.io/x/y:sha-1",
      "--format",
      "{{json .Manifest}}",
    ]);
  });

  it("answers 'not found' at once, without retrying", async () => {
    const fake = fakeDeps([{ code: 1, stderr: NOT_FOUND }]);
    const outcome = await inspectDigest("ghcr.io/x/y:staged-1", fake.deps);

    expect(outcome).toMatchObject({ ok: false, kind: "not-found" });
    expect(fake.calls).toHaveLength(1);
  });

  it("fails a refused login at once: a retry would not change it", async () => {
    const fake = fakeDeps([{ code: 1, stderr: REFUSED }]);
    const outcome = await inspectDigest("ghcr.io/x/y:staged-1", fake.deps);

    expect(outcome).toMatchObject({ ok: false, kind: "refused" });
    expect(fake.calls).toHaveLength(1);
    expect(failureMessage(outcome as never, "ghcr.io/x/y:staged-1")).toContain(
      "login ou permissão",
    );
  });

  it("retries a transport error, with a warning per retry and doubling pauses", async () => {
    const fake = fakeDeps([
      { code: 1, stderr: TRANSIENT },
      { code: 1, stderr: BAD_GATEWAY },
      { code: 0, stdout: DIGEST },
    ]);
    const outcome = await inspectDigest("ghcr.io/x/y:sha-1", fake.deps);

    expect(outcome).toEqual({ ok: true, value: DIGEST, attempts: 3 });
    expect(fake.pauses).toEqual([5000, 10000]);
    expect(fake.lines).toHaveLength(2);
    expect(fake.lines[0]).toMatch(
      /^::warning::GHCR: ler o digest de ghcr\.io\/x\/y:sha-1 falhou \(tentativa 1 de 4: .*connection reset by peer\)/,
    );
  });

  it("gives up after the last try, saying it was the transport, not the image", async () => {
    const fake = fakeDeps([{ code: 1, stderr: BAD_GATEWAY }]);
    const outcome = await inspectDigest("ghcr.io/x/y:sha-1", fake.deps);

    expect(outcome).toMatchObject({
      ok: false,
      kind: "transient",
      attempts: 4,
    });
    expect(fake.calls).toHaveLength(4);
    expect(failureMessage(outcome as never, "ghcr.io/x/y:sha-1")).toMatch(
      /não respondeu sobre ghcr\.io\/x\/y:sha-1 depois de 4 tentativa\(s\).*não uma resposta sobre a imagem/,
    );
  });

  it("does not take a 0 exit without a digest for an answer", async () => {
    const fake = fakeDeps([
      { code: 0, stdout: "" },
      { code: 0, stdout: DIGEST },
    ]);

    expect(await inspectDigest("ghcr.io/x/y:sha-1", fake.deps)).toMatchObject({
      ok: true,
      attempts: 2,
    });
  });
});

describe("the revision label", () => {
  const config = (labels: Record<string, string> | undefined) => ({
    architecture: "amd64",
    os: "linux",
    config: labels ? { Labels: labels } : {},
  });
  const REVISION = "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567";

  it("reads it from an index (the build pushes attestations next to the image)", () => {
    expect(
      revisionOf(
        JSON.stringify({
          "linux/amd64": config({
            "org.opencontainers.image.revision": REVISION,
          }),
        }),
      ),
    ).toBe(REVISION);
  });

  it("reads it from a single image", () => {
    expect(
      revisionOf(
        JSON.stringify(
          config({
            "org.opencontainers.image.revision": REVISION.toUpperCase(),
          }),
        ),
      ),
    ).toBe(REVISION);
  });

  it("is empty for a build without it, and null for an answer that is not an image", () => {
    expect(revisionOf(JSON.stringify(config(undefined)))).toBe("");
    expect(revisionOf("not json")).toBeNull();
    expect(
      revisionOf(JSON.stringify({ "linux/arm64": config(undefined) })),
    ).toBeNull();
  });

  it("is read from the registry, without pulling the image", async () => {
    const fake = fakeDeps([
      {
        code: 0,
        stdout: JSON.stringify({
          "linux/amd64": config({
            "org.opencontainers.image.revision": REVISION,
          }),
        }),
      },
    ]);

    expect(
      await inspectRevision(`ghcr.io/x/y@${DIGEST}`, fake.deps),
    ).toMatchObject({
      ok: true,
      value: REVISION,
    });
    expect(fake.calls[0]).toEqual([
      "buildx",
      "imagetools",
      "inspect",
      `ghcr.io/x/y@${DIGEST}`,
      "--format",
      "{{json .Image}}",
    ]);
  });
});

describe("createTag", () => {
  it("moves a tag server side, retrying a transport error (the write is idempotent)", async () => {
    const fake = fakeDeps([{ code: 1, stderr: TRANSIENT }, { code: 0 }]);
    const outcome = await createTag(
      "ghcr.io/x/y:stable",
      `ghcr.io/x/y@${DIGEST}`,
      fake.deps,
    );

    expect(outcome).toMatchObject({ ok: true, attempts: 2 });
    expect(fake.calls[1]).toEqual([
      "buildx",
      "imagetools",
      "create",
      "--tag",
      "ghcr.io/x/y:stable",
      `ghcr.io/x/y@${DIGEST}`,
    ]);
  });

  it("does not retry a refused write", async () => {
    const fake = fakeDeps([
      { code: 1, stderr: "denied: permission_denied: write_package" },
    ]);

    expect(
      await createTag("ghcr.io/x/y:stable", `ghcr.io/x/y@${DIGEST}`, fake.deps),
    ).toMatchObject({ ok: false, kind: "refused" });
    expect(fake.calls).toHaveLength(1);
  });
});
