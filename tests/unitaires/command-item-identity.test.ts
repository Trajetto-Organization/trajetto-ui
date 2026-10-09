import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { commandKeywordFilter } from "@/lib/command-keyword-filter";
import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";

/**
 * Every cmdk item is identified by an explicit value.
 *
 * cmdk keys an item without `value` by its text and merges items whose values
 * are equal: two rows that read the same lit up together and Enter acted on
 * the first. The wizard pickers were fixed first
 * (search-pickers-item-identity.test.ts); the driver's lists and the table's
 * faceted filter had the same defect. The scan keeps a new list from bringing
 * it back.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { React?: typeof React }).React = React;

const SRC = join(__dirname, "..", "..", "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return sourceFiles(path);

    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("cmdk items carry their own value", () => {
  it("no <CommandItem> in src is keyed by its text", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, "utf8");

      // The opening tag runs until the first ">" that closes it: props
      // here hold arrow functions ("=>"), so skip those.
      for (const match of source.matchAll(/<CommandItem\b((?:[^>]|=>)*)>/g)) {
        if (!/\bvalue=/.test(match[1])) {
          const line = source.slice(0, match.index).split("\n").length;

          offenders.push(`${relative(SRC, file)}:${line}`);
        }
      }
    }

    expect(offenders, "CommandItem sem value explícito").toEqual([]);
  });
});

describe("commandKeywordFilter", () => {
  const ID = "018f0000-0000-7000-8000-00000000abcd";

  it("ignores the id's hex letters", () => {
    expect(commandKeywordFilter(ID, "a", ["Diesel S10"])).toBe(0);
    expect(commandKeywordFilter(ID, "abcd", ["Gasolina"])).toBe(0);
  });

  it("matches the keywords ignoring case and accents", () => {
    expect(commandKeywordFilter(ID, "OLEO", ["Filtro de óleo"])).toBe(1);
    expect(
      commandKeywordFilter(ID, "manutenção", ["Manutencao preventiva"]),
    ).toBe(1);
  });

  it("keeps everything for an empty search, and falls back to the value", () => {
    expect(commandKeywordFilter(ID, "  ", ["x"])).toBe(1);
    expect(commandKeywordFilter("Ativo", "ati")).toBe(1);
  });
});

let root: Root | null = null;

beforeAll(() => {
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function key(target: Element, name: string): Promise<void> {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: name,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

async function type(input: HTMLInputElement, text: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function openFilter(options: { label: string; value: string }[]) {
  const setFilterValue = vi.fn();

  const column = {
    getFacetedUniqueValues: () => new Map(),
    getFilterValue: () => undefined,
    setFilterValue,
  };

  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () =>
    root!.render(
      createElement(
        DataTableFacetedFilter as React.FC<Record<string, unknown>>,
        {
          column,
          title: "Status",
          options,
        },
      ),
    ),
  );

  const trigger = host.querySelector("button")!;

  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    trigger.click();
  });

  const input = document.querySelector<HTMLInputElement>("[cmdk-input]");

  expect(input, "o filtro não abriu").not.toBeNull();

  return { input: input!, setFilterValue };
}

describe("the table's faceted filter", () => {
  it("two options with the same label are two items, and Enter toggles the highlighted one", async () => {
    const { input, setFilterValue } = await openFilter([
      { label: "Pendente", value: "PENDING" },
      { label: "Pendente", value: "PENDING_REVIEW" },
    ]);

    const items = [...document.querySelectorAll("[cmdk-item]")];

    expect(items.map((item) => item.getAttribute("data-value"))).toEqual([
      "PENDING",
      "PENDING_REVIEW",
    ]);

    await key(input, "ArrowDown");

    expect(
      [...document.querySelectorAll('[cmdk-item][aria-selected="true"]')].map(
        (item) => item.getAttribute("data-value"),
      ),
      "mais de uma opção destacada ao mesmo tempo",
    ).toEqual(["PENDING_REVIEW"]);

    await key(input, "Enter");

    expect(setFilterValue).toHaveBeenLastCalledWith(["PENDING_REVIEW"]);
  });

  it("still searches by the label the person reads", async () => {
    const { input } = await openFilter([
      { label: "Ativo", value: "ACTIVE" },
      { label: "Inativo", value: "INACTIVE" },
      { label: "Bloqueado", value: "BLOCKED" },
    ]);

    await type(input, "bloq");

    expect(
      [...document.querySelectorAll("[cmdk-item]")].map((item) =>
        item.getAttribute("data-value"),
      ),
    ).toEqual(["BLOCKED"]);
  });
});
