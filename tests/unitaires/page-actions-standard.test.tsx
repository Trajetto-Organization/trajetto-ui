import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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
const actions = vi.hoisted(() => ({
  getHealthMetrics: vi.fn(),
  getHealthProviders: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/vehicle",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/health/get-health-metrics", () => ({
  getHealthMetrics: actions.getHealthMetrics,
}));

vi.mock("@/actions/health/get-health-providers", () => ({
  getHealthProviders: actions.getHealthProviders,
}));

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { queryClientProps } from "@/lib/query-client-props";
import { DataTableRevalidate } from "@/app/(protected)/_components/shared/tanstack-table/data-table-revalidate";
import { ButtonRevalidation } from "@/app/(protected)/_components/overview-dashboard/revalidation-button";
import { KanbanRevalidationButton } from "@/app/(protected)/_components/kanban/revalidate-button";
import { RefreshButton } from "@/components/shared/custom/refresh-button";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";
import { StatCard } from "@/app/(protected)/_components/overview-dashboard/stat-card";
import { SystemMetrics } from "@/features/system-metrics";

void React;

/**
 * The owner's polish round of 08/10/2026 (decisions 16.450-16.454): one refresh button
 * ("Atualizar", arrows that spin while it runs), one size for page actions,
 * "+" on every create button, tighter stat cards, and the Sistema tab grid.
 */

const SRC = resolve(__dirname, "../../src");
const RATE_LIMIT = {
  maxClicks: 10,
  timeWindowMs: 30_000,
  cooldownTimeMs: 15_000,
};

let root: Root | null = null;
let host: HTMLElement | null = null;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  localStorage.clear();
  router.refresh.mockClear();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  host = null;
  queryClientProps.clear();
});

async function mount(element: React.ReactElement): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      <QueryClientProvider client={queryClientProps}>
        {element}
      </QueryClientProvider>,
    );
  });

  // The idle face is drawn after mount (the cooldown lives in localStorage).
  await act(async () => {
    await new Promise((done) => setTimeout(done, 10));
  });

  return host;
}

function refreshButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    "button[data-revalidate]",
  );

  expect(button, "o botão Atualizar não foi renderizado").not.toBeNull();

  return button!;
}

describe("the one refresh button", () => {
  const entryPoints: Array<[string, () => React.ReactElement]> = [
    [
      "the tables' DataTableRevalidate",
      () => (
        <DataTableRevalidate rateLimit={{ ...RATE_LIMIT, storageKey: "t1" }} />
      ),
    ],
    [
      "the overviews' ButtonRevalidation",
      () => (
        <ButtonRevalidation rateLimit={{ ...RATE_LIMIT, storageKey: "t2" }} />
      ),
    ],
    [
      "the Kanban's button",
      () => (
        <KanbanRevalidationButton
          rateLimit={{ ...RATE_LIMIT, storageKey: "t3" }}
        />
      ),
    ],
    [
      "the client panels' RefreshButton",
      () => <RefreshButton storageKey="t4" onRefresh={() => undefined} />,
    ],
  ];

  it.each(entryPoints)(
    "%s reads Atualizar with the refresh arrows, h-9",
    async (_name, element) => {
      const button = refreshButton(await mount(element()));

      expect(button.textContent?.trim()).toBe("Atualizar");
      expect(
        button.querySelector("svg.lucide-refresh-cw"),
        "sem o ícone de atualizar",
      ).not.toBeNull();
      expect(button.className.split(/\s+/)).toContain("h-9");
      expect(button.getAttribute("aria-busy")).toBe("false");
    },
  );

  it("spins, is disabled and aria-busy while the refresh runs, then settles", async () => {
    let answer: (value: string[]) => void = () => undefined;
    const slow = vi.fn(
      () =>
        new Promise<string[]>((done) => {
          answer = done;
        }),
    );

    // A query on screen that the refresh refetches and that answers late.
    const Panel = () => {
      useQuery(["slow-panel"], slow, { staleTime: Infinity });
      return null;
    };

    const container = await mount(
      <>
        <Panel />
        <DataTableRevalidate
          rateLimit={{ ...RATE_LIMIT, storageKey: "spin" }}
        />
      </>,
    );

    // The first load answers; the press then starts a refetch that hangs.
    await act(async () => answer(["first"]));

    await act(async () => {
      refreshButton(container).click();
      await new Promise((done) => setTimeout(done, 10));
    });

    const running = refreshButton(container);

    expect(running.getAttribute("aria-busy")).toBe("true");
    expect(running.disabled).toBe(true);
    expect(
      running.querySelector("svg.lucide-refresh-cw")?.getAttribute("class"),
    ).toContain("animate-spin");
    expect(running.textContent?.trim()).toBe("Atualizar");

    await act(async () => {
      answer(["second"]);
      await new Promise((done) => setTimeout(done, 30));
    });

    const settled = refreshButton(container);

    expect(settled.getAttribute("aria-busy")).toBe("false");
    expect(settled.disabled).toBe(false);
    expect(
      settled.querySelector("svg.lucide-refresh-cw")?.getAttribute("class"),
    ).not.toContain("animate-spin");
  });

  it("still counts down after the limit, instead of refreshing", async () => {
    const container = await mount(
      <DataTableRevalidate
        rateLimit={{
          maxClicks: 1,
          timeWindowMs: 30_000,
          cooldownTimeMs: 15_000,
          storageKey: "limit",
        }}
      />,
    );

    await act(async () => {
      refreshButton(container).click();
      await new Promise((done) => setTimeout(done, 30));
    });
    await act(async () => {
      refreshButton(container).click();
      await new Promise((done) => setTimeout(done, 30));
    });

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(refreshButton(container).textContent).toMatch(/Aguarde\s*\d+s/);
    expect(refreshButton(container).disabled).toBe(true);
  });
});

/** Every .tsx under a directory. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("the create buttons", () => {
  it("draw the plus icon before the words", async () => {
    const container = await mount(
      <button type="button">
        <CreateButtonLabel>Criar Fornecedor</CreateButtonLabel>
      </button>,
    );
    const button = container.querySelector("button")!;

    expect(button.firstElementChild?.matches("svg.lucide-plus")).toBe(true);
    expect(button.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(button.textContent).toBe("Criar Fornecedor");
  });

  it("use the shared label on every page's create button", () => {
    const creators = sources(SRC).filter((file) =>
      /data-tutorial="create-button"|data-tutorial="kanban-add-column"/.test(
        readFileSync(file, "utf8"),
      ),
    );

    // A sanity floor: the scan must be seeing the modules, not an empty tree.
    expect(creators.length).toBeGreaterThanOrEqual(20);

    const without = creators
      .filter(
        (file) => !readFileSync(file, "utf8").includes("<CreateButtonLabel>"),
      )
      .map((file) => relative(SRC, file));

    expect(without, "botões de criar sem o +").toEqual([]);
  });
});

describe("the notifications page actions", () => {
  it("give Marcar todas como lidas the page-action size, like Atualizar", () => {
    const source = readFileSync(
      resolve(SRC, "app/(protected)/_components/notification-list/index.tsx"),
      "utf8",
    );
    const start = source.lastIndexOf(
      "<Button",
      source.indexOf('data-tutorial="notifications-mark-all"'),
    );
    const tag = source.slice(
      start,
      source.indexOf(
        ">",
        source.indexOf('data-tutorial="notifications-mark-all"'),
      ),
    );

    // size="sm" is h-9 in the Button variants (decision 16.61); the default is h-10.
    expect(tag).toMatch(/size="sm"/);
  });
});

describe("the stat card", () => {
  async function card(): Promise<HTMLElement> {
    return mount(
      <StatCard
        title="Veículos"
        value={4}
        change={0}
        comparison="vs. início do mês"
        comparisonTitle="em relação ao total no início do mês"
        icon={<svg />}
        color="#3b82f6"
      />,
    );
  }

  it("reserves no empty second line under a one-line caption", async () => {
    const caption = (await card()).querySelector("[data-stat-card-caption]")!;

    expect(caption.className.split(/\s+/)).not.toContain("min-h-8");
    expect(caption.className.split(/\s+/)).toContain("line-clamp-2");
  });

  it("has a wider colour band than the old w-11 stripe", async () => {
    const band = (await card()).querySelector("[data-stat-card-band]")!;

    expect(band.className.split(/\s+/)).toContain("w-14");
  });

  it("keeps the long caption for screen readers but out of a copy", async () => {
    const container = await card();
    const long = container.querySelector("[data-stat-card-sr]")!;

    expect(long.textContent).toBe("0% em relação ao total no início do mês");
    expect(long.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["sr-only", "select-none"]),
    );
    // The short caption is the one on screen, hidden from the reader to avoid saying it twice.
    expect(
      container
        .querySelector("[data-stat-card-caption]")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});

describe("the Sistema tab grid", () => {
  beforeEach(() => {
    actions.getHealthProviders.mockResolvedValue({ success: true, data: null });
    actions.getHealthMetrics.mockResolvedValue({
      success: true,
      message: "",
      data: {
        timestamp: "2026-10-08T12:00:00.000Z",
        database: {
          active_connections: 6,
          max_connections: 100,
          connection_usage_percent: 6,
        },
        outbox: { pending: 0, failed: 0, oldest_pending_seconds: null },
        ai_pipeline: { pending: 0, running: 0 },
      },
    });
  });

  /** The grid cell (the Card) that holds a card title. */
  function cardTitled(container: HTMLElement, title: string): HTMLElement {
    const heading = [...container.querySelectorAll("h3, div")].find(
      (node) => node.textContent?.trim() === title && node.children.length <= 1,
    );

    expect(heading, `cartão "${title}" não renderizado`).toBeDefined();

    let cell = heading as HTMLElement;
    while (
      cell.parentElement &&
      !cell.parentElement.className.includes("grid-cols-1")
    )
      cell = cell.parentElement;

    return cell;
  }

  it("puts Tempo real e Redis right after Pool desta réplica, and the provider calls full width", async () => {
    const container = await mount(<SystemMetrics />);

    await act(async () => {
      await new Promise((done) => setTimeout(done, 30));
    });

    const pool = cardTitled(container, "Pool desta réplica");
    const realtime = cardTitled(container, "Tempo real e Redis");
    const calls = cardTitled(container, "Chamadas aos provedores");

    expect(pool.nextElementSibling).toBe(realtime);
    expect(calls.className.split(/\s+/)).toContain("col-span-full");
    // Stacked until lg: at 768px the sidebar leaves no room for two columns.
    expect(pool.parentElement!.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["lg:grid-cols-2", "xl:grid-cols-3"]),
    );
    expect(pool.parentElement!.className).not.toMatch(/\bmd:grid-cols-2\b/);
  });
});
