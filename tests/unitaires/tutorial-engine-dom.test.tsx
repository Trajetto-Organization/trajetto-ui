import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Walking a tour waits for each step to resolve and swap in (a step whose
// anchor is missing waits 1.5 s for it), so a walk outlasts the default 5 s.
vi.setConfig({ testTimeout: 30_000 });

const nav = vi.hoisted(() => ({
  pathname: "/dashboard/branch",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => undefined }));

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TutorialProvider } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider";
import TutorialComponent from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-component";
import { KanbanBoardSkeleton } from "@/app/(protected)/_components/kanban/board-skeleton";

/**
 * The engine in a DOM: what it does to the page and which tour it opens.
 *
 * happy-dom does no layout, so every element reports the same non-empty box;
 * what is under test is the engine's behaviour around the target, not
 * pixels (the browser suite tests/ui/tutorial-tours.spec.ts measures those).
 */

let host: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  HTMLElement.prototype.getBoundingClientRect = function box() {
    return {
      top: 120,
      left: 300,
      width: 160,
      height: 40,
      right: 460,
      bottom: 160,
      x: 300,
      y: 120,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

beforeEach(() => {
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(
  condition: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const started = Date.now();

  while (!condition()) {
    if (Date.now() - started > timeoutMs)
      throw new Error("condição não atingida a tempo");

    await act(async () => {
      await wait(25);
    });
  }
}

const dialog = () =>
  document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
const titleText = () =>
  document.getElementById("tutorial-step-title")?.textContent ?? "";

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

/**
 * Arrow-right until the step with this title is on screen. The card keeps
 * the previous step's copy until the next one has resolved and swapped in
 * (engine/transition.ts), so each press waits for the card to settle.
 */
async function goTo(title: RegExp): Promise<void> {
  for (
    let attempt = 0;
    attempt < 20 && !title.test(titleText());
    attempt += 1
  ) {
    await act(async () => {
      press("ArrowRight");
      await wait(30);
    });
    await until(
      () =>
        dialog() === null ||
        dialog()?.getAttribute("data-target-status") !== "pending",
    );
  }

  expect(titleText()).toMatch(title);
}

async function mount(page: React.ReactNode): Promise<void> {
  await act(async () => {
    root.render(
      <SidebarProvider>
        <TutorialProvider
          user={{ id: "u1", role: "BUSINESS_ADMIN", permissions: [] }}
        >
          <TutorialComponent />
          <main>{page}</main>
        </TutorialProvider>
      </SidebarProvider>,
    );
  });
}

describe("the tour leaves the page as it found it (TUT-9)", () => {
  it("never writes on the target: its own inline style survives the tour", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button
        type="button"
        data-tutorial="create-button"
        style={{ touchAction: "pan-y", color: "red" }}
      >
        Nova Filial
      </button>,
    );

    const button = document.querySelector(
      '[data-tutorial="create-button"]',
    ) as HTMLElement;
    const original = button.getAttribute("style");

    // Opens by itself on the first visit.
    await until(() => dialog() !== null);
    await goTo(/Criar Nova Filial/);

    // Let the step resolve and measure.
    await act(async () => {
      await wait(400);
    });

    await act(async () => {
      press("Escape");
      await wait(30);
    });

    expect(dialog()).toBeNull();
    expect(button.getAttribute("style")).toBe(original);
    expect(button.className).not.toMatch(/tutorial/);
  });
});

describe("a step whose anchor is not on screen (TUT-2)", () => {
  it("is shown centered, without a spotlight, and says so", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    // The page has a create button but no refresh button: the required
    // "Atualizar" step has nothing to point at.
    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);
    await goTo(/^Atualizar/);

    await until(
      () => dialog()?.getAttribute("data-target-status") === "missing",
    );

    expect(dialog()?.getAttribute("data-placement")).toBe("center");
    expect(document.querySelector("[data-tutorial-spotlight]")).toBeNull();
  });
});

describe("the empty table is explained, not pointed at (TUT-8)", () => {
  it("lands on the empty-table variant when there is no row menu", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <table>
        <tbody>
          <tr>
            <td data-tutorial="table-empty">Nenhum resultado encontrado</td>
          </tr>
        </tbody>
      </table>,
    );

    await until(() => dialog() !== null);
    await goTo(/Ações/);

    await until(
      () => dialog()?.getAttribute("data-step-anchor") === "table-empty",
    );

    expect(dialog()?.textContent).toMatch(/ainda não tem registros/);
  });
});

describe("the tab in the URL picks the tour (TUT-5)", () => {
  it("opens the Embarcadores tour on ?tab=shippers", async () => {
    nav.pathname = "/dashboard/deliveries";
    nav.search = "tab=shippers";

    // The strip as SegmentedNav renders it: links with aria-current.
    await mount(
      <nav>
        <a href="?tab=deliveries" data-tutorial="deliveries-tab-deliveries">
          Entregas
        </a>
        <a
          href="?tab=shippers"
          aria-current="page"
          data-tutorial="deliveries-tab-shippers"
        >
          Embarcadores
        </a>
      </nav>,
    );

    await until(() => dialog() !== null);
    await goTo(/Embarcadores/);

    expect(titleText()).toMatch(/^Embarcadores/);
  });
});

/** Stands in for a page whose Suspense fallback shows until the server answers. */
function StreamedPage({
  delayMs,
  children,
}: {
  delayMs: number;
  children: React.ReactNode;
}): JSX.Element {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return ready ? (
    <>{children}</>
  ) : (
    <div data-tutorial="loading">carregando</div>
  );
}

const status = () => dialog()?.getAttribute("data-target-status");
const stepCount = () =>
  Number(/de (\d+)/.exec(dialog()?.textContent ?? "")?.[1] ?? "0");

describe("first visit over a slow page keeps its optional steps (review: TUT-2/TUT-7/TUT-10)", () => {
  it("opens after the skeleton is gone, so the filters step is still in the tour", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    // The server answers well after the 600ms auto-start delay.
    await mount(
      <StreamedPage delayMs={1200}>
        <button type="button" data-tutorial="create-button">
          Nova Filial
        </button>
        <div data-tutorial="branch-filters">filtros</div>
      </StreamedPage>,
    );

    await until(() => dialog() !== null);

    // Not opened over the placeholder.
    expect(document.querySelector('[data-tutorial="loading"]')).toBeNull();

    await goTo(/Filtros/);
  });

  it("opened by hand during loading, an optional step that never renders leaves the walk and the counter", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <StreamedPage delayMs={900}>
        <button type="button" data-tutorial="create-button">
          Nova Filial
        </button>
      </StreamedPage>,
    );

    // "?" before the auto-start: the page is still a skeleton.
    await act(async () => {
      press("?");
      await wait(30);
    });

    await until(() => dialog() !== null);

    const initialCount = stepCount();
    const seen: string[] = [];

    for (let guard = 0; guard < 25 && dialog(); guard += 1) {
      await until(() => !dialog() || status() !== "pending", 10000);

      if (!dialog()) break;

      seen.push(titleText());

      await act(async () => {
        press("ArrowRight");
        await wait(30);
      });
    }

    // The filters step was kept while loading, then dropped when reached.
    expect(seen.some((title) => /Filtros/.test(title))).toBe(false);
    expect(seen.length).toBeLessThan(initialCount);
  }, 30000);
});

describe("the alert balloon is explained even when no alert is pending (review: TUT-14)", () => {
  it("shows its step centered instead of dropping it", async () => {
    nav.pathname = "/dashboard/deliveries";
    nav.search = "tab=chat";

    await mount(
      <nav>
        <a
          href="?tab=chat"
          aria-current="page"
          data-tutorial="deliveries-tab-chat"
        >
          Atendimentos
        </a>
        <div data-tutorial="chat-threads">lista</div>
      </nav>,
    );

    await until(() => dialog() !== null);
    await goTo(/Balão de Alertas/);
    await until(() => status() === "centered", 8000);

    expect(document.querySelector("[data-tutorial-spotlight]")).toBeNull();
  }, 20000);
});

/** The Kanban board: it fetches on the client and shows its own skeleton meanwhile. */
function ClientBoard({ delayMs }: { delayMs: number }): JSX.Element {
  const [columns, setColumns] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setColumns(["A fazer"]), delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <>
      <input data-tutorial="kanban-search" />
      <button type="button" data-tutorial="revalidate">
        Atualizar
      </button>
      {columns ? (
        <>
          <button type="button" data-tutorial="kanban-add-column">
            Adicionar Coluna
          </button>
          <div data-tutorial="kanban-board">
            {columns.map((column) => (
              <section key={column}>
                <button type="button" data-tutorial="kanban-column-menu">
                  menu
                </button>
                <button type="button" data-tutorial="kanban-add-card">
                  Adicionar card
                </button>
              </section>
            ))}
          </div>
        </>
      ) : (
        <KanbanBoardSkeleton />
      )}
    </>
  );
}

describe("first visit to the Kanban keeps the board's steps (review round 3: TUT-2/TUT-7/TUT-10)", () => {
  it("waits for the board skeleton, so 'Adicionar Coluna' is still in the auto-started tour", async () => {
    nav.pathname = "/dashboard/kanban";
    nav.search = "";

    // Columns arrive well after the 600ms auto-start delay.
    await mount(<ClientBoard delayMs={1200} />);

    await until(() => dialog() !== null);
    await goTo(/Adicionar Coluna/);
    await goTo(/Adicionar Card/);
  }, 20000);
});

describe("the card stays reachable when the tour opens the phone drawer (web-e2e)", () => {
  it("is not hidden from assistive technology by the drawer's modal", async () => {
    // Found by tests/ui/tutorial-tours.spec.ts at 390x844: on the "Menu de
    // Navegação" step the tour opens the sidebar drawer, a modal Radix dialog,
    // which marks everything outside itself aria-hidden (`hideOthers`, the
    // same call made here). The card was drawn on screen but gone from the
    // accessibility tree: a screen reader could not reach "Próximo".
    const { hideOthers } = await import("aria-hidden");

    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);

    const drawer = document.createElement("div");
    document.body.appendChild(drawer);

    const undo = hideOthers(drawer);

    try {
      const card = dialog() as HTMLElement;

      expect(card.closest('[aria-hidden="true"]')).toBeNull();

      const next = Array.from(card.querySelectorAll("button")).find((button) =>
        /Próximo|Concluir/.test(button.textContent ?? ""),
      );

      expect(next, "o botão de avançar sumiu do cartão").toBeDefined();
      expect(next!.closest('[aria-hidden="true"]')).toBeNull();
    } finally {
      undo();
      drawer.remove();
    }
  });
});

describe("'Pular tutorial' is a target a finger can hit (web-e2e)", () => {
  it("keeps the 24px minimum height of WCAG 2.5.8", async () => {
    // Found by tests/a11y/accessibility.spec.ts at 390px: a bare text-xs
    // button, 68x16. happy-dom has no layout, so the rule is read from the
    // class that sets it (the browser suite measures the pixels).
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);

    const skip = Array.from(dialog()!.querySelectorAll("button")).find(
      (button) => (button.textContent ?? "").includes("Pular tutorial"),
    );

    expect(
      skip,
      "o botão Pular tutorial não está no primeiro passo",
    ).toBeDefined();
    expect(skip!.className).toMatch(/(^|\s)min-h-6(\s|$)/);
  });
});

/** The spotlight's left edge as drawn: its translate3d x, or its `left`. */
const drawnLeft = (element: Element | null) => {
  const style = (element as HTMLElement | null)?.style;
  const translated = /translate3d\((-?[\d.]+)px/.exec(
    style?.transform ?? "",
  )?.[1];

  return Number(translated ?? Number.parseFloat(style?.left ?? ""));
};

describe("the card and spotlight follow a target that moves without resizing (owner: sidebar collapse)", () => {
  it("re-places the spotlight when a transition elsewhere moves the target", async () => {
    // /admin "Abas do Painel" and /notifications "Todas ou Não Lidas": the
    // sidebar animates its width, the target slides sideways at the same
    // size. Nothing the old engine listened to fired, so the card stayed.
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <>
        <aside data-testid="sidebar">menu</aside>
        <button type="button" data-tutorial="create-button">
          Nova Filial
        </button>
      </>,
    );

    const target = document.querySelector(
      '[data-tutorial="create-button"]',
    ) as HTMLElement;
    let left = 300;

    target.getBoundingClientRect = () =>
      ({
        top: 120,
        left,
        width: 160,
        height: 40,
        right: left + 160,
        bottom: 160,
        x: left,
        y: 120,
        toJSON: () => ({}),
      }) as DOMRect;

    await until(() => dialog() !== null);
    await goTo(/Criar Nova Filial/);
    await until(
      () =>
        status() === "found" &&
        document.querySelector("[data-tutorial-spotlight]") !== null,
    );
    // The entrance morph of the spotlight ends.
    await act(async () => {
      await wait(400);
    });

    const spotlight = () => document.querySelector("[data-tutorial-spotlight]");
    const before = drawnLeft(spotlight());

    expect(Number.isFinite(before)).toBe(true);

    // The sidebar collapses: the target moves 180px left, its size unchanged.
    left = 120;
    document
      .querySelector('[data-testid="sidebar"]')!
      .dispatchEvent(new Event("transitionrun", { bubbles: true }));

    await act(async () => {
      await wait(120);
    });

    expect(drawnLeft(spotlight()) - before).toBeCloseTo(-180, 0);
  });
});

describe("Próximo never shows a step's copy in the wrong place (owner: flash between steps)", () => {
  it("keeps the previous copy, faded, until the next step is resolved and placed", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);
    // The next step points at the button: it resolves over a few frames.
    await goTo(/Central de Filiais/);

    const first = titleText();
    const content = () =>
      document.querySelector<HTMLElement>("[data-tutorial-content]");

    await act(async () => {
      press("ArrowRight");
    });

    // The old engine swapped the title on the spot, at the old position.
    expect(titleText()).toBe(first);
    expect(status()).toBe("pending");
    expect(content()?.style.opacity).toBe("0");

    await until(() => status() !== "pending");

    expect(titleText()).not.toBe(first);

    await until(() => content()?.style.opacity === "1");
  });
});

describe("the step buttons' arrows move like the site's (owner)", () => {
  it("slides Próximo's arrow right and Anterior's left on hover and keyboard focus", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);
    await goTo(/Central de Filiais/);

    const buttons = Array.from(dialog()!.querySelectorAll("button"));
    const next = buttons.find((button) =>
      /Próximo/.test(button.textContent ?? ""),
    )!;
    const prev = buttons.find((button) =>
      /Anterior/.test(button.textContent ?? ""),
    )!;

    for (const button of [next, prev]) {
      expect(button.className).toMatch(/(^|\s)group\/arrow(\s|$)/);
    }

    const nextArrow = next.querySelector("svg")!.getAttribute("class") ?? "";
    const prevArrow = prev.querySelector("svg")!.getAttribute("class") ?? "";

    expect(nextArrow).toMatch(/group-hover\/arrow:translate-x-1/);
    expect(nextArrow).toMatch(/group-focus-visible\/arrow:translate-x-1/);
    expect(prevArrow).toMatch(/group-hover\/arrow:-translate-x-1/);
    expect(prevArrow).toMatch(/group-focus-visible\/arrow:-translate-x-1/);
    // Still for someone who asked for less motion.
    expect(nextArrow).toMatch(/motion-reduce:!translate-x-0/);
    expect(prevArrow).toMatch(/motion-reduce:!translate-x-0/);
  });
});

describe("reduced motion moves the card in one frame (review: new copy at the old spot)", () => {
  it("gives card, glow and spotlight hole no CSS transition of their own", async () => {
    // globals.css sets `transition-duration: 0.01ms !important` on every
    // element under reduced motion; with the default `transition-property:
    // all`, each transform the stage wrote became a late-starting CSS
    // transition and the new copy painted at the old spot for ~3 frames.
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    await until(() => dialog() !== null);

    const noTransition = /(^|\s)transition-none(\s|$)/;
    const card = document.querySelector("[data-tutorial-card]");
    const glow = document.querySelector("[data-tutorial-glow]");
    const hole = document.querySelector(
      'mask#spotlight-mask rect[fill="black"]',
    );

    expect(card?.getAttribute("class")).toMatch(noTransition);
    expect(glow?.getAttribute("class")).toMatch(noTransition);
    expect(hole?.getAttribute("class") ?? "").toMatch(noTransition);
    // The copy keeps its own opacity fade.
    expect(
      document.querySelector("[data-tutorial-content]")?.getAttribute("class"),
    ).toMatch(/transition-opacity/);
  });
});

describe("the card holds still while the old copy leaves (review: card wandering during scroll)", () => {
  it("keeps the card still (the spotlight stays on the old content) while the next target is looked up and scrolled to", async () => {
    nav.pathname = "/dashboard/branch";
    nav.search = "";

    // The next step's anchor (table-search) is not there yet: the card stays
    // in its leaving phase until it appears.
    await mount(
      <button type="button" data-tutorial="create-button">
        Nova Filial
      </button>,
    );

    const target = document.querySelector(
      '[data-tutorial="create-button"]',
    ) as HTMLElement;
    let top = 120;

    target.getBoundingClientRect = () =>
      ({
        top,
        left: 300,
        width: 160,
        height: 40,
        right: 460,
        bottom: top + 40,
        x: 300,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;

    await until(() => dialog() !== null);
    await goTo(/Criar Nova Filial/);
    await until(
      () =>
        status() === "found" &&
        document.querySelector("[data-tutorial-spotlight]") !== null,
    );
    await act(async () => {
      await wait(400);
    });

    const card = document.querySelector<HTMLElement>("[data-tutorial-card]")!;
    const hole = document.querySelector<SVGRectElement>(
      'mask#spotlight-mask rect[fill="black"]',
    )!;
    const cardBefore = card.style.transform;
    const holeBefore = hole.getAttribute("y");

    await act(async () => {
      press("ArrowRight");
      await wait(30);
    });

    expect(dialog()?.getAttribute("data-phase")).toBe("leaving");

    // The page scrolls toward the next target: the old one slides up and away.
    for (const next of [60, -20, -140]) {
      top = next;
      await act(async () => {
        window.dispatchEvent(new Event("scroll"));
        document.body.dispatchEvent(
          new Event("transitionrun", { bubbles: true }),
        );
        await wait(40);
      });
    }

    expect(dialog()?.getAttribute("data-phase")).toBe("leaving");
    // The empty card did not chase the old target...
    expect(card.style.transform).toBe(cardBefore);
    // ...while the spotlight stayed on its content as the page scrolled.
    expect(hole.getAttribute("y")).not.toBe(holeBefore);

    // The next anchor shows up: the step resolves and the card moves on.
    const search = document.createElement("input");

    search.setAttribute("data-tutorial", "table-search");
    document.querySelector("main")!.appendChild(search);

    await until(() => status() !== "pending");

    expect(titleText()).toMatch(/Busca Inteligente/);
    search.remove();
  });
});
