import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, useQuery } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/deliveries",
  useSearchParams: () => new URLSearchParams(),
}));

import { queryClientProps } from "@/lib/query-client-props";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { PageToolbarProvider } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";

/**
 * "Atualizar", pressed in tab B after tab A changed something (§9 of
 * the phase contract, Geral 6; Entregas 1, 3, 4, 9 and 10).
 *
 * It used to invalidate the react-query keys a per-entity map listed for the
 * page's server tag. On the Entregas tab that was `["delivery"]`, a key no
 * query used, so the occurrence types of "Ver detalhes", the status reasons,
 * the message templates and the proof audit queue were never touched; and
 * where the key was right, `invalidateQueries` skipped the query because
 * nobody was rendering it (the dialog was closed), and the picker's
 * `refetchOnMount: false` skipped it again on reopening.
 *
 * Now the whole tab: the server tree is re-rendered, every cached query
 * nobody renders is dropped, every one on screen is refetched.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  localStorage.clear();
  router.refresh.mockClear();
});

const mounted: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (mounted.length) await mounted.pop()!();

  queryClientProps.clear();
});

async function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  const tree = (child: React.ReactElement) =>
    createElement(QueryClientProvider, { client: queryClientProps }, child);

  await act(async () => root.render(tree(element)));

  const unmount = async () => {
    await act(async () => root.unmount());
    container.remove();
  };

  mounted.push(unmount);

  return {
    container,
    rerender: (next: React.ReactElement) =>
      act(async () => root.render(tree(next))),
  };
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 30));
  });
}

/** The message templates panel: a query on screen while the button is pressed. */
const templates = vi.fn(async () => ["modelo"]);

const Panel = () => {
  useQuery(["delivery_message_template", BUSINESS], templates);
  return null;
};

/** The tower's trail with no driver picked: mounted, but disabled. */
const Trail = () => {
  useQuery(["driver_trail", BUSINESS, null], async () => [], {
    enabled: false,
  });
  return null;
};

/**
 * The button no longer takes a per-page list of tags (decision 2.1): what it
 * refreshes is the whole tab, whatever page renders it.
 */
function Screen() {
  return createElement(
    "div",
    null,
    createElement(Panel),
    createElement(Trail),
    createElement(DataTableRevalidate, {
      rateLimit: {
        storageKey: "revalidate-screen-test",
        maxClicks: 10,
        timeWindowMs: 30_000,
        cooldownTimeMs: 15_000,
      },
    }),
  );
}

function seedClosedDialogs(): void {
  // What "Ver detalhes" and the shipper picker leave behind when they close.
  queryClientProps.setQueryData(
    ["occurrence-types-select", BUSINESS],
    ["Avaria"],
  );
  queryClientProps.setQueryData(["shipper", BUSINESS], {
    pages: [],
    pageParams: [],
  });
}

async function press(container: HTMLElement): Promise<void> {
  const button = container.querySelector<HTMLButtonElement>(
    "button[data-revalidate]",
  );

  expect(button, "o botão Atualizar não foi renderizado").not.toBeNull();

  await act(async () => {
    button!.click();
  });

  await settle();
}

describe("the Atualizar button", () => {
  it("re-renders the server content of the page", async () => {
    const { container } = await render(createElement(Screen));

    await press(container);

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("drops what closed dialogs cached, so they fetch again when reopened", async () => {
    seedClosedDialogs();

    const { container } = await render(createElement(Screen));
    await press(container);

    const cache = queryClientProps.getQueryCache();

    expect(
      cache.find(["occurrence-types-select", BUSINESS]),
      "tipos de ocorrência",
    ).toBeUndefined();
    expect(cache.find(["shipper", BUSINESS]), "embarcadores").toBeUndefined();
  });

  it("refetches what is on screen, in place", async () => {
    const { container } = await render(createElement(Screen));
    await settle();

    templates.mockClear();

    await press(container);

    expect(templates).toHaveBeenCalledTimes(1);
    expect(
      queryClientProps.getQueryData(["delivery_message_template", BUSINESS]),
    ).toEqual(["modelo"]);
  });

  it("keeps a mounted query in the cache even while it is disabled", async () => {
    const { container } = await render(createElement(Screen));
    await press(container);

    // Removing it would leave the tower's trail observer holding a query the
    // cache no longer has.
    expect(
      queryClientProps.getQueryCache().find(["driver_trail", BUSINESS, null]),
    ).toBeDefined();
  });

  it("tells the state kept outside react-query (limits, metrics)", async () => {
    const heard = vi.fn();
    window.addEventListener("data-revalidated", heard);

    const { container } = await render(createElement(Screen));
    await press(container);

    window.removeEventListener("data-revalidated", heard);

    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("does not refresh again on later renders of the page", async () => {
    const { container, rerender } = await render(createElement(Screen));

    await press(container);
    templates.mockClear();

    // A page re-renders all day (realtime, typing); only a press refreshes.
    for (let render = 0; render < 3; render += 1) {
      await rerender(createElement(Screen));
      await settle();
    }

    expect(templates).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("the button's height (decision 16.61)", () => {
  const RATE_LIMIT = {
    storageKey: "revalidate-height-test",
    maxClicks: 10,
    timeWindowMs: 30_000,
    cooldownTimeMs: 15_000,
  };

  function button(container: HTMLElement): HTMLButtonElement {
    const found = container.querySelector<HTMLButtonElement>(
      "button[data-revalidate]",
    );

    expect(found, "o botão Atualizar não foi renderizado").not.toBeNull();

    return found!;
  }

  /**
   * Decision 16.61 reverses 3.6: beside the company selector the button is
   * h-9, the overviews' "Atualizar" size, not the selector's h-10.
   */
  it("is h-9 on the company selector's line", async () => {
    const { container } = await render(
      createElement(PageToolbarProvider, {
        hasContext: true,
        children: createElement(DataTableRevalidate, { rateLimit: RATE_LIMIT }),
      }),
    );

    expect(button(container).className.split(/\s+/)).toEqual(
      expect.arrayContaining(["h-9", "w-full"]),
    );
    expect(button(container).className.split(/\s+/)).not.toContain("h-10");
  });

  it("is h-9 anywhere else too, and a caller's own classes win", async () => {
    const plain = await render(
      createElement(DataTableRevalidate, { rateLimit: RATE_LIMIT }),
    );

    expect(button(plain.container).className.split(/\s+/)).toEqual(
      expect.arrayContaining(["h-9", "w-full"]),
    );

    const own = await render(
      createElement(PageToolbarProvider, {
        hasContext: true,
        children: createElement(DataTableRevalidate, {
          rateLimit: RATE_LIMIT,
          className: "h-7 w-7",
        }),
      }),
    );

    expect(button(own.container).className.split(/\s+/)).toEqual(
      expect.arrayContaining(["h-7", "w-7"]),
    );
    expect(button(own.container).className.split(/\s+/)).not.toContain("h-9");
  });
});
