// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import {
  docsMdxComponents,
  docsMdxComponentsFor,
} from "@/app/docs/_components/docs-mdx";
import { referenceToc } from "@/app/docs/_components/reference/reference-view";
import { docsFrontmatterSchema, loadGuides } from "@/app/docs/_lib/guides";
import { findOperation, resolveSchema } from "@/app/docs/_lib/openapi";
import {
  DOCS_CONSOLE_PATH,
  DOCS_GUIDE_SLUGS,
  DOCS_REFERENCE_PATH,
  DOCS_SECTIONS,
  docsGuideHref,
} from "@/app/docs/_lib/navigation";
import type { PublicSpec } from "@/app/docs/_lib/public-spec";
import { renderMdx } from "@/lib/content/mdx";

/**
 * The developer portal's guides: every file compiles under the content
 * rules, renders with the numbers of the API's public document, degrades
 * when the document is missing, and links only to pages and anchors that
 * exist. The document is a snapshot of `GET /integration/docs/openapi.json`
 * (tests/unitaires/fixtures/public-openapi.json), with the addresses pinned.
 */

// Vitest compiles TSX with the classic runtime.
(globalThis as { React?: typeof React }).React ??= React;

const spec = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "tests/unitaires/fixtures/public-openapi.json"),
    "utf8",
  ),
) as PublicSpec;

async function render(slug: string, document: PublicSpec | null) {
  const guide = loadGuides().find((entry) => entry.slug === slug)!;
  const { Content, toc } = await renderMdx(guide.body, {
    file: guide.file,
    components: docsMdxComponentsFor(document),
  });

  return {
    html: renderToStaticMarkup(React.createElement(Content)),
    toc,
    guide,
  };
}

describe("the guide registry", () => {
  it("has one file per menu entry, in the menu's order", () => {
    expect(loadGuides().map((guide) => guide.slug)).toEqual([
      ...DOCS_GUIDE_SLUGS,
    ]);
  });

  it("covers the guides the portal promises", () => {
    for (const slug of [
      "comeco-rapido",
      "autenticacao",
      "paginacao",
      "idempotencia",
      "erros",
      "limites",
      "webhooks",
      "assinatura",
      "changelog",
    ]) {
      expect(DOCS_GUIDE_SLUGS, slug).toContain(slug);
    }
  });

  it("applies the content pipeline's date rule to updatedAt", () => {
    const valid = {
      title: "Guia de teste",
      description: "Uma descrição longa o bastante para a regra do portal.",
      slug: "guia-de-teste",
    };

    // YAML reads an unquoted date as UTC midnight: the calendar day is kept.
    expect(
      docsFrontmatterSchema.parse({
        ...valid,
        updatedAt: new Date(Date.UTC(2026, 8, 29)),
      }).updatedAt,
    ).toBe("2026-09-29");

    // A day that does not exist is refused, as for the blog and the legal pages.
    const invalid = docsFrontmatterSchema.safeParse({
      ...valid,
      updatedAt: "2026-02-30",
    });

    expect(invalid.success).toBe(false);
    expect(JSON.stringify(invalid.error?.issues)).toContain("data inexistente");
  });

  it("gives the sitemap every page of the menu but the console redirect", async () => {
    const { docsSitemapPages } = await import("@/app/docs/_lib/guides");
    const pages = docsSitemapPages();
    const menu = DOCS_SECTIONS.flatMap((section) => section.items)
      .filter((item) => item.kind !== "console")
      .map((item) =>
        item.kind === "guide" ? docsGuideHref(item.slug) : item.href,
      );

    expect(pages.map((page) => page.path).sort()).toEqual([...menu].sort());
    expect(pages.map((page) => page.path)).not.toContain(DOCS_CONSOLE_PATH);

    // A guide carries its own revision day; the reference follows the live API.
    for (const guide of loadGuides()) {
      expect(
        pages.find((page) => page.path === docsGuideHref(guide.slug))
          ?.updatedAt,
      ).toBe(guide.updatedAt);
    }
    expect(
      pages.find((page) => page.path === DOCS_REFERENCE_PATH)?.updatedAt,
    ).toBeUndefined();
  });

  // The sitemap lists the guides through guide-index.ts; the MDX compiler is
  // guides.ts's, for the pages, and has no business in the sitemap's bundle.
  it("reads the guides for the sitemap without the MDX compiler", () => {
    const root = resolve(__dirname, "../..");
    const index = readFileSync(
      resolve(root, "src/app/docs/_lib/guide-index.ts"),
      "utf8",
    );
    const sitemap = readFileSync(resolve(root, "src/app/sitemap.ts"), "utf8");

    expect(index).not.toMatch(/@\/lib\/content\/mdx|@mdx-js/);
    expect(sitemap).toContain('from "@/app/docs/_lib/guide-index"');
    expect(sitemap).not.toContain('from "@/app/docs/_lib/guides"');
  });

  it("offers the same components live and in tests", () => {
    expect(Object.keys(docsMdxComponents).sort()).toEqual(
      Object.keys(docsMdxComponentsFor(null)).sort(),
    );
  });
});

describe("every guide", () => {
  it.each([...DOCS_GUIDE_SLUGS])(
    "%s compiles and renders with the document",
    async (slug) => {
      const { html, toc } = await render(slug, spec);

      expect(html.length).toBeGreaterThan(500);
      expect(new Set(toc.map((item) => item.id)).size, "ids repetidos").toBe(
        toc.length,
      );
      // With the document, no view falls back to "unavailable".
      expect(html).not.toContain("não respondeu agora");
    },
  );

  it.each([...DOCS_GUIDE_SLUGS])(
    "%s still renders without the document",
    async (slug) => {
      const { html } = await render(slug, null);

      expect(html.length).toBeGreaterThan(300);
    },
  );
});

describe("the numbers come from the document", () => {
  it("prints the limits the document states", async () => {
    const { html } = await render("limites", spec);
    const limits = spec["x-trajetto-limits"]!;

    expect(html).toContain(
      `${limits.business_per_minute.toLocaleString("pt-BR")} por minuto`,
    );
    expect(html).toContain(
      `até ${limits.key_per_minute_tenant_max.toLocaleString("pt-BR")} por minuto`,
    );
  });

  it("lists every topic and header of the document", async () => {
    const { html } = await render("webhooks", spec);
    const webhooks = spec["x-trajetto-webhooks"]!;

    for (const topic of webhooks.topics)
      expect(html, topic.topic).toContain(topic.topic);
    for (const header of webhooks.headers)
      expect(html, header.name).toContain(header.name);

    expect(html).toContain(`${webhooks.max_attempts} tentativas`);
    expect(html).toContain(`${webhooks.replay_window_days} dias`);
  });

  it("lists every scope with its state", async () => {
    const { html } = await render("autenticacao", spec);

    for (const entry of spec["x-trajetto-authentication"]!.scopes) {
      expect(html, entry.scope).toContain(entry.scope);
    }
  });

  it("states the signature tolerance and the rotation window of the document", async () => {
    const { html } = await render("assinatura", spec);
    const signature = spec["x-trajetto-webhooks"]!.signature;

    expect(html).toContain(`${signature.tolerance_seconds} segundos`);
    expect(html).toContain(`${signature.rotation_grace_hours} horas`);
  });

  it("shows the list parameters of the reference in the pagination guide", async () => {
    const { html } = await render("paginacao", spec);

    for (const name of ["limit", "cursor", "updated_since"])
      expect(html, name).toContain(name);
  });

  it("tells to compare updated_at only on the resources that publish it", () => {
    const guide = loadGuides().find((entry) => entry.slug === "paginacao")!;

    function itemFields(operationId: string): string[] {
      const operation = findOperation(spec, operationId)?.operation;
      const page = resolveSchema(
        spec,
        operation?.responses?.["200"]?.content?.["application/json"]?.schema,
      );
      const item = resolveSchema(
        spec,
        resolveSchema(spec, page.properties?.data).items,
      );

      return Object.keys(item.properties ?? {});
    }

    expect(itemFields("listDeliveries")).toContain("updated_at");

    // The advice for routes: the route object had no updated_at to compare,
    // and the guide said they worked "the same" as deliveries.
    const routes = [
      ...guide.body.matchAll(/<Callout[^>]*>([\s\S]*?)<\/Callout>/g),
    ]
      .map((match) => match[1])
      .find((text) => text.includes("/integration/v1/routes"));

    expect(routes, "o guia fala das rotas").toBeDefined();

    if (!itemFields("listRoutes").includes("updated_at")) {
      expect(routes).toContain("não traz `updated_at`");
    }
  });

  it("names, in the errors guide, the messages the document says are not Portuguese", () => {
    const guide = loadGuides().find((entry) => entry.slug === "erros")!.body;
    const intro = String(spec.info?.description ?? "");
    const errors = intro.slice(
      intro.indexOf("## Erros"),
      intro.indexOf("\n## ", intro.indexOf("## Erros") + 1),
    );

    // The fixed text the introduction lists: `Internal server error`. A
    // validation refusal now carries the first field's Portuguese sentence.
    const fixed = [...errors.matchAll(/`([A-Z][a-z][^`]*)`/g)].map(
      (match) => match[1],
    );

    expect(fixed).toEqual(expect.arrayContaining(["Internal server error"]));
    expect(fixed).not.toContain("Validation Error");
    expect(errors).toContain("MALFORMED_REQUEST");

    for (const text of fixed) expect(guide, text).toContain(`\`${text}\``);

    // The example's message is the first of its issues, as the API sends it.
    const example = JSON.parse(/```json\r?\n([\s\S]*?)```/.exec(guide)![1]) as {
      message: string;
      issues: string[];
    };

    expect(example.message).toBe(example.issues[0]);
    expect(guide).not.toContain("Validation Error");
    expect(guide).toMatch(/`MALFORMED_REQUEST`[^\n]*leitor de JSON/);
    expect(guide).not.toMatch(
      /^- `message`: uma frase em português, pronta para mostrar a quem usa\.$/m,
    );
  });

  it("names the write endpoints that take Idempotency-Key, from the document", async () => {
    const { html } = await render("idempotencia", spec);

    expect(html).toContain("/integration/v1/deliveries");
    expect(html).toContain("POST");
  });

  it("says where the numbers are when the document is missing", async () => {
    const { html } = await render("limites", null);

    expect(html).toContain("não respondeu agora");
    expect(html).toContain(`href="${DOCS_REFERENCE_PATH}"`);
  });
});

describe("the guides' links", () => {
  const guidesByHref = new Map(
    DOCS_GUIDE_SLUGS.map((slug) => [docsGuideHref(slug), slug]),
  );
  const referenceIds = new Set(referenceToc(spec).map((item) => item.id));

  function linksOf(body: string): string[] {
    return [...body.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  }

  it("point only at pages and anchors that exist", async () => {
    const broken: string[] = [];
    const tocs = new Map<string, Set<string>>();

    for (const slug of DOCS_GUIDE_SLUGS) {
      const { toc } = await render(slug, spec);
      tocs.set(docsGuideHref(slug), new Set(toc.map((item) => item.id)));
    }

    for (const guide of loadGuides()) {
      for (const link of linksOf(guide.body)) {
        const [path, anchor] = link.split("#");

        if (/^https:\/\//.test(link)) continue;

        if (!path) {
          if (!tocs.get(docsGuideHref(guide.slug))?.has(anchor))
            broken.push(`${guide.file}: ${link}`);
          continue;
        }

        if (path === DOCS_REFERENCE_PATH) {
          if (anchor && !referenceIds.has(anchor))
            broken.push(`${guide.file}: ${link}`);
          continue;
        }

        if (path === DOCS_CONSOLE_PATH) continue;

        if (!guidesByHref.has(path)) {
          broken.push(`${guide.file}: ${link}`);
          continue;
        }

        if (anchor && !tocs.get(path)?.has(anchor))
          broken.push(`${guide.file}: ${link}`);
      }
    }

    expect(broken).toEqual([]);
  });

  it("open the console in a new tab, as a plain link", async () => {
    const { html } = await render("visao-geral", spec);

    expect(html).toMatch(/<a[^>]*href="\/docs\/console"[^>]*target="_blank"/);
  });

  it("never use plain http", () => {
    for (const guide of loadGuides()) {
      expect(
        linksOf(guide.body).filter((link) => link.startsWith("http:")),
        guide.file,
      ).toEqual([]);
    }
  });

  it("are all reachable from the menu", () => {
    const menu = DOCS_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.title),
    );

    expect(menu).toContain("Referência da API");
    expect(menu).toContain("Console interativo");
  });
});
