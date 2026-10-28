import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { tutorialConfigs } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data";
import {
  ANCHOR_PATTERN,
  stepAnchors,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/anchors";
import { resolveTutorialKey } from "@/app/(protected)/_components/layout/protected-tutorial/engine/tutorial-key";
import { DELIVERY_TABS } from "@/features/deliveries/lib/tabs";
import { INTEGRATION_TABS } from "@/features/integrations/lib/tabs";
import { TOWER_VIEWS } from "@/features/control-tower/lib/views";

import type { TutorialStep } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/tutorial-provider.types";

/**
 * Every step of every tour points at a `data-tutorial` anchor that exists in
 * the source of the page it belongs to (decision 9.1).
 *
 * Commit 15ce80b removed `role="table"` from the DataTable for a good
 * accessibility reason, and 40 steps that pointed at `[role=table]` and
 * `th:last-child` silently lost their target in 21 tours ("12 de 13 Resumo de
 * Atividades"). Nothing failed. This file is what would have failed: steps
 * may only name anchors, and each anchor is looked up in the files the page
 * actually imports.
 */

const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const PROTECTED = resolve(SRC, "app/(protected)");

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Shell components present on every protected page (layout, sidebar, balloon). */
const SHELL_FILES = [
  "app/(protected)/_components/layout/protected-default-layout/index.tsx",
  "app/(protected)/_components/layout/protected-driver-layout/index.tsx",
  "app/(protected)/_components/layout/protected-tutorial/tutorial-button/index.tsx",
  "app/(protected)/_components/layout/protected-account-settings/index.tsx",
  "app/(protected)/_components/layout/protected-search-input/index.tsx",
  "features/deliveries/ops-alert/ops-alert-balloon.tsx",
].map((file) => resolve(SRC, file));

/** The tour's own files name anchors as data, not as attributes. */
const TOUR_SOURCES = /protected-tutorial[\\/](tutorial-provider|engine)[\\/]/;

const toPosix = (path: string): string => path.split("\\").join("/");

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = resolve(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  for (const extension of EXTENSIONS) {
    const candidate = base + extension;

    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      /\.tsx?$/.test(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

const IMPORT =
  /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

/** Every source file a page reaches through its imports, not crossing `stop`. */
function importGraph(
  entry: string,
  stop: ReadonlySet<string> = new Set(),
): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];

  while (stack.length > 0) {
    const file = stack.pop() as string;

    if (seen.has(file) || stop.has(file)) continue;
    seen.add(file);

    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const target = resolveImport(file, match[1] ?? match[2] ?? match[3]);

      if (target) stack.push(target);
    }
  }

  return seen;
}

interface Anchors {
  exact: Set<string>;
  /** `deliveries-tab-${value}` → "deliveries-tab-". */
  prefixes: Set<string>;
}

/**
 * The anchors a set of files renders: `data-tutorial="x"`, `dataTutorial="x"`
 * (props forwarded to the attribute), every literal inside
 * `data-tutorial={cond ? "x" : undefined}`, and template prefixes.
 */
function anchorsIn(files: Iterable<string>): Anchors {
  const exact = new Set<string>();
  const prefixes = new Set<string>();

  for (const file of files) {
    if (TOUR_SOURCES.test(file)) continue;

    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(
      /(?:data-tutorial|dataTutorial)\s*[=:]\s*(["'])([^"']+)\1/g,
    )) {
      exact.add(match[2]);
    }

    for (const match of source.matchAll(
      /(?:data-tutorial|dataTutorial)\s*=\s*\{([^{}]*)\}/g,
    )) {
      for (const literal of match[1].matchAll(/["']([a-z0-9-]+)["']/g))
        exact.add(literal[1]);
      for (const template of match[1].matchAll(/`([a-z0-9-]+)\$\{/g))
        prefixes.add(template[1]);
    }

    for (const template of source.matchAll(
      /(?:data-tutorial|dataTutorial)\s*[=:]\s*\{?\s*`([a-z0-9-]+)\$\{/g,
    )) {
      prefixes.add(template[1]);
    }
  }

  return { exact, prefixes };
}

function hasAnchor(anchors: Anchors, anchor: string): boolean {
  if (anchors.exact.has(anchor)) return true;

  return [...anchors.prefixes].some((prefix) => anchor.startsWith(prefix));
}

/**
 * The page file a tour key belongs to: its route, or the closest parent
 * route for keys that are a tab of a page ("/dashboard/charts",
 * "/dashboard/deliveries/occurrences", "/dashboard/integrations/usage").
 */
function pageFileOf(key: string): string | null {
  const segments = key
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith(":") ? `[${segment.slice(1)}]` : segment,
    );

  while (segments.length > 0) {
    const candidate = join(PROTECTED, ...segments, "page.tsx");

    if (existsSync(candidate)) return candidate;

    segments.pop();
  }

  return null;
}

const SHELL = anchorsIn(SHELL_FILES);

/**
 * Entregas is one page.tsx with six tabs, and one of them renders a panel of
 * its own instead of the shared table; the Torre is one page.tsx with five
 * views, each a different body (meeting of 14/10/2026). Judging a tab or a
 * view by the union of the whole page let any of them vouch for the others;
 * each is judged by the shared frame plus its own body.
 */
const DELIVERIES_CONTENT = resolve(
  SRC,
  "features/deliveries/content/index.tsx",
);

const panelFile = (specifier: string): string => {
  const file = resolveImport(DELIVERIES_CONTENT, specifier);

  if (!file) throw new Error(`painel de Entregas não encontrado: ${specifier}`);

  return file;
};

const DELIVERY_PANELS: Record<string, string> = {
  "message-templates": panelFile("../message-templates/panel"),
};

const DELIVERIES_TABLE = panelFile("../table");

const DELIVERIES_KEY = /^\/(?:dashboard|admin)\/deliveries(?:\/([a-z-]+))?$/;

/** The body each view of the Torre renders (features/control-tower/views). */
const TOWER_VIEW_BODIES: Record<string, string> = {
  routes: panelFile("../monitoring"),
  panel: resolve(SRC, "features/control-tower/content/index.tsx"),
  occurrences: DELIVERIES_TABLE,
  tickets: panelFile("../chat"),
  audit: panelFile("../proof-audits/panel"),
};

const TOWER_KEY = /^\/(?:dashboard|admin)\/control-tower(?:\/([a-z-]+))?$/;

const filesCache = new Map<string, Set<string>>();

/** The source files that render the screen of a tour key. */
function tourFiles(key: string): Set<string> {
  const cached = filesCache.get(key);

  if (cached) return cached;

  const pageFile = pageFileOf(key) as string;
  const deliveries = DELIVERIES_KEY.exec(key);
  const tower = TOWER_KEY.exec(key);
  let files: Set<string>;

  if (tower) {
    const body = TOWER_VIEW_BODIES[tower[1] ?? "routes"];
    const bodies = new Set(Object.values(TOWER_VIEW_BODIES));

    files = importGraph(pageFile, bodies);

    for (const file of importGraph(body)) files.add(file);
  } else if (!deliveries) {
    files = importGraph(pageFile);
  } else {
    const panel = DELIVERY_PANELS[deliveries[1] ?? "deliveries"];
    const others = Object.values(DELIVERY_PANELS);

    files = importGraph(
      pageFile,
      new Set(panel ? [...others, DELIVERIES_TABLE] : others),
    );

    if (panel) for (const file of importGraph(panel)) files.add(file);
  }

  filesCache.set(key, files);

  return files;
}

const anchorsCache = new Map<string, Anchors>();

function tourAnchors(key: string): Anchors {
  const cached = anchorsCache.get(key);

  if (cached) return cached;

  const anchors = anchorsIn(tourFiles(key));

  anchorsCache.set(key, anchors);

  return anchors;
}

const TOURS = Object.entries(tutorialConfigs);

describe("tour steps name anchors, never selectors (decision 9.1)", () => {
  it("has tours to check", () => {
    expect(TOURS.length).toBeGreaterThan(40);
  });

  it.each(TOURS)(
    "%s: every step is an anchor or a centered step",
    (_key, steps) => {
      const offenders = steps.filter((step: TutorialStep) => {
        // The pre-9.1 shape (`target: "[role='table']"`) is exactly what broke.
        if ("target" in step) return true;
        if (step.anchor || step.variants?.length) return false;

        return step.placement !== "center";
      });

      expect(offenders.map((step) => step.title)).toEqual([]);
    },
  );

  it.each(TOURS)(
    "%s: anchors are plain data-tutorial values",
    (_key, steps) => {
      const invalid = steps
        .flatMap((step) => stepAnchors(step))
        .filter((anchor) => !ANCHOR_PATTERN.test(anchor));

      expect(invalid).toEqual([]);
    },
  );
});

describe("every anchor exists in the source of its page", () => {
  it.each(TOURS)("%s", (key, steps) => {
    const pageFile = pageFileOf(key);

    expect(pageFile, `nenhuma página para o tour ${key}`).not.toBeNull();

    const anchors = tourAnchors(key);

    const missing = steps
      .flatMap((step) => stepAnchors(step))
      .filter(
        (anchor) => !hasAnchor(anchors, anchor) && !hasAnchor(SHELL, anchor),
      );

    expect(
      missing,
      `${key} → ${toPosix(relative(ROOT, pageFile as string))}`,
    ).toEqual([]);
  });
});

describe("every screen has a tour (decision 9.2)", () => {
  /** Not screens: catch-alls and the error-boundary probe of the E2E suite. */
  const EXEMPT = new Set(["/dashboard/boundary-probe"]);

  function routesUnder(dir: string, prefix: string): string[] {
    const routes: string[] = [];

    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (entry.startsWith("[...")) continue;

        const segment = entry.startsWith("[")
          ? `x-${entry.slice(1, -1)}`
          : entry;

        routes.push(...routesUnder(full, `${prefix}/${segment}`));
      } else if (entry === "page.tsx") {
        routes.push(prefix);
      }
    }

    return routes;
  }

  const SCREENS = [
    "dashboard",
    "admin",
    "driver",
    "profile",
    "notifications",
  ].flatMap((root) => routesUnder(join(PROTECTED, root), `/${root}`));

  it("finds the screens", () => {
    expect(SCREENS).toContain("/dashboard/vehicle");
    expect(SCREENS).toContain("/admin/routes/x-routeId");
  });

  it.each(SCREENS.filter((route) => !EXEMPT.has(route)))("%s", (route) => {
    const key = resolveTutorialKey({ pathname: route });

    expect(
      tutorialConfigs[key],
      `sem tour para ${route} (chave ${key})`,
    ).toBeDefined();
  });

  it.each(["/dashboard", "/admin"])(
    "%s/deliveries has a tour per tab",
    (section) => {
      const missing = DELIVERY_TABS.map((tab) =>
        resolveTutorialKey({
          pathname: `${section}/deliveries`,
          urlTab: tab.value,
        }),
      ).filter((key) => !tutorialConfigs[key]);

      expect(missing).toEqual([]);
    },
  );

  it.each(["/dashboard", "/admin"])(
    "%s/control-tower has a tour per view",
    (section) => {
      const missing = TOWER_VIEWS.map((view) =>
        resolveTutorialKey({
          pathname: `${section}/control-tower`,
          urlView: view.value,
        }),
      ).filter((key) => !tutorialConfigs[key]);

      expect(missing).toEqual([]);
    },
  );

  it.each(["/dashboard", "/admin"])(
    "%s/integrations has a tour per tab",
    (section) => {
      const missing = INTEGRATION_TABS.map((tab) =>
        resolveTutorialKey({
          pathname: `${section}/integrations`,
          urlTab: tab.value,
        }),
      ).filter((key) => !tutorialConfigs[key]);

      expect(missing).toEqual([]);
    },
  );
});

describe("the refresh step names the button as the page labels it", () => {
  /**
   * Buttons are named as on screen (decision 9.2). Every refresh reads
   * "Atualizar" since decision 16.450 (08/10/2026) (the DataTable's used to read
   * "Revalidar Dados"). Checked both ways: a tour that names a label the
   * screen does not render sends people looking for nothing.
   */
  const REFRESH_COMPONENTS = /<(RevalidateButtonUI|RefreshButton)\b/g;
  const DEFAULT_LABEL = "Atualizar";

  /** Labels of the refresh buttons a set of files renders (literal or default). */
  function refreshLabels(files: Iterable<string>): Set<string> {
    const labels = new Set<string>();

    for (const file of files) {
      if (TOUR_SOURCES.test(file)) continue;

      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(REFRESH_COMPONENTS)) {
        const start = match.index ?? 0;
        const end = source.indexOf("/>", start);
        const props = source.slice(start, end === -1 ? undefined : end);
        const label =
          /\blabel\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*["']([^"']+)["']\s*\}|(\{))/.exec(
            props,
          );

        if (!label) labels.add(DEFAULT_LABEL);
        else if (!label[4]) labels.add(label[1] ?? label[2] ?? label[3]);
        // `label={label}`: a wrapper forwarding its own prop, judged where it is used.
      }
    }

    return labels;
  }

  it("reads the one label from the components themselves", () => {
    expect(
      refreshLabels([
        resolve(
          SRC,
          "app/(protected)/_components/shared/tanstack-table/data-table-revalidate/index.tsx",
        ),
      ]),
    ).toEqual(new Set([DEFAULT_LABEL]));
    expect(
      refreshLabels([
        resolve(
          SRC,
          "app/(protected)/_components/kanban/revalidate-button/index.tsx",
        ),
      ]),
    ).toEqual(new Set([DEFAULT_LABEL]));
  });

  it.each(TOURS)("%s", (key, steps) => {
    const claimed = steps
      .filter((step) => step.anchor === "revalidate")
      .map((step) =>
        step.title.replace(/\s*\p{Extended_Pictographic}.*$/u, "").trim(),
      );

    if (claimed.length === 0) return;

    const rendered = refreshLabels(tourFiles(key));

    for (const label of claimed) {
      expect(
        rendered.has(label),
        `${key} diz "${label}", a tela mostra ${JSON.stringify([...rendered])}`,
      ).toBe(true);
    }
  });
});
