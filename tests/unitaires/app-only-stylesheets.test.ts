// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * globals.css is render-blocking CSS on every page, the public site
 * included. It carried ~13.8 KB (2.5 KB gzip) of rules only the signed-in
 * app paints — the tour card, the Leaflet theme and the ⌘K list's
 * scrollbar — plus rules no element used at all. Each used block now lives
 * in a stylesheet imported by the component that renders it, so it ships
 * only in that component's CSS chunk, and the unused ones are gone.
 *
 * This fails if one of those selectors moves back into globals.css, if a
 * block loses its rules (dark variants included) on the way, or if a
 * component stops importing its stylesheet, which would drop those rules
 * from the page without any error.
 */
const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

/** The CSS without its comments, so a mention in prose is not a rule. */
const rulesOf = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `selector` as a whole token: `.scrollbar-hide` does not match `.scrollbar-hidden`. */
const token = (selector: string) => new RegExp(`${escape(selector)}(?![\\w-])`);

const TUTORIAL_COMPONENT =
  "src/app/(protected)/_components/layout/protected-tutorial/tutorial-component/index.tsx";
const TUTORIAL_SHEET =
  "src/app/(protected)/_components/layout/protected-tutorial/tutorial-component/tutorial-component.css";

const PALETTE_COMPONENT =
  "src/app/(protected)/_components/layout/protected-command-bar-provider/palette.tsx";
const PALETTE_SHEET =
  "src/app/(protected)/_components/layout/protected-command-bar-provider/palette.css";

const LEAFLET_SHEET = "src/features/control-tower/lib/leaflet-theme.css";
const LEAFLET_CORE = "leaflet/dist/leaflet.css";
/**
 * Every module that pulls Leaflet's own stylesheet, found by scanning src: a
 * new map that imports leaflet.css without the theme would otherwise lose the
 * dark tiles and the stacking context without any test noticing.
 */
const MAPS = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => path.relative(ROOT, path.join(SRC, file)).replace(/\\/g, "/"))
  .filter((file) => read(file).includes(`"${LEAFLET_CORE}"`))
  .sort();

/** Every class the tour card renders with a rule of its own. */
const TUTORIAL_CLASSES = [
  "tutorial-tooltip-compact",
  "tutorial-permission-section-compact",
  "tutorial-warning-section-compact",
  "tutorial-info-section-compact",
  "tutorial-list-compact",
  "tutorial-enhanced-spotlight",
  "tutorial-progress-enhanced",
  "tutorial-button-primary",
  "tutorial-backdrop",
  "tutorial-skip-hover",
  "tutorial-keyboard-hint",
  "tutorial-content-scroll",
];

const SHEETS: {
  sheet: string;
  importers: string[];
  /** The import it must follow directly, to keep the cascade order. */
  after?: string;
  /** Selectors (and at-rules) it must hold, dark variants included. */
  holds: string[];
}[] = [
  {
    sheet: TUTORIAL_SHEET,
    importers: [TUTORIAL_COMPONENT],
    holds: [
      ...TUTORIAL_CLASSES.map((name) => `.${name}`),
      ".dark .tutorial-tooltip-compact",
      ".dark .tutorial-permission-section-compact",
      ".dark .tutorial-warning-section-compact",
      ".dark .tutorial-info-section-compact",
      ".dark .tutorial-list-compact",
      ".dark .tutorial-keyboard-hint",
      ".tutorial-content-scroll::-webkit-scrollbar-thumb:hover",
      "@keyframes tutorial-tooltip-appear-compact",
      "@keyframes tutorial-enhanced-glow",
      "@keyframes tutorial-progress-flow",
      "@media (prefers-reduced-motion: reduce)",
    ],
  },
  {
    sheet: PALETTE_SHEET,
    importers: [PALETTE_COMPONENT],
    holds: [
      "#kbar-listbox",
      "[data-kbar-results]::-webkit-scrollbar-thumb:hover",
      '[data-kbar-portal] div[style*="overflow: auto"]::-webkit-scrollbar-thumb',
      ".dark #kbar-listbox::-webkit-scrollbar-thumb",
      ".dark [data-kbar-results]::-webkit-scrollbar-thumb:hover",
    ],
  },
  {
    sheet: LEAFLET_SHEET,
    importers: MAPS,
    after: LEAFLET_CORE,
    holds: [
      ".leaflet-container.leaflet-container",
      ".custom-popup .leaflet-popup-content-wrapper",
      ".custom-popup .leaflet-popup-tip",
      ".dark .custom-popup .leaflet-popup-content-wrapper",
      ".dark .custom-popup .leaflet-popup-tip",
      ".dark .leaflet-container:not(.map-tiles-native-dark) .leaflet-tile-pane",
      ".dark .leaflet-container .leaflet-bar a:focus-visible",
      ".dark .leaflet-container .leaflet-control-attribution a",
      ".dark .leaflet-tooltip-right::before",
    ],
  },
];

/** Side-effect and `from` imports, in source order. */
function importsOf(source: string): string[] {
  return [
    ...source.matchAll(/^import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["'];/gm),
  ].map((match) => match[1]);
}

/** Repo-relative path of a local specifier, or the bare package specifier. */
function resolveSpecifier(from: string, specifier: string): string {
  if (specifier.startsWith("@/"))
    return path.relative(ROOT, path.join(SRC, specifier.slice(2)));
  if (specifier.startsWith("."))
    return path.relative(
      ROOT,
      path.resolve(path.dirname(path.join(ROOT, from)), specifier),
    );
  return specifier;
}

const normalize = (file: string) => file.replace(/\\/g, "/");

describe("styles only the signed-in app paints stay out of globals.css", () => {
  it("keeps the tour, map, ⌘K and unused rules out of globals.css", () => {
    const globals = rulesOf(read("src/app/globals.css"));

    const gone: [string, RegExp][] = [
      // Never used as a class anywhere in src: deleted.
      ...[
        ".kanban-column",
        ".kanban-card",
        ".dragging",
        ".card-badge",
        ".scrollbar-hide",
        ".md-editor-custom",
        ".w-md-editor-toolbar",
        ".glass-morphism",
      ].map((selector): [string, RegExp] => [selector, token(selector)]),
      // Moved next to the component that renders them.
      [".tutorial-*", /\.tutorial-[\w-]+/],
      ["@keyframes tutorial-*", /@keyframes\s+tutorial-/],
      [".leaflet-*", /\.leaflet-[\w-]+/],
      [".custom-popup", token(".custom-popup")],
      [".map-tiles-native-dark", token(".map-tiles-native-dark")],
      ["#kbar-listbox", token("#kbar-listbox")],
      ["[data-kbar-results]", /\[data-kbar-results\]/],
      ["[data-kbar-portal]", /\[data-kbar-portal\]/],
    ];

    const back = gone
      .filter(([, pattern]) => pattern.test(globals))
      .map(([selector]) => selector);

    expect(back).toEqual([]);
    // Non-vacuous: the rules that stay (used on public pages too) are read.
    expect(globals).toMatch(token(".scrollbar-none"));
    expect(globals).toMatch(token(".stack-item"));
  });

  it("finds the Leaflet maps by scanning src", () => {
    // Non-vacuous: the scan sees the maps known when the theme moved.
    expect(MAPS).toEqual(
      expect.arrayContaining([
        "src/features/control-tower/map/index.tsx",
        "src/features/routes/detail-page/route-map.tsx",
        "src/app/(protected)/_components/shared/custom/location-picker/hooks/index.ts",
      ]),
    );
  });

  it("still renders every tour class it styles", () => {
    const component = read(TUTORIAL_COMPONENT);
    const unused = TUTORIAL_CLASSES.filter(
      (name) => !token(name).test(component),
    );

    expect(unused).toEqual([]);
  });

  for (const { sheet, importers, after, holds } of SHEETS) {
    it(`${sheet}: holds the whole block, dark variants included`, () => {
      expect(existsSync(path.join(ROOT, sheet)), sheet).toBe(true);

      const css = rulesOf(read(sheet));
      const missing = holds.filter((selector) => !css.includes(selector));

      expect(missing).toEqual([]);
      // Plain CSS: a Tailwind @layer needs the @tailwind directive that only
      // globals.css has, and the build would fail on it.
      expect(css).not.toMatch(/@(layer|tailwind)\b/);
    });

    for (const importer of importers) {
      it(`${sheet}: is imported by ${importer}${after ? ` right after ${after}` : ""}`, () => {
        const specifiers = importsOf(read(importer));
        const at = specifiers.findIndex(
          (specifier) =>
            normalize(resolveSpecifier(importer, specifier)) === sheet,
        );

        expect(at, `${importer} imports ${sheet}`).toBeGreaterThanOrEqual(0);
        if (after) expect(specifiers[at - 1]).toBe(after);
      });
    }
  }
});
