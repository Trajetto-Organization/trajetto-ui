// @vitest-environment node
import { createElement } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { blogMdxComponents } from "@/components/mdx";
import { legalMdxComponents } from "@/components/legal/legal-prose";

import {
  getPost,
  getPosts,
  getRelatedPosts,
  loadAllPosts,
  parsePost,
} from "@/lib/content/blog";
import {
  getLegalDocument,
  getLegalDocuments,
  loadLegalDocuments,
  parseLegalDocument,
} from "@/lib/content/legal";
import {
  EMPTY_FILTERS,
  filterPosts,
  paginate,
  readFilters,
  toSearchString,
} from "@/lib/content/blog-search";
import { visibleItems } from "@/lib/content/drafts";
import { LEGAL_DOCUMENTS } from "@/lib/content/legal-documents";
import { renderMdx } from "@/lib/content/mdx";

import { renderHtml } from "./helpers/render-html";

/**
 * The MDX pipeline of the blog and the legal pages (decision 10.1).
 *
 * A broken file must fail here and in the build, never reach a visitor: the
 * frontmatter is a contract, the body follows rules the page depends on (one
 * <h1>, no images in the blog, no code in the content), and every file in
 * src/content has to compile and render with the components its page uses.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(frontmatter: string, body = "Texto do artigo.\n") {
  return `---\n${frontmatter.trim()}\n---\n\n${body}`;
}

const VALID_POST = `
title: "Comprovante de entrega digital na prática"
description: "O que torna um comprovante de entrega confiável: foto do canhoto, assinatura, GPS, hash do documento e verificação pública."
slug: "comprovante-digital"
date: "2026-09-10"
category: "entregas"
tags: ["comprovante", "canhoto"]
`;

describe("blog frontmatter", () => {
  it("accepts a complete post and fills the defaults", () => {
    const parsed = parsePost("comprovante-digital.mdx", post(VALID_POST));

    expect(parsed).toMatchObject({
      slug: "comprovante-digital",
      date: "2026-09-10",
      author: "Equipe Trajetto",
      featured: false,
      draft: false,
      category: { slug: "entregas", title: "Gestão de entregas" },
      seo: { keywords: [] },
    });
    expect(parsed.readingTime).toBeGreaterThanOrEqual(1);
  });

  it("reads an unquoted YAML date as the same calendar day", () => {
    const parsed = parsePost(
      "comprovante-digital.mdx",
      post(VALID_POST.replace('date: "2026-09-10"', "date: 2026-09-10")),
    );

    expect(parsed.date).toBe("2026-09-10");
  });

  it.each([
    ["no title", (fm: string) => fm.replace(/title: .*\n/, ""), /title/],
    [
      "a date in another format",
      (fm: string) => fm.replace("2026-09-10", "10/09/2026"),
      /date: use o formato AAAA-MM-DD/,
    ],
    [
      "a day that does not exist",
      (fm: string) => fm.replace("2026-09-10", "2026-02-30"),
      /date: data inexistente/,
    ],
    [
      "an unknown category",
      (fm: string) => fm.replace('"entregas"', '"marketing"'),
      /categories\.ts/,
    ],
    [
      "a slug that is not the file name",
      (fm: string) =>
        fm.replace('slug: "comprovante-digital"', 'slug: "outro"'),
      /difere do nome do arquivo/,
    ],
    [
      "a cover image",
      (fm: string) => `${fm}image: "/capa.png"\n`,
      /não usa imagens/,
    ],
    [
      "a misspelled key",
      (fm: string) => `${fm}updatedAt: "2026-09-12"\n`,
      /Unrecognized key/,
    ],
    [
      "an update before the publication",
      (fm: string) => `${fm}updated: "2026-09-01"\n`,
      /updated: não pode ser anterior/,
    ],
    [
      "a personal byline (posts are signed by the team)",
      (fm: string) => `${fm}author: "Fulano"\n`,
      /author/,
    ],
    // Search results cut the <title> around 60 characters, " | Trajetto"
    // (11) included: 49 is what a page title may use.
    [
      "a title too long for search with no short seo.title",
      (fm: string) =>
        fm.replace(
          /title: .*\n/,
          'title: "Comprovante de entrega digital: foto, assinatura e GPS"\n',
        ),
      /seo\.title: obrigatório/,
    ],
    [
      "an seo.title the template pushes past 60 characters",
      (fm: string) => `${fm}seo:\n  title: "${"a".repeat(50)}"\n`,
      /seo\.title: .*49/,
    ],
  ])("rejects %s, naming the file", (_case, change, message) => {
    const run = () =>
      parsePost("comprovante-digital.mdx", post(change(VALID_POST)));

    expect(run).toThrow(/comprovante-digital\.mdx/);
    expect(run).toThrow(message);
  });

  it("takes a long title when a short seo.title goes to the search result", () => {
    const longTitle = "Comprovante de entrega digital: foto, assinatura e GPS";
    const parsed = parsePost(
      "comprovante-digital.mdx",
      post(
        VALID_POST.replace(/title: .*\n/, `title: "${longTitle}"\n`) +
          'seo:\n  title: "Comprovante de entrega digital"\n',
      ),
    );

    expect(parsed.title).toBe(longTitle);
    expect(parsed.seo.title).toBe("Comprovante de entrega digital");
  });
});

describe("legal frontmatter", () => {
  const VALID_LEGAL = `
title: "Política de Cookies"
description: "Todos os cookies que a aplicação grava, um a um, com prazo e finalidade."
slug: "cookies"
updatedAt: "2026-09-28"
effectiveAt: "2026-10-01"
`;

  it("accepts a registered document and takes the label from the registry", () => {
    const doc = parseLegalDocument("cookies.mdx", post(VALID_LEGAL));

    expect(doc).toMatchObject({
      slug: "cookies",
      label: "Política de Cookies",
      effectiveAt: "2026-10-01",
      draft: false,
    });
  });

  it("refuses a document the registry does not list", () => {
    const run = () =>
      parseLegalDocument(
        "reembolso.mdx",
        post(VALID_LEGAL.replace('slug: "cookies"', 'slug: "reembolso"')),
      );

    expect(run).toThrow(/legal-documents\.ts/);
  });

  it("refuses a title the template pushes past 60 characters", () => {
    const run = () =>
      parseLegalDocument(
        "cookies.mdx",
        post(
          VALID_LEGAL.replace(
            'title: "Política de Cookies"',
            'title: "Política de Cookies e de outras tecnologias parecidas"',
          ),
        ),
      );

    expect(run).toThrow(/title: .*49/);
  });

  it("refuses a document without its effective date", () => {
    const run = () =>
      parseLegalDocument(
        "cookies.mdx",
        post(VALID_LEGAL.replace(/effectiveAt: .*\n/, "")),
      );

    expect(run).toThrow(/effectiveAt/);
  });
});

describe("the frontmatter language", () => {
  const MARKER = "__trajettoFrontmatterRan";

  const POST_DATA = {
    title: "Comprovante de entrega digital na prática",
    description:
      "O que torna um comprovante de entrega confiável: foto do canhoto, assinatura, GPS, hash do documento e verificação pública.",
    slug: "comprovante-digital",
    date: "2026-09-10",
    category: "entregas",
    tags: ["comprovante"],
  };

  const LEGAL_DATA = {
    title: "Política de Cookies",
    description:
      "Todos os cookies que a aplicação grava, um a um, com prazo e finalidade.",
    slug: "cookies",
    updatedAt: "2026-09-28",
    effectiveAt: "2026-10-01",
  };

  /** A block gray-matter would eval(): valid data, plus a side effect. */
  function scripted(language: string, data: object) {
    return `---${language}\n(globalThis.${MARKER} = true, ${JSON.stringify(data)})\n---\n\nTexto.\n`;
  }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[MARKER];
  });

  it.each([["js"], ["javascript"], ["JS"]])(
    "refuses a ---%s post without running it",
    (language) => {
      expect(() =>
        parsePost("comprovante-digital.mdx", scripted(language, POST_DATA)),
      ).toThrow(/comprovante-digital\.mdx: frontmatter só em YAML/);
      expect(globalThis).not.toHaveProperty(MARKER);
    },
  );

  it("refuses a ---js legal document without running it", () => {
    expect(() =>
      parseLegalDocument("cookies.mdx", scripted("js", LEGAL_DATA)),
    ).toThrow(/cookies\.mdx: frontmatter só em YAML/);
    expect(globalThis).not.toHaveProperty(MARKER);
  });

  it("refuses the other engines too, JSON included", () => {
    const json = `---json\n${JSON.stringify(POST_DATA)}\n---\n\nTexto.\n`;

    expect(() => parsePost("comprovante-digital.mdx", json)).toThrow(
      /comprovante-digital\.mdx: frontmatter só em YAML/,
    );
    // gray-matter drops a byte-order mark before reading the block.
    expect(() => parsePost("comprovante-digital.mdx", `﻿${json}`)).toThrow(
      /comprovante-digital\.mdx: frontmatter só em YAML/,
    );
    expect(() =>
      parsePost("comprovante-digital.mdx", `﻿${scripted("js", POST_DATA)}`),
    ).toThrow(/comprovante-digital\.mdx: frontmatter só em YAML/);
    expect(globalThis).not.toHaveProperty(MARKER);
    expect(() =>
      parseLegalDocument(
        "cookies.mdx",
        `---toml\ntitle = "x"\n---\n\nTexto.\n`,
      ),
    ).toThrow(/cookies\.mdx: frontmatter só em YAML/);
  });

  it("reads a block that names YAML explicitly", () => {
    const parsed = parsePost(
      "comprovante-digital.mdx",
      `---yaml\n${VALID_POST.trim()}\n---\n\nTexto.\n`,
    );

    expect(parsed.slug).toBe("comprovante-digital");
  });

  it("names the file when the YAML itself is broken", () => {
    const run = () =>
      parsePost(
        "comprovante-digital.mdx",
        post(`${VALID_POST}tags: [comprovante\n`),
      );

    expect(run).toThrow(/comprovante-digital\.mdx: frontmatter inválido/);
  });
});

describe("the body rules", () => {
  it.each([
    ["a level-one heading", "# Outro título\n", /o título da página já é o h1/],
    ["a markdown image", "![canhoto](/canhoto.png)\n", /imagem no corpo/],
    ["an image tag", '<img src="/canhoto.png" alt="" />\n', /imagem no corpo/],
    ["an import", 'import X from "y"\n\nTexto.\n', /import\/export/],
    ["a bare expression", "Total: {1 + 1}\n", /expressão/],
  ])("refuses %s", async (_case, body, message) => {
    await expect(
      renderMdx(body, { file: "teste.mdx", components: blogMdxComponents }),
    ).rejects.toThrow(message);
  });

  it("names the file when the MDX itself does not parse", async () => {
    await expect(
      renderMdx("<Callout>sem fechar\n", {
        file: "quebrado.mdx",
        components: blogMdxComponents,
      }),
    ).rejects.toThrow(/quebrado\.mdx/);
  });

  // Raw JSX skips the component map: a JSX <a> never reaches MdxLink's
  // scheme check, and a <script> would be served on the dashboard's origin.
  it.each([
    [
      "a JSX link, which would skip the safe link",
      '<a href="javascript:alert(1)">abrir</a>\n',
      /<a>/,
    ],
    [
      "an inline JSX link",
      'Veja <a href="javascript:alert(1)">aqui</a>.\n',
      /<a>/,
    ],
    ["a script", "<script>alert(1)</script>\n", /<script>/],
    ["an iframe", '<iframe src="https://exemplo.com"></iframe>\n', /<iframe>/],
    ["a style block", "<style>body</style>\n", /<style>/],
    [
      "a component of another page's map",
      "<CookieName>trajetto-theme</CookieName>\n",
      /<CookieName>.*Callout/,
    ],
    ["an unnamed fragment", "<>texto</>\n", /<>/],
    [
      "an attribute expression",
      '<Callout title={"x"}>oi</Callout>\n',
      /atributo/,
    ],
    ["a spread attribute", "<Callout {...props}>oi</Callout>\n", /atributo/],
    ["code between two comments", "{/* a */ alert(1) /* b */}\n", /expressão/],
  ])("refuses %s", async (_case, body, message) => {
    const run = renderMdx(body, {
      file: "teste.mdx",
      components: blogMdxComponents,
    });

    await expect(run).rejects.toThrow(/teste\.mdx/);
    await expect(
      renderMdx(body, { file: "teste.mdx", components: blogMdxComponents }),
    ).rejects.toThrow(message);
  });

  it("accepts an MDX comment and renders nothing of it", async () => {
    const { Content } = await renderMdx(
      "Antes.\n\n{/* nota para a revisão */}\n\nDepois {/* no meio */} do fim.\n",
      { file: "comentario.mdx", components: blogMdxComponents },
    );

    const html = renderHtml(createElement(Content));
    expect(html).toContain("Antes.");
    expect(html).toContain("do fim.");
    expect(html).not.toMatch(/nota para a revisão|no meio/);
  });

  it("accepts the components of the page's own map, with plain attributes", async () => {
    const legal = await renderMdx(
      "O cookie <CookieName>trajetto-theme</CookieName> guarda o tema. CNPJ: <Placeholder>CNPJ</Placeholder>.\n",
      { file: "cookies.mdx", components: legalMdxComponents },
    );
    const blog = await renderMdx(
      '<Callout type="dica" title="Na prática">Texto.</Callout>\n',
      {
        file: "dica.mdx",
        components: blogMdxComponents,
      },
    );

    expect(renderHtml(createElement(legal.Content))).toMatch(
      /<code[^>]*>trajetto-theme<\/code>/,
    );
    // A note, not a nested <aside> landmark (axe landmark-complementary-is-top-level).
    const blogHtml = renderHtml(createElement(blog.Content));
    expect(blogHtml).toMatch(
      /<div role="note" aria-label="Na prática"[^>]*>[\s\S]*Na prática/,
    );
    expect(blogHtml).not.toContain("<aside");
  });

  it("sends a markdown link through the safe link", async () => {
    const { Content } = await renderMdx("[abrir](javascript:alert(1))\n", {
      file: "link.mdx",
      components: blogMdxComponents,
    });

    expect(renderHtml(createElement(Content))).not.toContain("javascript:");
  });

  it("allows images only where a collection opts in", async () => {
    await expect(
      renderMdx("![diagrama](/diagrama.png)\n", {
        file: "guia.mdx",
        components: blogMdxComponents,
        allowImages: true,
      }),
    ).resolves.toBeDefined();
  });

  it("gives headings ids and lists them in the index", async () => {
    const { Content, toc } = await renderMdx(
      "## Por que importa\n\nTexto.\n\n### Na prática\n\nMais texto.\n",
      { file: "indice.mdx", components: blogMdxComponents },
    );

    expect(toc).toEqual([
      { id: "por-que-importa", text: "Por que importa", level: 2 },
      { id: "na-prática", text: "Na prática", level: 3 },
    ]);

    const html = renderHtml(createElement(Content));
    expect(html).toMatch(/<h2[^>]* id="por-que-importa"/);
    expect(html).toMatch(/<h3[^>]* id="na-prática"/);
  });

  it("renders a GFM table inside a scroll container", async () => {
    const { Content } = await renderMdx("| A | B |\n| - | - |\n| 1 | 2 |\n", {
      file: "tabela.mdx",
      components: blogMdxComponents,
    });

    const html = renderHtml(createElement(Content));
    expect(html).toMatch(
      /<div[^>]*class="[^"]*overflow-x-auto[^"]*"[^>]*><table/,
    );

    // And the keyboard can scroll it: a named, focusable region (axe
    // scrollable-region-focusable on /legal, tests/a11y/admin-and-public).
    // With no heading above it, the region is named by its number on the page.
    expect(html).toMatch(
      /<div role="region" aria-label="Tabela 1" tabindex="0"/,
    );
    expect(html).not.toContain("data-table-label");
  });

  it("names each table region after the section it sits in", async () => {
    const { Content } = await renderMdx(
      "## Dados que coletamos\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n| C | D |\n| - | - |\n| 3 | 4 |\n\n### Prazos\n\n| E | F |\n| - | - |\n| 5 | 6 |\n",
      { file: "tabelas.mdx", components: legalMdxComponents },
    );

    const labels = [
      ...renderHtml(createElement(Content)).matchAll(
        /role="region" aria-label="([^"]+)"/g,
      ),
    ].map((match) => match[1]);

    // Distinct names: a screen reader's landmark list tells them apart.
    expect(labels).toEqual([
      "Tabela: Dados que coletamos",
      "Tabela: Dados que coletamos (2)",
      "Tabela: Prazos",
    ]);
  });
});

describe("every file in src/content", () => {
  const posts = loadAllPosts();
  const legal = loadLegalDocuments();

  it("has content to check", () => {
    expect(posts.length).toBeGreaterThan(0);
    expect(legal.map((doc) => doc.slug)).toEqual(
      LEGAL_DOCUMENTS.map((doc) => doc.slug),
    );
  });

  it.each(posts.map((item) => [item.file, item] as const))(
    "blog/%s compiles and renders with the blog components",
    async (_file, item) => {
      const { Content } = await renderMdx(item.body, {
        file: item.file,
        components: blogMdxComponents,
      });
      const html = renderHtml(createElement(Content));

      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toMatch(/<h1[\s>]/);
    },
  );

  // A renamed slug turns an internal link into a silent 404: every
  // `](/blog/<slug>)` and `](/legal/<slug>)` in a text must lead to a file
  // that is published (a draft may link to another draft).
  const INTERNAL_LINK = /\]\(\/(blog|legal)\/([^)#?\s]+)/g;

  it("has internal links to check", () => {
    const links = [...posts, ...legal].flatMap((item) => [
      ...item.body.matchAll(INTERNAL_LINK),
    ]);

    expect(links.length).toBeGreaterThan(10);
  });

  it.each([...posts, ...legal].map((item) => [item.file, item] as const))(
    "%s links only to posts and policies that exist",
    (_file, item) => {
      const linkerIsDraft = "draft" in item && item.draft === true;
      const published = {
        blog: new Set(
          posts
            .filter((post) => !post.draft || linkerIsDraft)
            .map((post) => post.slug),
        ),
        legal: new Set(legal.map((doc) => doc.slug)),
      };

      const broken = [...item.body.matchAll(INTERNAL_LINK)]
        .filter(
          ([, kind, slug]) => !published[kind as "blog" | "legal"].has(slug),
        )
        .map(([link]) => link);

      expect(broken).toEqual([]);
    },
  );

  it.each(legal.map((doc) => [doc.file, doc] as const))(
    "legal/%s compiles and renders with the legal components",
    async (_file, doc) => {
      const { Content } = await renderMdx(doc.body, {
        file: doc.file,
        components: legalMdxComponents,
      });
      const html = renderHtml(createElement(Content));

      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toMatch(/<h1[\s>]/);
    },
  );
});

describe("drafts", () => {
  // A fixture, not the repository: the content packages publish the real
  // texts, and this rule must keep being proven once no file is a draft.
  const items = [
    { slug: "publicado", draft: false },
    { slug: "rascunho", draft: true },
  ];

  it.each([
    ["development", ["publicado", "rascunho"]],
    ["test", ["publicado", "rascunho"]],
    ["production", ["publicado"]],
  ])("with NODE_ENV=%s a visitor sees %j", (env, expected) => {
    vi.stubEnv("NODE_ENV", env);

    expect(visibleItems(items).map((item) => item.slug)).toEqual(expected);
  });

  it("lets a caller decide explicitly, whatever the build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(visibleItems(items, true)).toHaveLength(2);

    vi.stubEnv("NODE_ENV", "development");
    expect(visibleItems(items, false).map((item) => item.slug)).toEqual([
      "publicado",
    ]);
  });

  it("is the rule the loaders apply to the repository's files", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getPosts().map((meta) => meta.slug)).toEqual(
      visibleItems(loadAllPosts(), false).map((item) => item.slug),
    );
    expect(getLegalDocuments().map((meta) => meta.slug)).toEqual(
      visibleItems(loadLegalDocuments(), false).map((doc) => doc.slug),
    );

    vi.stubEnv("NODE_ENV", "development");
    expect(getPosts()).toHaveLength(loadAllPosts().length);
    expect(getLegalDocuments()).toHaveLength(loadLegalDocuments().length);
  });

  // Passes without drafts; checks each one while the stubs still are.
  it("are listed while developing and left out of a production build", () => {
    const drafts = loadAllPosts().filter((item) => item.draft);
    const draftDocs = loadLegalDocuments().filter((doc) => doc.draft);

    vi.stubEnv("NODE_ENV", "development");
    for (const item of drafts) expect(getPost(item.slug)).not.toBeNull();
    for (const doc of draftDocs)
      expect(getLegalDocument(doc.slug)).not.toBeNull();

    vi.stubEnv("NODE_ENV", "production");
    for (const item of drafts) {
      expect(getPost(item.slug)).toBeNull();
      expect(getPosts().map((meta) => meta.slug)).not.toContain(item.slug);
    }
    for (const doc of draftDocs) {
      expect(getLegalDocument(doc.slug)).toBeNull();
      expect(getLegalDocuments().map((meta) => meta.slug)).not.toContain(
        doc.slug,
      );
    }
  });
});

describe("related posts", () => {
  it("ranks by shared category and tags, and never returns the post itself", () => {
    const posts = getPosts({ includeDrafts: true });

    for (const item of posts) {
      const related = getRelatedPosts(item.slug, 3, { includeDrafts: true });

      expect(related.map((meta) => meta.slug)).not.toContain(item.slug);
      expect(related.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("blog search and paging", () => {
  const base = parsePost(
    "comprovante-digital.mdx",
    `---\n${VALID_POST.trim()}\n---\n\nTexto.\n`,
  );
  const { body: _body, file: _file, ...first } = base;

  const second = {
    ...first,
    slug: "checklist-veicular",
    title: "Checklist veicular: o que não pode faltar",
    description:
      "Itens essenciais, fotos obrigatórias e periodicidade da inspeção.",
    category: { ...first.category, slug: "frotas", title: "Gestão de frotas" },
    tags: ["Manutenção"],
  };

  it("matches every word, ignoring accents and case", () => {
    expect(
      filterPosts([first, second], {
        query: "GESTAO frotas",
        category: "",
        tag: "",
      }),
    ).toEqual([second]);
    expect(
      filterPosts([first, second], {
        query: "canhoto digital",
        category: "",
        tag: "",
      }),
    ).toEqual([first]);
    expect(
      filterPosts([first, second], {
        query: "canhoto frotas",
        category: "",
        tag: "",
      }),
    ).toEqual([]);
  });

  it("filters by category and by tag, the tag without accents too", () => {
    expect(
      filterPosts([first, second], { query: "", category: "frotas", tag: "" }),
    ).toEqual([second]);
    expect(
      filterPosts([first, second], {
        query: "",
        category: "",
        tag: "manutencao",
      }),
    ).toEqual([second]);
  });

  it("keeps the page inside the range, whatever the URL says", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);

    expect(paginate(items, 1, 9)).toMatchObject({ page: 1, totalPages: 3 });
    expect(paginate(items, 99, 9)).toMatchObject({ page: 3, items: [18, 19] });
    expect(paginate(items, -4, 9).page).toBe(1);
    expect(paginate([], 2, 9)).toMatchObject({
      page: 1,
      totalPages: 1,
      items: [],
    });
  });

  it("writes and reads the same filters from the query string", () => {
    const filters = {
      query: "nota fiscal",
      category: "entregas",
      tag: "NF-e",
      page: 2,
    };
    const search = toSearchString(filters);

    expect(readFilters(new URLSearchParams(search))).toEqual(filters);
    expect(toSearchString(EMPTY_FILTERS)).toBe("");
  });
});
