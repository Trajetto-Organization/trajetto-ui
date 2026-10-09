// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ReferenceView,
  referenceToc,
} from "@/app/docs/_components/reference/reference-view";
import { specProseComponents } from "@/app/docs/_components/spec-prose";
import { Markdown } from "@/app/docs/_lib/markdown";
import {
  buildCurl,
  exampleFor,
  groupByTag,
  isNullable,
  jsonMedia,
  requestExample,
  resolveSchema,
  schemaRows,
  slugify,
  typeLabel,
  webhooksOf,
} from "@/app/docs/_lib/openapi";
import {
  fetchPublicSpec,
  publicApiUrl,
  type PublicSpec,
} from "@/app/docs/_lib/public-spec";

/**
 * The reference page, drawn on the server from the API's public OpenAPI
 * document — never from a copy kept in this repository. The fixture is a
 * snapshot of that document (tests/unitaires/fixtures/public-openapi.json),
 * so everything asserted below comes from what the API publishes: a route or
 * a field the API adds shows up here with no change in the web.
 */

(globalThis as { React?: typeof React }).React ??= React;

const SERVER = "https://api.exemplo.com.br";

const spec = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "tests/unitaires/fixtures/public-openapi.json"),
    "utf8",
  ),
) as PublicSpec;

const html = renderToStaticMarkup(
  React.createElement(ReferenceView, { spec, serverUrl: SERVER }),
);

function idsOf(markup: string): string[] {
  return [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the reference page", () => {
  it("draws every endpoint of the document, under its tag", () => {
    for (const tag of groupByTag(spec)) {
      expect(html, tag.name).toContain(`id="${tag.anchor}"`);

      for (const entry of tag.operations) {
        expect(html, entry.path).toContain(`id="${entry.anchor}"`);
        expect(html, entry.path).toContain(entry.path);
        expect(html, entry.path).toContain(entry.operation.summary!);
      }
    }
  });

  it("gives every section a unique anchor, and the index points at them", () => {
    const ids = idsOf(html);

    expect(new Set(ids).size).toBe(ids.length);

    for (const item of referenceToc(spec))
      expect(ids, item.text).toContain(item.id);
  });

  it("says which scope each endpoint needs, and which is open", () => {
    const deliveries = html.slice(html.indexOf('id="listdeliveries"'));

    expect(deliveries.slice(0, 3000)).toContain("deliveries:read");
    expect(html).toContain("Sem chave: aberto a qualquer um.");
  });

  it("lists the parameters with their values", () => {
    for (const name of ["limit", "cursor", "updated_since", "status"]) {
      expect(html, name).toContain(`>${name}</code>`);
    }

    for (const status of [
      "PENDING",
      "IN_TRANSIT",
      "DELIVERED",
      "FAILED",
      "CANCELLED",
    ]) {
      expect(html, status).toContain(`>${status}</code>`);
    }
  });

  it("draws every response the document lists, with its body", () => {
    for (const tag of groupByTag(spec)) {
      for (const entry of tag.operations) {
        const section = html.slice(html.indexOf(`id="${entry.anchor}"`));

        for (const status of Object.keys(entry.operation.responses ?? {})) {
          expect(section, `${entry.path} ${status}`).toContain(
            `>${status}</span>`,
          );
        }
      }
    }

    // The error bodies as published: code, and the request id of a 500.
    expect(html).toContain("INVALID_API_KEY");
    expect(html).toContain(">requestId</code>");
  });

  it("uses the document's examples", () => {
    expect(html).toContain("PED-10452");
  });

  it("draws a request body field by field", () => {
    const write = Object.entries(spec.paths).flatMap(([path, item]) =>
      item.post ? [{ path, operation: item.post }] : [],
    );

    for (const { path, operation } of write) {
      const body = operation.requestBody?.content?.["application/json"]?.schema;

      for (const field of Object.keys(
        resolveSchema(spec, body).properties ?? {},
      )) {
        expect(html, `${path} ${field}`).toContain(`>${field}</code>`);
      }
    }
  });

  it("draws every webhook as the request we make", () => {
    const webhooks = webhooksOf(spec);

    expect(webhooks.map((webhook) => webhook.topic)).toEqual(
      Object.keys(spec.webhooks ?? {}),
    );

    for (const webhook of webhooks) {
      const section = html.slice(html.indexOf(`id="${webhook.anchor}"`));
      // Up to the next webhook's section, not a fixed number of characters:
      // the markup's length follows its classes, not what it says.
      const end = section.indexOf("<section");

      expect(
        section.slice(0, end === -1 ? undefined : end),
        webhook.topic,
      ).toContain("X-Trajetto-Signature");
    }

    // The payload fields come from the components the webhooks point at.
    expect(html).toContain(">delivery_id</code>");
    expect(html).toContain(">occurred_at</code>");
  });

  it("offers a curl line for each endpoint", () => {
    // Quotes come out as entities in the HTML.
    expect(html).toContain(
      `curl &quot;${SERVER}/integration/v1/deliveries&quot;`,
    );
    expect(html).toContain("Authorization: Bearer $TRAJETTO_API_KEY");
  });
});

describe("the curl line", () => {
  const entries = groupByTag(spec).flatMap((tag) => tag.operations);
  const byId = (id: string) =>
    entries.find((entry) => entry.operation.operationId === id)!;

  it("sends the key only where the document asks for one", () => {
    expect(buildCurl(spec, SERVER, byId("getCatalogue"))).not.toContain(
      "Authorization",
    );
    expect(buildCurl(spec, SERVER, byId("listDeliveries"))).toContain(
      "Authorization",
    );
  });

  it("fills a path id with a valid example", () => {
    expect(buildCurl(spec, SERVER, byId("getDelivery"))).toMatch(
      /\/integration\/v1\/deliveries\/[0-9a-f-]{36}"/,
    );
  });

  it("sends the body and the Idempotency-Key a write requires", () => {
    const write = entries.find((entry) => entry.method === "POST");

    if (!write) return;

    const curl = buildCurl(spec, SERVER, write);

    expect(curl).toContain("-X POST");
    expect(curl).toContain("Idempotency-Key:");
    expect(curl).toContain("--data '");
  });

  it("keeps one Idempotency-Key per document across repeats of the same paste", () => {
    const write = entries.find((entry) => entry.method === "POST");

    expect(write, "o documento publica uma escrita").toBeDefined();

    const curl = buildCurl(spec, SERVER, write!);

    // A key generated inside the command ($(uuidgen)) is a new key on every
    // paste: a retry would create the document twice.
    expect(curl).not.toMatch(/Idempotency-Key: \$\(/);
    expect(curl).toContain('-H "Idempotency-Key: $IDEMPOTENCY_KEY"');

    const [assignment] = curl.split("\n");
    const pattern = new RegExp(
      write!.operation.parameters!.find(
        (parameter) => parameter.name === "idempotency-key",
      )!.schema!.pattern as string,
    );
    const value = /^IDEMPOTENCY_KEY="([^"]+)"/.exec(assignment)?.[1];

    // Set once, above the call, with a value the API accepts.
    expect(value, assignment).toBeDefined();
    expect(value).toMatch(pattern);
    expect(assignment).toContain("repita");
  });

  /** The JSON after `--data '`, as the shell would pass it. */
  function sentBody(curl: string): unknown {
    const quoted = /--data '([\s\S]*)'$/.exec(curl)?.[1];

    return quoted === undefined
      ? undefined
      : JSON.parse(quoted.replace(/'\\''/g, "'"));
  }

  it("sends the write's example exactly as the document publishes it", () => {
    const write = entries.find((entry) => entry.method === "POST")!;
    const published =
      write.operation.requestBody?.content?.["application/json"]?.example;

    // The API posts this same example in its E2E suite and expects 201.
    expect(published, "o documento publica um exemplo de corpo").toBeDefined();
    expect(sentBody(buildCurl(spec, SERVER, write))).toEqual(published);
    expect(
      requestExample(jsonMedia(write.operation.requestBody?.content)),
    ).toEqual(published);
  });

  it("never invents a body the reader would send, when the document gives none", () => {
    const write = entries.find((entry) => entry.method === "POST")!;
    const media = write.operation.requestBody!.content!["application/json"];
    const { example: _example, examples: _examples, ...withoutExample } = media;
    const bare = {
      ...write,
      operation: {
        ...write.operation,
        requestBody: {
          ...write.operation.requestBody,
          content: { "application/json": withoutExample },
        },
      },
    };

    const curl = buildCurl(spec, SERVER, bare);

    // The schema-built body had shipper_id AND shipper_cnpj and "texto" in
    // the CEP, the UF and the NF-e key: the API refused it with nine issues.
    expect(curl).not.toContain("texto");
    expect(curl).not.toContain("--data '");
    expect(curl).toContain("--data @corpo.json");
    expect(curl.split("\n")[1]).toMatch(/^# corpo\.json: /);
    expect(requestExample(withoutExample)).toBeUndefined();

    const page = renderToStaticMarkup(
      React.createElement(ReferenceView, {
        spec: {
          ...spec,
          paths: {
            ...spec.paths,
            [write.path]: { ...spec.paths![write.path], post: bare.operation },
          },
        },
        serverUrl: SERVER,
      }),
    );
    const section = page.slice(page.indexOf(`id="${write.anchor}"`));

    expect(section.slice(0, section.indexOf("Respostas"))).not.toContain(
      "Exemplo de corpo",
    );
  });
});

describe("reading schemas", () => {
  it("resolves a $ref and keeps its siblings", () => {
    const resolved = resolveSchema(spec, {
      $ref: "#/components/schemas/WebhookDocumentData",
      description: "deste uso",
    });

    expect(resolved.properties?.delivery_id).toBeDefined();
    expect(resolved.description).toBe("deste uso");
  });

  it("names types the way a reader expects", () => {
    expect(
      typeLabel(spec, {
        anyOf: [{ type: "string" }, { type: "string", format: "date-time" }],
      }),
    ).toBe("string (date-time)");
    expect(typeLabel(spec, { type: ["string", "null"] })).toBe("string");
    expect(typeLabel(spec, { type: "array", items: { type: "string" } })).toBe(
      "string[]",
    );
    expect(
      typeLabel(spec, { $ref: "#/components/schemas/WebhookRouteData" }),
    ).toBe("WebhookRouteData");
  });

  it("tells a nullable field apart", () => {
    expect(isNullable({ type: ["string", "null"] })).toBe(true);
    expect(isNullable({ anyOf: [{ type: "string" }, { type: "null" }] })).toBe(
      true,
    );
    expect(isNullable({ type: "string" })).toBe(false);
  });

  it("flattens nested objects and arrays under their field", () => {
    const rows = schemaRows(spec, {
      type: "object",
      required: ["data"],
      properties: {
        data: {
          type: "array",
          items: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    });

    expect(rows.map((row) => [row.key, row.depth, row.required])).toEqual([
      ["data", 0, true],
      ["data.id", 1, false],
    ]);
  });

  it("builds an example from formats, enums and names", () => {
    expect(
      exampleFor(spec, {
        type: "object",
        properties: {
          delivery_id: { type: "string" },
          status: { type: ["string", "null"], enum: ["PENDING", null] },
          created_at: { type: "string", format: "date-time" },
        },
      }),
    ).toEqual({
      delivery_id: "0192f7f0-5c1e-7a3b-9d2e-4f6a8b0c1d2e",
      status: "PENDING",
      created_at: "2026-09-29T12:00:00.000Z",
    });
  });

  it("makes anchors without accents", () => {
    expect(slugify("Catálogo")).toBe("catalogo");
    expect(slugify("listDeliveries")).toBe("listdeliveries");
  });
});

describe("the descriptions", () => {
  const render = (source: string) =>
    renderToStaticMarkup(
      React.createElement(Markdown, {
        source,
        components: specProseComponents,
      }),
    );

  it("render as markdown, with code", () => {
    expect(render("Passe o `next_cursor` em `cursor`.")).toContain("<code");
  });

  it("treat braces and HTML as text: the document is data", () => {
    const out = render(
      "Corpo `{ code, message }` e <script>alert(1)</script> fim.",
    );

    expect(out).not.toContain("<script>");
    expect(out).toContain("{ code, message }");
  });
});

describe("reading the document from the API", () => {
  const ok = (body: unknown) =>
    vi.fn(
      async () => new Response(JSON.stringify(body), { status: 200 }),
    ) as unknown as typeof fetch;

  it("asks the public document, through the data cache", async () => {
    const fetchImpl = ok(spec);

    expect(
      await fetchPublicSpec("http://api.interna:3333/", fetchImpl),
    ).toEqual(spec);

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];

    expect(url).toBe("http://api.interna:3333/integration/docs/openapi.json");
    expect((init as { next?: { revalidate?: number } }).next?.revalidate).toBe(
      300,
    );
  });

  it("answers null, never throws, when the API cannot give it", async () => {
    expect(await fetchPublicSpec(undefined, ok(spec))).toBeNull();
    expect(
      await fetchPublicSpec(
        "http://api",
        (async () => new Response("", { status: 503 })) as typeof fetch,
      ),
    ).toBeNull();
    expect(
      await fetchPublicSpec("http://api", ok({ nao: "é o documento" })),
    ).toBeNull();
    expect(
      await fetchPublicSpec("http://api", (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch),
    ).toBeNull();
  });

  it("links the browser to the address the document states", () => {
    vi.stubEnv("PUBLIC_API_URL", "http://localhost:3333/");

    expect(publicApiUrl(spec)).toBe(SERVER);
    expect(publicApiUrl(null)).toBe("http://localhost:3333");
  });
});

describe("when the API does not answer", () => {
  it("says so and points at the raw document and the console, never at a copy", async () => {
    const { SpecUnavailableNotice } =
      await import("@/app/docs/_components/reference/spec-unavailable-notice");

    const notice = renderToStaticMarkup(
      React.createElement(SpecUnavailableNotice, {
        specUrl: `${SERVER}/integration/docs/openapi.json`,
      }),
    );

    expect(notice).toContain("Referência indisponível agora");
    expect(notice).toContain(`href="${SERVER}/integration/docs/openapi.json"`);
    expect(notice).toContain('href="/docs/console"');
  });
});

describe("the console link", () => {
  it("redirects to the console on the API the document names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(spec), { status: 200 })),
    );
    vi.stubEnv("HTTP_REQUEST", "http://api.interna:3333");

    const { GET } = await import("@/app/docs/console/route");
    const response = await GET(
      new Request("https://www.exemplo.com.br/docs/console"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${SERVER}/integration/docs`);
  });

  it("falls back to the reference when no address is known", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    vi.stubEnv("HTTP_REQUEST", "http://api.interna:3333");
    vi.stubEnv("PUBLIC_API_URL", "");

    const { GET } = await import("@/app/docs/console/route");
    const response = await GET(
      new Request("https://www.exemplo.com.br/docs/console"),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.exemplo.com.br/docs/referencia",
    );
  });
});
