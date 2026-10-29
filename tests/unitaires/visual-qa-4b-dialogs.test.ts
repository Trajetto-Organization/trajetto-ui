import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Row-menu, profile and confirm dialogs captured in the dark theme at every
 * width (wave 4b, second dialog pass). What they showed:
 * - Deletar Motorista / Excluir Abastecimento at 375px: the consequence
 *   lists inherited the header's phone centring — bullets at the left edge,
 *   ragged centred lines beside them.
 * - Limite de Veículos / Módulos Contratados: the description was `truncate`,
 *   so the company name ended in "Transportad…" on a phone.
 * - Ten dialogs (2FA, Atualizar Senha, the delete confirmations of parts,
 *   service orders, shippers, occurrence types, status reasons, quotes and
 *   companies) painted a fixed neutral `#121214` in the dark theme instead of
 *   the theme's background, a black box over the navy app.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

import { DialogHeader } from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";

(globalThis as { React?: typeof React }).React = React;

const SRC = resolve(__dirname, "../../src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return files(path);

    return /\.tsx$/.test(name) ? [path] : [];
  });
}

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function render(element: React.ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

describe("row dialogs in the dark theme and on a phone", () => {
  for (const [label, Header] of [
    ["DialogHeader", DialogHeader],
    ["AlertDialogHeader", AlertDialogHeader],
  ] as const) {
    it(`${label}: the consequence list stays left-aligned even with the header centred`, async () => {
      const host = await render(
        createElement(
          Header,
          null,
          createElement("ul", null, createElement("li", null, "item")),
        ),
      );

      const classes = (host.firstElementChild as HTMLElement).className.split(
        /\s+/,
      );

      expect(classes).toContain("text-center");
      expect(classes).toContain("[&_ul]:text-left");
      expect(classes).toContain("[&_ol]:text-left");
    });
  }

  it("a dialog description does not clip the text with an ellipsis", () => {
    const offenders = files(SRC).flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(
          /<DialogDescription[^>]*className="[^"]*\btruncate\b/g,
        ),
      ].map(() => relative(SRC, file)),
    );

    expect(offenders).toEqual([]);
  });

  it("no dialog paints a fixed black in place of the theme background", () => {
    const offenders = files(SRC).filter((file) =>
      readFileSync(file, "utf8").includes("#121214"),
    );

    expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
  });
});
