// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";

import {
  measureRenderedContrast,
  themeTokens,
} from "./helpers/rendered-contrast";
import { React, renderHtml } from "./helpers/render-html";

// Only Next's bundled react-dom has the form hooks; the quote form's state
// is irrelevant to its colours.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();

  return {
    ...actual,
    useFormState: () => [null, () => {}],
    useFormStatus: () => ({ pending: false }),
  };
});

vi.mock("@/actions/quote/create-quote", () => ({
  handleQuoteSubmit: () => undefined,
}));

import { ContactForm } from "@/components/contact-form";
import { QuoteForm } from "@/components/quote-form";

/**
 * Text against what is painted behind it on the public contact and quote
 * forms, in both themes, against WCAG AA (4.5:1, or 3:1 for large text).
 *
 * The contact card was white text on the brand pink at 90%: over the light
 * page that is 4.48:1 for its body text, and its captions were white at
 * 70-80% (the "Em breve" lines at 60%), down to 2.2:1. The contact button
 * took the default primary-foreground, dark in the dark theme: 3.61:1.
 */
const SOURCES = {
  tokens: themeTokens(
    readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
  ),
};

function failures(html: string) {
  const window = new Window();
  window.document.body.innerHTML = html;

  const { findings, measured } = measureRenderedContrast(
    window.document as unknown as Document,
    SOURCES,
  );
  window.close();

  return {
    measured,
    failing: findings
      .filter(({ ratio, floor }) => ratio < floor)
      .map(
        ({ text, theme, ratio, where }) =>
          `${theme} ${ratio.toFixed(2)}:1 "${text}" (${where})`,
      ),
  };
}

describe("the public forms stay readable in both themes", () => {
  it("contact", () => {
    const { measured, failing } = failures(
      renderHtml(React.createElement(ContactForm)),
    );

    expect(measured).toBeGreaterThan(10);
    expect(failing).toEqual([]);
  });

  it("quote", () => {
    const { measured, failing } = failures(
      renderHtml(React.createElement(QuoteForm)),
    );

    expect(measured).toBeGreaterThan(10);
    expect(failing).toEqual([]);
  });
});
