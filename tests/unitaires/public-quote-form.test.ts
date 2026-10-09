import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The public quote form (/orcamento), rendered (PUB-17, decision 3.3).
 *
 * It collects name, company, e-mail and phone and stores them (the `Quote`
 * model), with no word about privacy at the point of collection. Five of its
 * six fields are required by the schema and only one said so; the e-mail
 * error was typed away (`as any`); and a benefit promised "até 30%" of
 * savings nothing in the product measures (decision 10.5). And the message
 * refused any line break: a form post sends it as CRLF, which `\s{2,}`
 * took for two spaces (decision 5.5 exempts line breaks). Blank lines pass on
 * both sides now (see quote-schema-api-parity.test.ts).
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const formState = vi.hoisted(() => ({ current: null as unknown }));

// Only Next's bundled react-dom has the form hooks; this runner's does not.
// The state they would hold is what each test sets.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();

  return {
    ...actual,
    useFormState: () => [formState.current, () => {}],
    useFormStatus: () => ({ pending: false }),
  };
});

vi.mock("@/actions/quote/create-quote", () => ({
  handleQuoteSubmit: () => undefined,
}));

import { QuoteForm } from "@/components/quote-form";
import { QUOTE_LIMITS, quoteSchema } from "@/schemas/quote-schema";
import { FORM_PRIVACY_HREF } from "@/lib/content/legal-documents";

import { loadLegalDocuments } from "@/lib/content/legal";
import { renderMdx } from "@/lib/content/mdx";
import { legalMdxComponents } from "@/components/legal/legal-prose";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(state: unknown = null): Promise<HTMLElement> {
  formState.current = state;

  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(QuoteForm));
  });

  return host;
}

function control(host: HTMLElement, id: string) {
  return host.querySelector(`#${id}`)!;
}

function labelOf(host: HTMLElement, id: string) {
  return host.querySelector(`label[for="${id}"]`)?.textContent;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the quote form", () => {
  it.each([
    ["name", "Nome completo *"],
    ["company", "Empresa *"],
    ["email", "E-mail *"],
    ["telephone", "Telefone *"],
  ])(
    "%s is required in the schema and says so: %j with aria-required",
    async (id, label) => {
      const host = await mount();

      expect(labelOf(host, id)).toBe(label);
      expect(control(host, id).getAttribute("aria-required")).toBe("true");
    },
  );

  // The fleet size is a group of radio buttons now (design: Orçamento ·
  // Operação): the group is named by its legend and carries aria-required.
  it('fleet_size is required in the schema and says so: the group is named "Tamanho da frota *" with aria-required', async () => {
    const host = await mount();
    const group = control(host, "fleet_size");

    expect(group.getAttribute("role")).toBe("radiogroup");
    expect(group.querySelector("legend")?.textContent).toBe(
      "Tamanho da frota *",
    );
    expect(group.getAttribute("aria-required")).toBe("true");
    expect(
      [...group.querySelectorAll('input[type="radio"][name="fleet_size"]')].map(
        (radio) => radio.getAttribute("value"),
      ),
    ).toEqual(["1-5", "6-15", "16-30", "31-50", "51-100", "101+"]);
  });

  it("shows the fleet size error on the group, tied by aria-describedby", async () => {
    const host = await mount({
      createQuoteError: {
        fleet_size: ["Por favor, selecione o tamanho da sua frota"],
      },
    });
    const group = control(host, "fleet_size");

    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-describedby")).toBe("fleet_size-error");
    expect(host.querySelector("#fleet_size-error")?.textContent).toBe(
      "Por favor, selecione o tamanho da sua frota",
    );
  });

  it("the message is the only optional field", async () => {
    const host = await mount();

    expect(labelOf(host, "message")).toBe("Mensagem (opcional)");
    expect(control(host, "message").hasAttribute("aria-required")).toBe(false);
    // The schema's limit, so the counter is the field and not an error later.
    expect(control(host, "message").getAttribute("maxlength")).toBe("230");
  });

  it.each([
    ["name", QUOTE_LIMITS.name],
    ["company", QUOTE_LIMITS.company],
    ["email", QUOTE_LIMITS.email],
    ["message", QUOTE_LIMITS.message],
  ] as const)(
    "%s stops at the schema limit (%i), without waiting for the server's answer",
    async (id, limit) => {
      const host = await mount();

      expect(control(host, id).getAttribute("maxlength")).toBe(String(limit));
    },
  );

  it("identifies the purpose of the personal fields (WCAG 1.3.5)", async () => {
    const host = await mount();

    expect(control(host, "name").getAttribute("autocomplete")).toBe("name");
    expect(control(host, "company").getAttribute("autocomplete")).toBe(
      "organization",
    );
    expect(control(host, "email").getAttribute("autocomplete")).toBe("email");
    expect(control(host, "telephone").getAttribute("autocomplete")).toBe("tel");
  });

  it("warns about privacy at the point of collection, read with the submit button", async () => {
    const host = await mount();

    const form = host.querySelector("form")!;
    // On the focusable button: on the <form> (no name, so no role) no
    // screen reader announced it.
    const button = form.querySelector('button[type="submit"]')!;
    const notice = host.querySelector(
      `#${button.getAttribute("aria-describedby")}`,
    )!;
    const link = notice.querySelector("a")!;

    expect(notice.textContent).toMatch(/pedido de orçamento/);
    expect(link.getAttribute("href")).toBe(
      "/legal/privacidade#3-site-e-pedidos-de-orçamento",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.textContent).toMatch(/Política de Privacidade.*nova aba/);

    // Before the button: read before sending, not after.
    expect(
      notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("names the form, which becomes a navigable landmark", async () => {
    const host = await mount();

    const form = host.querySelector("form")!;
    const title = host.querySelector(
      `#${form.getAttribute("aria-labelledby")}`,
    );

    expect(title?.textContent?.trim()).toBe("Solicite seu orçamento");
  });

  it("shows the e-mail error on the field, like the others", async () => {
    const host = await mount({
      createQuoteError: { email: ["O e-mail informado não é válido."] },
    });

    expect(control(host, "email").getAttribute("aria-invalid")).toBe("true");
    expect(host.querySelector("#email-error")?.textContent).toBe(
      "O e-mail informado não é válido.",
    );
  });

  it("does not promise savings the product does not measure, and also talks about deliveries", async () => {
    const host = await mount();
    const text = host.textContent ?? "";

    expect(text).not.toMatch(/até \d+\s?%/);
    expect(text).not.toMatch(/Suporte técnico especializado/);
    expect(text).toMatch(/entregas/i);
  });
});

describe("the quote message (quoteSchema)", () => {
  const lead = {
    name: "Ana Souza",
    company: "Transportes Souza",
    email: "ana@example.com",
    telephone: "(11) 91234-5678",
    fleet_size: "6-15",
  };

  const parse = (message: string) =>
    quoteSchema.safeParse({ ...lead, message });
  const messageErrors = (message: string) =>
    parse(message).error?.flatten().fieldErrors.message;

  it("accepts a line break as the browser sends it (CRLF) and hands LF to the API", () => {
    const parsed = parse("Linha 1\r\nLinha 2");

    expect(parsed.success, JSON.stringify(parsed.error?.flatten())).toBe(true);
    expect(parsed.data?.message).toBe("Linha 1\nLinha 2");
  });

  it("accepts a blank line between paragraphs (decision 5.5), like the API", () => {
    // Refused while the API's `\s{2,}` read "\n\n" as two spaces; both sides
    // now apply the multiline rule (quote-schema-api-parity.test.ts).
    const parsed = parse("Parágrafo 1\r\n\r\nParágrafo 2");

    expect(parsed.success, JSON.stringify(parsed.error?.flatten())).toBe(true);
    expect(parsed.data?.message).toBe("Parágrafo 1\n\nParágrafo 2");
  });

  it("still refuses a line that only has spaces", () => {
    expect(messageErrors("Parágrafo 1\r\n \r\nParágrafo 2")).toEqual([
      "As linhas da mensagem não podem começar ou terminar com espaço.",
    ]);
  });

  it.each([
    ["space before the break", "Linha 1 \r\nLinha 2"],
    ["space after the break", "Itens:\r\n - um"],
    ["tab before the break", "Linha 1\t\r\nLinha 2"],
  ])(
    "refuses a space at the end of a line (multiline rule): %s",
    (_, message) => {
      expect(messageErrors(message)).toEqual([
        "As linhas da mensagem não podem começar ou terminar com espaço.",
      ]);
    },
  );

  it.each([
    ["two spaces", "duas  palavras"],
    ["two tabs", "tab\t\tentre"],
    ["space and tab", "meio \tdo texto"],
    ["two spaces on the second line", "Linha 1\r\nLinha  2"],
  ])("still refuses consecutive spaces inside a line: %s", (_, message) => {
    expect(messageErrors(message)).toEqual([
      "A mensagem não deve conter espaços consecutivos.",
    ]);
  });

  it("still refuses spaces at the ends", () => {
    expect(messageErrors(" começa com espaço")).toEqual([
      "A mensagem não pode começar ou terminar com espaço em branco.",
    ]);
  });

  it("counts a line break as one character, like the field's maxlength", () => {
    const withBreak = (total: number) =>
      `${"a".repeat(total - 1 - 100)}\r\n${"b".repeat(100)}`;

    // 230 characters as the field counts them (231 as the form posts them).
    expect(parse(withBreak(230)).success).toBe(true);
    expect(messageErrors(withBreak(231))).toEqual([
      "A mensagem deve ter no máximo 230 caracteres.",
    ]);
  });
});

describe("the privacy link of the public forms", () => {
  it("points to an anchor that exists in the published Política de Privacidade", async () => {
    const [path, fragment] = FORM_PRIVACY_HREF.split("#");
    const doc = loadLegalDocuments().find(
      (item) => `/legal/${item.slug}` === path,
    );

    expect(doc, path).toBeDefined();

    const { Content } = await renderMdx(doc!.body, {
      file: doc!.file,
      components: legalMdxComponents,
    });
    const html = renderToStaticMarkup(createElement(Content));
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);

    expect(ids).toContain(fragment);
  });
});
