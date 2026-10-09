import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/contact-form";
import {
  CONTACT_EMAIL,
  CONTACT_LIMITS,
  MAILTO_MAX_LENGTH,
  buildContactMailto,
  contactMessageSchema,
} from "@/components/contact-form/contact-message";

/**
 * The public contact form (/contato), rendered (PUB-17, decision 3.3).
 *
 * - The subject went into the mailto: link unencoded, so "Frota & entregas"
 *   cut the subject at "Frota " and turned the rest into a bogus parameter,
 *   and a "#" dropped everything after it, the body included.
 * - Nothing said which fields were needed, nothing checked them, and no
 *   label was tied to its field.
 * - Personal data was collected with no word about privacy.
 * - On a desktop the mail program opens over a page that stays visible, so
 *   the "visibilitychange" that was the only way out of "Enviando..." never
 *   fired: the button stayed disabled until the person switched tabs.
 * - Nothing bounded the text: a long message made a link past what the
 *   mail program accepts, and then nothing opened, with no word why.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;
let assign: ReturnType<typeof vi.fn>;

async function mount(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(ContactForm));
  });

  return host;
}

/** Types into a React-controlled field the way a person would. */
async function type(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value",
  )!.set!;

  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(host: HTMLElement) {
  const form = host.querySelector("form")!;

  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

function field(host: HTMLElement, name: string) {
  return host.querySelector(`[name="${name}"]`) as
    HTMLInputElement | HTMLTextAreaElement;
}

function labelOf(host: HTMLElement, control: Element) {
  return host.querySelector(`label[for="${control.id}"]`)?.textContent;
}

beforeEach(() => {
  // The navigation itself is the browser's; what is proven is the link the
  // form hands it and what the form does around it.
  assign = vi.fn();
  vi.spyOn(window.location, "assign").mockImplementation(assign);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the contact mailto link", () => {
  it("encodes the subject: & and # cut neither the subject nor the body", () => {
    const href = buildContactMailto({
      firstName: "Ana",
      lastName: "Souza",
      subject: "Frota & entregas #1 = 100%",
      message: "Olá",
    });

    const url = new URL(href);

    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("contato@intrajetto.com");
    expect([...url.searchParams.keys()]).toEqual(["subject", "body"]);
    expect(url.searchParams.get("subject")).toBe("Frota & entregas #1 = 100%");
    expect(url.hash).toBe("");
  });

  it("carries the name and the message in the body, with CRLF line breaks (RFC 6068)", () => {
    const href = buildContactMailto({
      firstName: "Ana",
      lastName: "",
      subject: "Dúvida",
      message: "Linha 1\nLinha 2 + mais",
    });

    const body = new URL(href).searchParams.get("body");

    expect(body).toBe("Olá, meu nome é Ana.\r\n\r\nLinha 1\r\nLinha 2 + mais");
    // A '+' must survive: some clients read the query as form data.
    expect(href).toContain("%2B");
  });
});

describe("the contact message limits", () => {
  const base = {
    firstName: "Ana",
    lastName: "Souza",
    subject: "Dúvida",
    message: "Olá",
  };

  it.each([
    ["firstName", CONTACT_LIMITS.firstName],
    ["lastName", CONTACT_LIMITS.lastName],
    ["subject", CONTACT_LIMITS.subject],
    ["message", CONTACT_LIMITS.message],
  ] as const)(
    "%s accepts up to %i characters and refuses one more",
    (name, limit) => {
      const at = contactMessageSchema.safeParse({
        ...base,
        [name]: "a".repeat(limit),
      });
      const over = contactMessageSchema.safeParse({
        ...base,
        [name]: "a".repeat(limit + 1),
      });

      expect(at.success, "no limite").toBe(true);
      expect(over.success, "acima do limite").toBe(false);
      expect(over.error?.flatten().fieldErrors[name]).toEqual([
        expect.stringMatching(new RegExp(`no máximo ${limit} caracteres`)),
      ]);
    },
  );

  it("a full message, in everyday Portuguese, still fits in the link", () => {
    const words =
      "Quero entender como o Trajetto organiza a frota, as rotas e as entregas.";
    const message = words
      .repeat(Math.ceil(CONTACT_LIMITS.message / words.length))
      .slice(0, CONTACT_LIMITS.message);
    const parsed = contactMessageSchema.safeParse({
      ...base,
      subject: "a".repeat(CONTACT_LIMITS.subject),
      message,
    });

    expect(parsed.success).toBe(true);
    expect(buildContactMailto(parsed.data!).length).toBeLessThanOrEqual(
      MAILTO_MAX_LENGTH,
    );
  });

  it("refuses, in the message, what only overflows once encoded", () => {
    const parsed = contactMessageSchema.safeParse({
      ...base,
      message: "ç".repeat(400),
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.message).toEqual([
      expect.stringMatching(
        /longa demais para abrir no seu programa de e-mail/,
      ),
    ]);
  });
});

describe("the contact form", () => {
  it("marks the required with * and the optional with (opcional), each label tied to its field", async () => {
    const host = await mount();

    expect(labelOf(host, field(host, "first_name"))).toBe("Nome *");
    expect(labelOf(host, field(host, "last_name"))).toBe(
      "Sobrenome (opcional)",
    );
    expect(labelOf(host, field(host, "subject"))).toBe("Assunto *");
    expect(labelOf(host, field(host, "message"))).toBe("Mensagem *");

    expect(field(host, "first_name").getAttribute("aria-required")).toBe(
      "true",
    );
    expect(field(host, "last_name").hasAttribute("aria-required")).toBe(false);
    expect(field(host, "subject").getAttribute("aria-required")).toBe("true");
    expect(field(host, "message").getAttribute("aria-required")).toBe("true");
  });

  it("warns about privacy, with a link to the policy section that covers contact", async () => {
    const host = await mount();

    // The description sits on the submit button, which is focusable: on
    // the <form> (no name, so no role) no screen reader announced it.
    const button = host.querySelector('button[type="submit"]')!;
    const notice = host.querySelector(
      `#${button.getAttribute("aria-describedby")}`,
    )!;
    const link = notice.querySelector("a")!;

    expect(notice.textContent).toMatch(/abre o seu programa de e-mail/);
    expect(link.getAttribute("href")).toBe(
      "/legal/privacidade#3-site-e-pedidos-de-orçamento",
    );
    expect(link.textContent).toContain("Política de Privacidade");
  });

  it("names the form, which becomes a navigable landmark", async () => {
    const host = await mount();

    const form = host.querySelector("form")!;
    const title = host.querySelector(
      `#${form.getAttribute("aria-labelledby")}`,
    );

    expect(title?.textContent?.trim()).toBe("Envie-nos uma mensagem");
  });

  it("writes the channel as 'E-mail', like the rest of the product", async () => {
    const host = await mount();
    const labels = [...host.querySelectorAll("p")].map((node) =>
      node.textContent?.trim(),
    );

    expect(labels).toContain("E-mail");
    expect(labels).not.toContain("Email");
  });

  it("shows on the card the same e-mail the form writes to", async () => {
    // Red before: the card said "Em breve · a definir" while the form's
    // mailto (and the legal pages' contact block) used this address.
    const host = await mount();
    const mailto = new URL(
      buildContactMailto({
        firstName: "Ana",
        lastName: "",
        subject: "Oi",
        message: "Olá",
      }),
    );
    const address = decodeURIComponent(mailto.pathname);

    const label = [...host.querySelectorAll("p")].find(
      (node) => node.textContent?.trim() === "E-mail",
    )!;
    const channel = label.parentElement!;
    const link = channel.querySelector("a")!;

    expect(address).toBe(CONTACT_EMAIL);
    expect(link.getAttribute("href")).toBe(`mailto:${CONTACT_EMAIL}`);
    expect(link.textContent?.trim()).toBe(CONTACT_EMAIL);
    expect(channel.textContent).not.toMatch(/Em breve|a definir/i);
  });

  it("limits each field in the field itself", async () => {
    const host = await mount();

    expect(field(host, "first_name").getAttribute("maxlength")).toBe(
      String(CONTACT_LIMITS.firstName),
    );
    expect(field(host, "last_name").getAttribute("maxlength")).toBe(
      String(CONTACT_LIMITS.lastName),
    );
    expect(field(host, "subject").getAttribute("maxlength")).toBe(
      String(CONTACT_LIMITS.subject),
    );
    expect(field(host, "message").getAttribute("maxlength")).toBe(
      String(CONTACT_LIMITS.message),
    );
  });

  it("does not open the e-mail with a required field empty and says what is missing, in the field", async () => {
    const host = await mount();

    await type(field(host, "first_name"), "   ");
    await submit(host);

    expect(assign).not.toHaveBeenCalled();

    for (const name of ["first_name", "subject", "message"]) {
      const control = field(host, name);
      const error = host.querySelector(`#${control.id}-error`);

      expect(control.getAttribute("aria-invalid"), name).toBe("true");
      expect(error?.textContent, name).toBeTruthy();
    }

    expect(field(host, "last_name").hasAttribute("aria-invalid")).toBe(false);
    // The person lands on the first thing to fix.
    expect(document.activeElement).toBe(field(host, "first_name"));
  });

  it("opens the e-mail with the encoded link and no spaces at the ends", async () => {
    const host = await mount();

    await type(field(host, "first_name"), " Ana ");
    await type(field(host, "subject"), "Frota & entregas #1");
    await type(field(host, "message"), "Quero uma demonstração.");
    await submit(host);

    expect(assign).toHaveBeenCalledTimes(1);

    const url = new URL(assign.mock.calls[0][0] as string);

    expect(url.searchParams.get("subject")).toBe("Frota & entregas #1");
    expect(url.searchParams.get("body")).toBe(
      "Olá, meu nome é Ana.\r\n\r\nQuero uma demonstração.",
    );
  });

  it("does not open a link too long for the e-mail program and says what to do, in the field", async () => {
    const host = await mount();

    // Within the field's limit, but every "ç" is six characters once encoded.
    await type(field(host, "first_name"), "Ana");
    await type(field(host, "subject"), "Orçamento");
    await type(field(host, "message"), "ção ".repeat(200).trim());
    await submit(host);

    expect(assign).not.toHaveBeenCalled();

    const message = field(host, "message");

    expect(message.getAttribute("aria-invalid")).toBe("true");
    expect(host.querySelector(`#${message.id}-error`)?.textContent).toMatch(
      /longa demais/,
    );
    expect(document.activeElement).toBe(message);
  });

  it("does not get stuck on 'abrindo' when the page stays visible (e-mail opened on top)", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    const host = await mount();

    await type(field(host, "first_name"), "Ana");
    await type(field(host, "subject"), "Assunto");
    await type(field(host, "message"), "Mensagem");
    await submit(host);

    const button = host.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    // The page never became hidden: no visibilitychange at all.
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    expect(button.disabled).toBe(false);
    expect(button.textContent).toMatch(/Enviar mensagem/i);
  });
});

describe("contact e-mail hit areas", () => {
  // Red before: the link was `block`, so its box (and its pointer target)
  // ran across the empty row up to the copy button. The rendered geometry is
  // proven in a browser by tests/ui/contact-email.spec.ts.
  it("sizes the e-mail link to its text, with no stretched pseudo-element", async () => {
    const host = await mount();
    const link = host.querySelector<HTMLAnchorElement>(
      "a[data-contact-email]",
    )!;
    const classes = link.className.split(/\s+/);

    expect(link.getAttribute("href")).toBe(`mailto:${CONTACT_EMAIL}`);
    expect(classes).toContain("inline-block");
    expect(classes).not.toContain("block");
    expect(classes).not.toContain("w-full");
    expect(classes.some((name) => /^(after|before):/.test(name))).toBe(false);
  });

  it("keeps the copy button a separate, focusable control that copies by keyboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const host = await mount();
    const link = host.querySelector<HTMLAnchorElement>(
      "a[data-contact-email]",
    )!;
    const button = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Copiar e-mail"]',
    )!;

    expect(link.contains(button)).toBe(false);
    expect(button.contains(link)).toBe(false);
    expect(button.type).toBe("button");

    // Enter/Space on a native button fire click; that is the keyboard path.
    button.focus();
    expect(document.activeElement).toBe(button);
    await act(async () => {
      button.click();
    });

    expect(writeText).toHaveBeenCalledWith(CONTACT_EMAIL);
    expect(button.getAttribute("aria-label")).toBe("E-mail copiado");
  });
});
