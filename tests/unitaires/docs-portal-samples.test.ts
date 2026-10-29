// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The verification samples of the portal's signature guide, executed as an
 * integrator pastes them.
 *
 * The header is built here the way the API signs (`t=<s>,v1=<hex>`, HMAC
 * SHA-256 of `t.body` keyed by the WHOLE secret); the API's own suite runs the
 * same MDX blocks against its real signing function when both repositories
 * are checked out side by side
 * (trajetto-api tests/unitaires/integration/public-docs-guide-samples.test.ts).
 */
const GUIDE = resolve(process.cwd(), "src/content/docs/assinatura.mdx");

function blocks(language: string, guide = GUIDE): string[] {
  const mdx = readFileSync(guide, "utf8");

  return [
    ...mdx.matchAll(
      new RegExp("```" + language + "\\r?\\n([\\s\\S]*?)```", "g"),
    ),
  ].map((match) => match[1]);
}

function sample(language: string, marker: string, guide = GUIDE): string {
  const found = blocks(language, guide).filter((block) =>
    block.includes(marker),
  );

  expect(found, `um exemplo ${language} com ${marker}`).toHaveLength(1);

  return found[0];
}

const newSecret = () => `whsec_${randomBytes(32).toString("hex")}`;

function sign(secrets: string[], body: string, at = Date.now()): string {
  const timestamp = Math.floor(at / 1000);

  return [
    `t=${timestamp}`,
    ...secrets.map(
      (secret) =>
        `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`,
    ),
  ].join(",");
}

type Verify = (secret: string, rawBody: string, header: unknown) => boolean;

describe("the Node.js sample", () => {
  const body = JSON.stringify({
    id: "evt_1",
    topic: "delivery.delivered",
    data: {},
  });

  let dir = "";
  let verify: Verify;

  beforeAll(() => {
    // Inside node_modules, so it runs as plain Node code, as published.
    const cache = resolve(
      process.cwd(),
      "node_modules",
      ".cache",
      "docs-samples",
    );
    mkdirSync(cache, { recursive: true });
    dir = mkdtempSync(join(cache, "run-"));

    const file = join(dir, "verify.cjs");
    writeFileSync(
      file,
      `${sample("js", "function verifyTrajetto")}\nmodule.exports = { verifyTrajetto };\n`,
    );

    ({ verifyTrajetto: verify } = createRequire(file)(file) as {
      verifyTrajetto: Verify;
    });
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("accepts a call signed with the whole secret", () => {
    const secret = newSecret();

    expect(verify(secret, body, sign([secret], body))).toBe(true);
  });

  it("refuses whoever strips the whsec_ prefix", () => {
    const secret = newSecret();

    expect(
      verify(secret.replace(/^whsec_/, ""), body, sign([secret], body)),
    ).toBe(false);
  });

  it("accepts either secret during a rotation and refuses a changed body", () => {
    const current = newSecret();
    const previous = newSecret();
    const header = sign([current, previous], body);

    expect(verify(previous, body, header)).toBe(true);
    expect(verify(current, body, header)).toBe(true);
    expect(verify(current, `${body} `, header)).toBe(false);
  });

  it("refuses a replay older than the tolerance", () => {
    const secret = newSecret();

    expect(
      verify(secret, body, sign([secret], body, Date.now() - 10 * 60 * 1000)),
    ).toBe(false);
  });

  it("answers false, without throwing, to a missing or malformed header", () => {
    const secret = newSecret();
    const timestamp = Math.floor(Date.now() / 1000);

    expect(verify(secret, body, undefined)).toBe(false);
    expect(verify(secret, body, "lixo")).toBe(false);
    expect(verify(secret, body, `t=${timestamp},v1=${"z".repeat(64)}`)).toBe(
      false,
    );
  });
});

/** A Python 3 on this machine, when there is one. */
function python(): string | null {
  for (const command of ["python3", "python"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });

    if (probe.status === 0 && /Python 3/.test(`${probe.stdout}${probe.stderr}`))
      return command;
  }

  return null;
}

const PYTHON = python();

describe.runIf(PYTHON)("the Python sample", () => {
  const body = JSON.stringify({
    id: "evt_2",
    topic: "proof.approved",
    data: {},
  });

  function run(secret: string, headers: Array<string | null>): string[] {
    const script = [
      sample("python", "def verify_trajetto"),
      "import json, sys",
      "cases = json.load(sys.stdin)",
      "print(json.dumps([str(verify_trajetto(cases['secret'], cases['body'].encode('utf-8'), h)) for h in cases['headers']]))",
    ].join("\n");

    const result = spawnSync(PYTHON as string, ["-c", script], {
      input: JSON.stringify({ secret, body, headers }),
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);

    return JSON.parse(result.stdout) as string[];
  }

  it("accepts a signed call and refuses a stripped prefix, a changed body or garbage", () => {
    const secret = newSecret();
    const header = sign([secret], body);

    expect(run(secret, [header, null, "lixo"])).toEqual([
      "True",
      "False",
      "False",
    ]);
    expect(run(secret.replace(/^whsec_/, ""), [header])).toEqual(["False"]);
  });
});

/** PHP is rarer on a developer machine; when present, it runs too. */
const PHP =
  spawnSync("php", ["-v"], { encoding: "utf8" }).status === 0 ? "php" : null;

describe.runIf(PHP)("the PHP sample", () => {
  const body = JSON.stringify({
    id: "evt_3",
    topic: "route.started",
    data: {},
  });

  it("accepts a signed call and refuses a stripped prefix or no header", () => {
    const secret = newSecret();
    const header = sign([secret], body);

    const script = [
      sample("php", "function verifyTrajetto").replace(/^<\?php\s*/, ""),
      "$cases = json_decode(stream_get_contents(STDIN), true);",
      "$out = [];",
      "foreach ($cases['checks'] as $check) {",
      "  $out[] = verifyTrajetto($check['secret'], $cases['body'], $check['header']) ? 'true' : 'false';",
      "}",
      "echo json_encode($out);",
    ].join("\n");

    const result = spawnSync(PHP as string, ["-r", script], {
      input: JSON.stringify({
        body,
        checks: [
          { secret, header },
          { secret: secret.replace(/^whsec_/, ""), header },
          { secret, header: null },
        ],
      }),
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(["true", "false", "false"]);
  });
});

/**
 * The retry sample of the idempotency guide, run against a stubbed `fetch`.
 *
 * It used to create ONE key at module level and send it with every
 * document: the first delivery was created and every later one refused with
 * 409 IDEMPOTENCY_KEY_REUSED — the opposite of what the comment above it
 * said. A key belongs to a document: the same one on every attempt of that
 * document, another one for the next document.
 */
describe("the idempotency guide's retry sample", () => {
  const IDEMPOTENCY_GUIDE = resolve(
    process.cwd(),
    "src/content/docs/idempotencia.mdx",
  );

  // The rule the API enforces, read from the published document.
  const spec = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "tests/unitaires/fixtures/public-openapi.json"),
      "utf8",
    ),
  ) as {
    paths: Record<
      string,
      Record<string, { parameters?: Array<Record<string, any>> }>
    >;
  };
  const keyParameter = spec.paths[
    "/integration/v1/deliveries"
  ].post.parameters?.find(
    (parameter) =>
      parameter.in === "header" && parameter.name === "idempotency-key",
  );

  type Sent = { key: string | undefined; body: unknown };
  type Loaded = {
    createDelivery: (
      body: unknown,
      key?: string,
    ) => Promise<{ status: number }>;
    idempotencyKeyFor?: (documentId: string) => string;
  };

  let dir = "";
  let loaded: Loaded;
  const sent: Sent[] = [];
  const waits: number[] = [];

  /** Answers each call with the next status, `null` meaning a dropped connection. */
  function answer(statuses: Array<number | null>, retryAfter = "1") {
    const queue = [...statuses];

    vi.stubGlobal(
      "fetch",
      async (
        _url: string,
        init: { headers: Record<string, string>; body: string },
      ) => {
        sent.push({
          key: init.headers["Idempotency-Key"],
          body: JSON.parse(init.body),
        });

        const status = queue.shift();

        if (status === null || status === undefined)
          throw new TypeError("fetch failed");

        return new Response("{}", {
          status,
          headers: { "retry-after": retryAfter },
        });
      },
    );
  }

  beforeAll(async () => {
    const cache = resolve(
      process.cwd(),
      "node_modules",
      ".cache",
      "docs-samples",
    );
    mkdirSync(cache, { recursive: true });
    dir = mkdtempSync(join(cache, "run-"));

    const file = join(dir, "idempotency.mjs");
    writeFileSync(
      file,
      [
        sample("js", "async function createDelivery", IDEMPOTENCY_GUIDE),
        // `typeof` so an old sample without the helper still loads and fails
        // on its behaviour, not on a missing name.
        "export const loaded = { createDelivery, idempotencyKeyFor: typeof idempotencyKeyFor === 'function' ? idempotencyKeyFor : undefined };",
      ].join("\n"),
    );

    ({ loaded } = (await import(
      /* @vite-ignore */ pathToFileURL(file).href
    )) as { loaded: Loaded });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sent.length = 0;
    waits.length = 0;
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.stubGlobal("setTimeout", (resolveWait: () => void, ms: number) => {
      waits.push(ms);
      resolveWait();
      return 0;
    });
  });

  it("sends each document with its own key", async () => {
    answer([201, 201]);

    await loaded.createDelivery({ code: "PED-10452" }, "pedido-10452");
    await loaded.createDelivery({ code: "PED-10453" }, "pedido-10453");

    expect(sent.map((call) => call.key)).toEqual([
      "pedido-10452",
      "pedido-10453",
    ]);
  });

  it("repeats the same key when retrying after a 503, a 429 or a dropped connection", async () => {
    answer([503, null, 429, 201], "3");

    const response = await loaded.createDelivery(
      { code: "PED-10454" },
      "pedido-10454",
    );

    expect(response.status).toBe(201);
    expect(sent.map((call) => call.key)).toEqual([
      "pedido-10454",
      "pedido-10454",
      "pedido-10454",
      "pedido-10454",
    ]);
    // The retry-after of the refusal is honoured.
    expect(waits[0]).toBe(3000);
  });

  it("does not repeat a 409: the same call would get the same answer", async () => {
    answer([409, 201]);

    const response = await loaded.createDelivery(
      { code: "PED-10455" },
      "pedido-10455",
    );

    expect(response.status).toBe(409);
    expect(sent).toHaveLength(1);
  });

  it("derives a stable key per document that the API accepts", () => {
    expect(
      keyParameter?.schema?.pattern,
      "o padrão publicado da Idempotency-Key",
    ).toBeTruthy();
    expect(
      loaded.idempotencyKeyFor,
      "o exemplo mostra como derivar a chave",
    ).toBeTypeOf("function");

    const keyFor = loaded.idempotencyKeyFor!;
    const pattern = new RegExp(keyParameter!.schema.pattern);

    expect(keyFor("10452")).toBe(keyFor("10452"));
    expect(keyFor("10452")).not.toBe(keyFor("10453"));
    expect(keyFor("1")).toMatch(pattern);
    expect(keyFor("10452")).toMatch(pattern);
  });
});

/**
 * The samples against vectors produced by the API's own signer
 * (signWebhookPayload), pinned in both repositories: the checks above sign
 * with a re-implementation, which would agree with a sample that shares its
 * mistake. The API suite fails if the signer stops reproducing these bytes.
 */
describe("the samples against the API signer's vectors", () => {
  interface Vector {
    name: string;
    secret: string;
    previous_secrets: string[];
    timestamp: number;
    body: string;
    header: string;
  }

  const { vectors } = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "tests/unitaires/fixtures/webhook-signature-vectors.json",
      ),
      "utf8",
    ),
  ) as { vectors: Vector[] };

  // Every secret that must be accepted, then the stripped prefix and a
  // changed body, which must not.
  function cases(vector: Vector) {
    return [
      ...[vector.secret, ...vector.previous_secrets].map((secret) => ({
        secret,
        body: vector.body,
        ok: true,
      })),
      {
        secret: vector.secret.replace(/^whsec_/, ""),
        body: vector.body,
        ok: false,
      },
      { secret: vector.secret, body: `${vector.body} `, ok: false },
    ];
  }

  it("covers a rotation and a body outside ASCII", () => {
    expect(vectors.some((vector) => vector.previous_secrets.length > 0)).toBe(
      true,
    );
    expect(
      vectors.some((vector) =>
        [...vector.body].some((char) => char.charCodeAt(0) > 127),
      ),
    ).toBe(true);
  });

  it("the guide publishes the first one byte for byte", () => {
    const published = blocks("text").map((block) => block.trim());
    const [first] = vectors;

    expect(published).toContain(first.secret);
    expect(published).toContain(first.body);
    expect(published).toContain(first.header);
  });

  describe("Node.js", () => {
    let dir = "";
    let verify: Verify;

    beforeAll(() => {
      const cache = resolve(
        process.cwd(),
        "node_modules",
        ".cache",
        "docs-samples",
      );
      mkdirSync(cache, { recursive: true });
      dir = mkdtempSync(join(cache, "run-"));

      const file = join(dir, "verify-vectors.cjs");
      writeFileSync(
        file,
        `${sample("js", "function verifyTrajetto")}\nmodule.exports = { verifyTrajetto };\n`,
      );

      ({ verifyTrajetto: verify } = createRequire(file)(file) as {
        verifyTrajetto: Verify;
      });
    });

    afterAll(() => {
      vi.useRealTimers();
      if (dir) rmSync(dir, { recursive: true, force: true });
    });

    it.each(vectors.map((vector) => [vector.name, vector] as const))(
      "%s",
      (_name, vector) => {
        // The sample's own default tolerance, at the instant the vector was signed.
        vi.useFakeTimers({ now: vector.timestamp * 1000, toFake: ["Date"] });

        try {
          for (const check of cases(vector)) {
            expect(
              verify(check.secret, check.body, vector.header),
              JSON.stringify(check),
            ).toBe(check.ok);
          }
        } finally {
          vi.useRealTimers();
        }
      },
    );
  });

  describe.runIf(PYTHON)("Python", () => {
    it.each(vectors.map((vector) => [vector.name, vector] as const))(
      "%s",
      (_name, vector) => {
        const checks = cases(vector);
        const script = [
          sample("python", "def verify_trajetto"),
          "import json, sys",
          // Bytes, decoded as UTF-8: a Windows console would read stdin as cp1252.
          "c = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
          // The vector's `t` is old: a large tolerance, as the guide says.
          "print(json.dumps([verify_trajetto(k['secret'], k['body'].encode('utf-8'), c['header'], 10**12) for k in c['checks']]))",
        ].join("\n");

        const result = spawnSync(PYTHON as string, ["-c", script], {
          input: JSON.stringify({ header: vector.header, checks }),
          encoding: "utf8",
        });

        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual(
          checks.map((check) => check.ok),
        );
      },
    );
  });

  describe.runIf(PHP)("PHP", () => {
    it.each(vectors.map((vector) => [vector.name, vector] as const))(
      "%s",
      (_name, vector) => {
        const checks = cases(vector);
        const script = [
          sample("php", "function verifyTrajetto").replace(/^<\?php\s*/, ""),
          "$c = json_decode(stream_get_contents(STDIN), true);",
          "echo json_encode(array_map(fn ($k) => verifyTrajetto($k['secret'], $k['body'], $c['header'], PHP_INT_MAX), $c['checks']));",
        ].join("\n");

        const result = spawnSync(PHP as string, ["-r", script], {
          input: JSON.stringify({ header: vector.header, checks }),
          encoding: "utf8",
        });

        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual(
          checks.map((check) => check.ok),
        );
      },
    );
  });
});
