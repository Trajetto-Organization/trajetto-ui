import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

/**
 * Meu Perfil at 768px (visual sweep, wave 4b): the sections split in two
 * columns at `md`, a breakpoint that reads the window while the sidebar
 * leaves the page ~400px. The name field shrank to three letters ("Mot")
 * beside "Salvar Alterações" and the 2FA badge ran out of its card.
 */
import { ProtectedContentSectionColumns } from "@/app/(protected)/_components/layout/protected-content-section-collumns";

(globalThis as { React?: typeof React }).React = React;

describe("ProtectedContentSectionColumns", () => {
  it("only splits into columns from lg up, with the page wide enough", () => {
    const html = renderToStaticMarkup(
      createElement(ProtectedContentSectionColumns, {
        title: "Seu Nome",
        description: "Insira um novo nome",
        children: createElement("input"),
      }),
    );

    expect(html).toContain("lg:grid-cols-10");
    expect(html).not.toContain("md:grid-cols-10");
  });
});
