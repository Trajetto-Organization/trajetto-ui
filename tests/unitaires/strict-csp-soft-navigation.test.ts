import * as React from "react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

// Components here compile to the classic JSX runtime under vitest.
vi.stubGlobal("React", React);

import {
  documentHasNonce,
  enforceStrictDocument,
  needsDocumentLoad,
} from "@/lib/strict-csp-document";
import { DocumentLink } from "@/components/shared/document-link";
import { MdxLink } from "@/components/mdx/mdx-link";
import {
  FOOTER_SECTIONS,
  PLATFORM_ENTRY,
  PUBLIC_NAV_LINKS,
  PUBLIC_PRODUCT_LINKS,
} from "@/lib/public-pages";

/**
 * A soft navigation keeps the CSP of the document loaded first. From a
 * prerendered page ('unsafe-inline' variant) into /login or the logged-in
 * area, that would leave the password page and the session without the nonce
 * policy. These pin both layers: plain anchors on the public pages, and the
 * reload backstop.
 */

class MemoryStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe("needsDocumentLoad", () => {
  it("is true for per-request pages, with query or hash", () => {
    expect(needsDocumentLoad("/login")).toBe(true);
    expect(needsDocumentLoad("/docs/idempotencia#chave")).toBe(true);
    expect(needsDocumentLoad("/dashboard?x=1")).toBe(true);
    expect(needsDocumentLoad("/verificar")).toBe(true);
  });

  it("is false for prerendered pages and other origins", () => {
    expect(needsDocumentLoad("/")).toBe(false);
    expect(needsDocumentLoad("/blog/x")).toBe(false);
    expect(needsDocumentLoad("/#app")).toBe(false);
    expect(needsDocumentLoad("//evil.example/login")).toBe(false);
    expect(needsDocumentLoad("https://x.example/login")).toBe(false);
  });
});

describe("DocumentLink", () => {
  it("renders a plain anchor (full load) into a per-request page", () => {
    const element = DocumentLink({ href: PLATFORM_ENTRY.href, children: "x" });

    expect(element.type).toBe("a");
    expect(element.props.href).toBe("/login");
  });

  it("keeps next/link between prerendered pages", () => {
    const element = DocumentLink({ href: "/blog", children: "x" });

    expect(element.type).not.toBe("a");
  });

  it("MDX links into the docs portal load a new document", () => {
    const outer = MdxLink({ href: "/docs/idempotencia", children: "guia" });

    expect(outer.type).toBe(DocumentLink);
    expect(DocumentLink(outer.props).type).toBe("a");
  });
});

describe("public pages never soft-navigate into a per-request page", () => {
  const ROOT = resolve(process.cwd(), "src");
  const SCANNED = [
    "components/site",
    "components/about",
    "components/contact-form",
    "components/quote-form",
    "components/blog",
    "components/legal",
    "components/mdx",
    "app/page.tsx",
    "app/not-found.tsx",
    "app/blog",
    "app/legal",
    "app/sobre",
    "app/contato",
    "app/orcamento",
    "app/gestao-de-frotas",
    "app/gestao-de-entregas",
    "app/app-do-motorista",
  ];

  function files(path: string): string[] {
    if (statSync(path).isDirectory()) {
      return readdirSync(path).flatMap((entry) => files(join(path, entry)));
    }

    return /\.tsx?$/.test(path) ? [path] : [];
  }

  /** href of each <Link …> element: a literal, or PLATFORM_ENTRY's. */
  function linkHrefs(source: string): string[] {
    const hrefs: string[] = [];

    for (const match of source.matchAll(/<Link\b/g)) {
      const tail = source.slice(match.index, (match.index ?? 0) + 600);
      const href = tail.match(
        /href=(?:"([^"]*)"|\{\s*["'`]([^"'`$]*)["'`]\s*\}|\{\s*(PLATFORM_ENTRY\.href)\s*\})/,
      );

      if (!href) continue;

      hrefs.push(href[3] ? PLATFORM_ENTRY.href : (href[1] ?? href[2]));
    }

    return hrefs;
  }

  it("no next/link with a per-request href in the public components", () => {
    const offenders = SCANNED.flatMap((entry) =>
      files(join(ROOT, entry)).flatMap((file) =>
        linkHrefs(readFileSync(file, "utf8"))
          .filter(needsDocumentLoad)
          .map((href) => `${file}: ${href}`),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("the menus still rendered with next/link hold no per-request page", () => {
    // The header renders these through DocumentLink.
    const hrefs = [...PUBLIC_PRODUCT_LINKS, ...PUBLIC_NAV_LINKS].map(
      (link) => link.href,
    );

    expect(hrefs.filter(needsDocumentLoad)).toEqual([]);
  });

  it("the footer's /docs entry is among the full-load links", () => {
    const footer = readFileSync(
      join(ROOT, "components/site/site-footer/index.tsx"),
      "utf8",
    );
    expect(footer).not.toContain('from "next/link"');

    const hrefs = FOOTER_SECTIONS.flatMap((section) => section.links).map(
      (link) => link.href,
    );

    expect(hrefs.filter(needsDocumentLoad)).toContain("/docs");
  });
});

describe("StrictCspGuard backstop", () => {
  it("detects the nonce attribute Next stamps on its scripts", () => {
    document.body.innerHTML = "<script>self.x=1</script>";
    expect(documentHasNonce(document)).toBe(false);

    const script = document.createElement("script");
    script.setAttribute("nonce", "");
    document.body.appendChild(script);
    expect(documentHasNonce(document)).toBe(true);
  });

  it("reloads a per-request page running under a nonce-less document, once", () => {
    const storage = new MemoryStorage();
    const reload = vi.fn();

    const args = { pathname: "/login", hasNonce: false, storage, reload };

    expect(enforceStrictDocument(args)).toBe(true);
    // The reload still landed without a nonce: no loop.
    expect(enforceStrictDocument(args)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("re-arms after a strict document is seen", () => {
    const storage = new MemoryStorage();
    const reload = vi.fn();

    enforceStrictDocument({
      pathname: "/login",
      hasNonce: false,
      storage,
      reload,
    });
    enforceStrictDocument({
      pathname: "/login",
      hasNonce: true,
      storage,
      reload,
    });
    enforceStrictDocument({
      pathname: "/login",
      hasNonce: false,
      storage,
      reload,
    });

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("leaves prerendered pages and strict documents alone", () => {
    const reload = vi.fn();

    enforceStrictDocument({
      pathname: "/blog",
      hasNonce: false,
      storage: new MemoryStorage(),
      reload,
    });
    enforceStrictDocument({
      pathname: "/dashboard",
      hasNonce: true,
      storage: new MemoryStorage(),
      reload,
    });
    enforceStrictDocument({
      pathname: "/dashboard",
      hasNonce: false,
      storage: null,
      reload,
    });

    expect(reload).not.toHaveBeenCalled();
  });

  it("is mounted in the root layout", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(layout).toMatch(/<StrictCspGuard \/>/);
  });
});
