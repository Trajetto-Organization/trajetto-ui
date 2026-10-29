import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CARD_COMPACT_MAX_HEIGHT_RATIO,
  CARD_MAX_HEIGHT_RATIO,
  computeCardPlacement,
  computeSheetSide,
  naturalCardHeight,
  overlapArea,
  SHEET_MAX_HEIGHT_RATIO,
  type Rect,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/placement";
import { resolveTutorialKey } from "@/app/(protected)/_components/layout/protected-tutorial/engine/tutorial-key";
import {
  hasSeenTour,
  markTourSeen,
  seenStorageKey,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/seen-storage";
import {
  isPageLoading,
  selectTourSteps,
  shouldAutoStart,
  soundsEnabled,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/policy";
import { stripPermissionBlocks } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data/factories";

/**
 * The pure rules of the tour engine: where the card goes, which tour a
 * screen has, who has seen it and when it opens by itself.
 */

/** 1366x768 at Windows 125%: what the browser actually lays out. */
const NOTEBOOK = { width: 1093, height: 614 };
/** The card at its widest (max-w-md) and a typical height. */
const CARD = { width: 448, height: 360 };

const inside = (
  rect: Rect,
  viewport: { width: number; height: number },
  margin = 12,
) =>
  rect.top >= margin &&
  rect.left >= margin &&
  rect.top + rect.height <= viewport.height - margin &&
  rect.left + rect.width <= viewport.width - margin;

describe("computeCardPlacement (TUT-4)", () => {
  it("keeps the preferred side when it fits", () => {
    const target = { top: 80, left: 400, width: 200, height: 40 };
    const result = computeCardPlacement({
      target,
      card: CARD,
      viewport: NOTEBOOK,
      preferred: "bottom",
    });

    expect(result.placement).toBe("bottom");
    expect(result.top).toBe(80 + 40 + 12);
    expect(result.overlapsTarget).toBe(false);
  });

  it("flips to the opposite side when the preferred one overflows", () => {
    // A button near the bottom edge with "bottom" preferred: the old engine
    // clamped the card back up, right over the button.
    const target = { top: 540, left: 400, width: 160, height: 36 };
    const result = computeCardPlacement({
      target,
      card: CARD,
      viewport: NOTEBOOK,
      preferred: "bottom",
    });

    expect(result.placement).toBe("top");
    expect(result.top + CARD.height).toBeLessThanOrEqual(target.top);
  });

  it("does not land a 'left' card over the sidebar: it takes the right", () => {
    // The table's first column, right of a 256px sidebar.
    const target = { top: 200, left: 270, width: 120, height: 40 };
    const result = computeCardPlacement({
      target,
      card: CARD,
      viewport: NOTEBOOK,
      preferred: "left",
    });

    expect(result.placement).toBe("right");
    expect(result.left).toBeGreaterThanOrEqual(target.left + target.width);
  });

  it("never covers the target nor leaves the viewport, wherever the target is", () => {
    const failures: string[] = [];

    for (let top = 0; top <= NOTEBOOK.height - 40; top += 37) {
      for (let left = 0; left <= NOTEBOOK.width - 120; left += 53) {
        for (const preferred of ["top", "bottom", "left", "right"] as const) {
          const target = { top, left, width: 120, height: 40 };
          const result = computeCardPlacement({
            target,
            card: CARD,
            viewport: NOTEBOOK,
            preferred,
          });
          const card = { top: result.top, left: result.left, ...CARD };

          if (overlapArea(card, target) > 0)
            failures.push(`cobre ${top},${left},${preferred}`);
          if (!inside(card, NOTEBOOK))
            failures.push(`fora ${top},${left},${preferred}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("docks compact in the farthest corner when no side fits (a huge target)", () => {
    const target = { top: 20, left: 20, width: 700, height: 560 };
    const result = computeCardPlacement({
      target,
      card: CARD,
      viewport: NOTEBOOK,
      preferred: "bottom",
    });

    expect(result.placement).toBe("docked");
    expect(result.compact).toBe(true);
    // Bottom-right corner: farthest from the target's center.
    expect(result.left).toBe(NOTEBOOK.width - CARD.width - 12);
    expect(result.top).toBe(NOTEBOOK.height - CARD.height - 12);
  });

  describe("the compact clamp cannot feed back into its own choice (review: endless flicker)", () => {
    // The stats row of a list page at 1366x768 / 125%, padded, "bottom" preferred.
    const statsRow = { top: 142, left: 272, width: 806, height: 146 };
    const maxHeight = NOTEBOOK.height * CARD_MAX_HEIGHT_RATIO;
    const compactMaxHeight = NOTEBOOK.height * CARD_COMPACT_MAX_HEIGHT_RATIO;
    /** Header + footer of the card around its scrolling body. */
    const CHROME = 150;

    const place = (naturalHeight: number) =>
      computeCardPlacement({
        target: statsRow,
        card: { width: 448, height: naturalHeight },
        viewport: NOTEBOOK,
        preferred: "bottom",
        maxHeight,
        compactMaxHeight,
      });

    it("a tall card goes below the row at its compact height instead of docking over it", () => {
      const result = place(430);

      expect(result.placement).toBe("bottom");
      expect(result.compact).toBe(true);
      expect(result.overlapsTarget).toBe(false);
      expect(result.maxHeight).toBeCloseTo(compactMaxHeight);

      const rendered = {
        top: result.top,
        left: result.left,
        width: 448,
        height: Math.min(430, result.maxHeight),
      };

      expect(overlapArea(rendered, statsRow)).toBe(0);
      expect(inside(rendered, NOTEBOOK)).toBe(true);
    });

    it("is a fixed point: render the result, measure the DOM again, get the same result", () => {
      for (const natural of [200, 300, 380, 430, 520, 800]) {
        const results = [];
        let measuredNatural = natural;

        for (let frame = 0; frame < 6; frame += 1) {
          const result = place(measuredNatural);
          results.push(result);

          // What the browser lays out for that result, and what the hook measures from it.
          const box = Math.min(natural, result.maxHeight);
          const bodyClient = box - CHROME;
          const bodyScroll = natural - CHROME;

          measuredNatural = naturalCardHeight(box, bodyClient, bodyScroll);
        }

        expect(
          new Set(results.map((result) => JSON.stringify(result))).size,
          `natural=${natural}`,
        ).toBe(1);
      }
    });

    it("measures the natural height whatever the clamp", () => {
      expect(naturalCardHeight(276, 126, 280)).toBe(430);
      expect(naturalCardHeight(430, 280, 280)).toBe(430);
      // Content shorter than the body: the box is the natural height.
      expect(naturalCardHeight(240, 90, 60)).toBe(240);
    });
  });

  it("centers a step without target", () => {
    const result = computeCardPlacement({
      target: null,
      card: CARD,
      viewport: NOTEBOOK,
    });

    expect(result.placement).toBe("center");
    expect(result.left).toBeCloseTo((NOTEBOOK.width - CARD.width) / 2);
  });
});

describe("computeSheetSide (phone)", () => {
  it("keeps the sheet at the bottom when the target is above it", () => {
    expect(
      computeSheetSide({ top: 100, left: 0, width: 300, height: 40 }, 844, 380),
    ).toBe("bottom");
  });

  it("moves the sheet to the top when the target sits under it", () => {
    expect(
      computeSheetSide({ top: 700, left: 0, width: 300, height: 40 }, 844, 380),
    ).toBe("top");
  });

  // Review (round 3): a long step's natural height (600) is above the 45dvh
  // clamp the sheet is drawn with (~380 at 844). Judged with 600, neither side
  // looked clean and the sheet fell back to the bottom, over the target.
  it("judges the side with the clamped sheet height, not the natural one", () => {
    const target: Rect = { top: 500, left: 0, width: 300, height: 40 };
    const clamp = 844 * 0.45;
    const side = computeSheetSide(target, 844, 600, clamp);
    const drawn = Math.min(600, clamp);

    expect(side).toBe("top");
    // The sheet as drawn on that side does not cover the target.
    expect(
      overlapArea(target, { top: 0, left: 0, width: 390, height: drawn }),
    ).toBe(0);
  });

  it("keeps the ratio in step with the sheet's CSS clamp", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../../src/app/(protected)/_components/layout/protected-tutorial/tutorial-component/index.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      `max-h-[${Math.round(SHEET_MAX_HEIGHT_RATIO * 100)}dvh]`,
    );
  });
});

describe("resolveTutorialKey (TUT-5)", () => {
  it("reads the Entregas tab from the URL, not from the DOM", () => {
    expect(resolveTutorialKey({ pathname: "/dashboard/deliveries" })).toBe(
      "/dashboard/deliveries",
    );
    expect(
      resolveTutorialKey({
        pathname: "/dashboard/deliveries",
        urlTab: "shippers",
      }),
    ).toBe("/dashboard/deliveries/shippers");
    expect(
      resolveTutorialKey({
        pathname: "/admin/deliveries",
        urlTab: "message-templates",
      }),
    ).toBe("/admin/deliveries/message-templates");
  });

  it("reads the Torre's view from the URL, the default view on the base key", () => {
    // Meeting of 14/10/2026: Rotas is the default, every other view its own tour.
    expect(resolveTutorialKey({ pathname: "/dashboard/control-tower" })).toBe(
      "/dashboard/control-tower",
    );
    expect(
      resolveTutorialKey({
        pathname: "/admin/control-tower",
        urlView: "tickets",
      }),
    ).toBe("/admin/control-tower/tickets");
    expect(
      resolveTutorialKey({
        pathname: "/dashboard/control-tower",
        urlView: "occurrences",
        allowedTowerViews: ["routes", "panel"],
      }),
    ).toBe("/dashboard/control-tower");
  });

  it("falls back like the page when the tab is unknown or forbidden", () => {
    expect(
      resolveTutorialKey({ pathname: "/dashboard/deliveries", urlTab: "nope" }),
    ).toBe("/dashboard/deliveries");
    expect(
      resolveTutorialKey({
        pathname: "/dashboard/deliveries",
        urlTab: "deliveries",
        allowedDeliveryTabs: ["shippers", "occurrence-types"],
      }),
    ).toBe("/dashboard/deliveries/shippers");
  });

  it("gives every Integrações tab its own tour", () => {
    expect(resolveTutorialKey({ pathname: "/dashboard/integrations" })).toBe(
      "/dashboard/integrations/api-keys",
    );
    expect(
      resolveTutorialKey({
        pathname: "/dashboard/integrations",
        urlTab: "monitor",
      }),
    ).toBe("/dashboard/integrations/monitor");
  });

  it("follows the dashboard's client tab", () => {
    expect(
      resolveTutorialKey({ pathname: "/dashboard", dashboardTab: "charts" }),
    ).toBe("/dashboard/charts");
    expect(
      resolveTutorialKey({ pathname: "/admin", dashboardTab: "system" }),
    ).toBe("/admin/system");
    expect(
      resolveTutorialKey({ pathname: "/dashboard", dashboardTab: "overview" }),
    ).toBe("/dashboard");
  });

  it("shares one tour across records of a detail page", () => {
    expect(resolveTutorialKey({ pathname: "/dashboard/routes/abc-123/" })).toBe(
      "/dashboard/routes/:routeId",
    );
    expect(resolveTutorialKey({ pathname: "/driver/vehicles/v1/fuels" })).toBe(
      "/driver/vehicles/:vehicleId/fuels",
    );
  });
});

describe("seen per user, version v2 (TUT-12, decision 9.2)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("keys the flag by version, user and tour, keeping the tutorial_ prefix", () => {
    expect(seenStorageKey("u1", "/dashboard")).toBe(
      "tutorial_v2:u1:/dashboard",
    );
  });

  it("is personal: another user on the same browser still gets the tour", () => {
    markTourSeen("u1", "/dashboard/vehicle");

    expect(hasSeenTour("u1", "/dashboard/vehicle")).toBe(true);
    expect(hasSeenTour("u2", "/dashboard/vehicle")).toBe(false);
  });

  it("ignores the pre-v2 flag, so the fixed tours show once more", () => {
    window.localStorage.setItem("tutorial_/dashboard/vehicle", "true");

    expect(hasSeenTour("u1", "/dashboard/vehicle")).toBe(false);
  });

  it("survives a storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => markTourSeen("u1", "/dashboard")).not.toThrow();
    // Unreadable = do not reopen on every visit.
    expect(hasSeenTour("u1", "/dashboard")).toBe(true);
  });
});

describe("when a tour opens by itself (decisions 9.2 and 9.3)", () => {
  it("desk: every company screen on the first visit, never the back office", () => {
    expect(shouldAutoStart("/dashboard/vehicle", false)).toBe(true);
    expect(shouldAutoStart("/driver/vehicles", false)).toBe(true);
    expect(shouldAutoStart("/admin/vehicle", false)).toBe(false);
    expect(shouldAutoStart("/admin", false)).toBe(false);
  });

  it("phone: only the global tour of /dashboard", () => {
    expect(shouldAutoStart("/dashboard", true)).toBe(true);
    expect(shouldAutoStart("/dashboard/vehicle", true)).toBe(false);
    expect(shouldAutoStart("/dashboard/charts", true)).toBe(false);
  });

  it("sounds stay off on phones and with reduced motion", () => {
    expect(soundsEnabled(false, false)).toBe(true);
    expect(soundsEnabled(true, false)).toBe(false);
    expect(soundsEnabled(false, true)).toBe(false);
  });
});

describe("selectTourSteps (TUT-10: the page decides, not a copy of the rules)", () => {
  it("drops steps of pages the session cannot open, through canAccessPath's verdict", () => {
    const steps = [
      { title: "a", content: "", placement: "center" as const },
      {
        title: "b",
        content: "",
        anchor: "x",
        requiresPath: "/dashboard/deliveries",
      },
    ];

    expect(
      selectTourSteps(steps, { canOpen: () => false }).map(
        (step) => step.title,
      ),
    ).toEqual(["a"]);
    expect(
      selectTourSteps(steps, {
        canOpen: () => true,
        root: fakeRoot(["x"]),
      }).map((step) => step.title),
    ).toEqual(["a", "b"]);
  });

  it("drops optional steps whose anchor is not rendered, keeps required ones", () => {
    const steps = [
      { title: "optional", content: "", anchor: "absent", optional: true },
      { title: "required", content: "", anchor: "absent" },
      { title: "present", content: "", anchor: "here", optional: true },
    ];

    expect(
      selectTourSteps(steps, {
        canOpen: () => true,
        root: fakeRoot(["here"]),
      }).map((step) => step.title),
    ).toEqual(["required", "present"]);
  });
});

describe("optional steps the page cannot vouch for yet (review: first-visit tours lost steps)", () => {
  const steps = [
    { title: "stats", content: "", anchor: "data-page-stats", optional: true },
    {
      title: "account",
      content: "",
      anchor: "account",
      optional: true,
      mobile: { openSidebar: true },
    },
    { title: "required", content: "", anchor: "create-button" },
  ];
  const titles = (selected: { title: string }[]) =>
    selected.map((step) => step.title);

  it("keeps every optional step while the page is still loading (decided on the walk)", () => {
    expect(
      titles(
        selectTourSteps(steps, {
          canOpen: () => true,
          root: fakeRoot([]),
          deferOptional: true,
        }),
      ),
    ).toEqual(["stats", "account", "required"]);
  });

  it("keeps a phone step that opens the drawer: its anchor lives in the closed drawer", () => {
    expect(
      titles(
        selectTourSteps(steps, {
          canOpen: () => true,
          root: fakeRoot([]),
          isMobile: true,
        }),
      ),
    ).toEqual(["account", "required"]);
    expect(
      titles(
        selectTourSteps(steps, {
          canOpen: () => true,
          root: fakeRoot([]),
          isMobile: false,
        }),
      ),
    ).toEqual(["required"]);
  });

  it("still drops steps of pages the session cannot open, loading or not", () => {
    const gated = [
      {
        title: "gated",
        content: "",
        anchor: "x",
        optional: true,
        requiresPath: "/dashboard/deliveries",
      },
    ];

    expect(
      selectTourSteps(gated, { canOpen: () => false, deferOptional: true }),
    ).toEqual([]);
  });

  it("tells a page still showing its skeleton from a settled one", () => {
    expect(isPageLoading(fakeRoot(["create-button"]))).toBe(false);
    expect(isPageLoading(fakeRoot(["loading"]))).toBe(true);

    const busy = document.createElement("div");
    busy.innerHTML = '<div aria-busy="true"></div>';

    expect(isPageLoading(busy)).toBe(true);
  });
});

describe("the back office drops permission talk", () => {
  it("removes the PERMISSÕES block and the 'ask your admin' line", () => {
    const content = `Cria uma filial.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      • LEITURA em Gerenciar Veículos
      IMPORTANTE: Caso não possua esta permissão, solicite ao administrador.
      • Um item comum continua`;

    const stripped = stripPermissionBlocks(content);

    expect(stripped).not.toMatch(/PERMISSÕES|Gerenciar Filiais|administrador/);
    expect(stripped).toMatch(/Cria uma filial/);
    expect(stripped).toMatch(/Um item comum continua/);
  });
});

/** A DOM root holding one visible element per anchor. */
function fakeRoot(anchors: string[]): ParentNode {
  const root = document.createElement("div");

  for (const anchor of anchors) {
    const element = document.createElement("div");

    element.setAttribute("data-tutorial", anchor);
    element.getBoundingClientRect = () =>
      ({
        top: 10,
        left: 10,
        width: 50,
        height: 20,
        right: 60,
        bottom: 30,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect;
    root.appendChild(element);
  }

  document.body.appendChild(root);

  return root;
}

describe("how long a step waits for its anchor", () => {
  it("a step that opens the phone drawer waits like a loading page", async () => {
    // Red before: every step waited 1.5 s, and "Menu de Navegação" on a phone
    // (the step that opens the drawer itself) fell back to the center while
    // the drawer was still mounting (tests/ui/tutorial-tours.spec.ts, three
    // workers).
    const { targetWaitMs } =
      await import("@/app/(protected)/_components/layout/protected-tutorial/tutorial-component/hooks");

    expect(targetWaitMs({ opensDrawer: true })).toBe(6000);
    expect(targetWaitMs({ opensDrawer: false })).toBe(1500);
  });
});
