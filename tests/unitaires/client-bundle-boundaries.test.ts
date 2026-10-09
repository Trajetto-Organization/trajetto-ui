// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { clientStaticGraph } from "./helpers/client-graph";

/**
 * What stays out of a route's first-load JavaScript (docs/arquitetura.md, "Desempenho").
 *
 * Each case was in the first load before and is now a separate chunk, loaded
 * when the screen actually needs it. Reaching one of them through a static
 * import again puts its weight back on every visit of the route, with nothing
 * failing to say so — hence the check on the import graph.
 */
const PROTECTED_LAYOUT = "src/app/(protected)/layout.tsx";

const inside = (graph: Set<string>, fragment: string) =>
  [...graph].filter((entry) => entry.includes(fragment));

describe("the protected layout (every dashboard, admin and driver page)", () => {
  const graph = clientStaticGraph(PROTECTED_LAYOUT);

  it("is walked through its client tree", () => {
    // Non-vacuous: the layout's own client tree is found.
    expect(graph.has("npm:react-query")).toBe(true);
    expect(
      inside(graph, "protected-tutorial/tutorial-provider/index.tsx"),
    ).toHaveLength(1);
  });

  it("does not carry the tours' copy (~100 KB of text)", () => {
    expect(inside(graph, "protected-tutorial/tutorial-provider/data/")).toEqual(
      [],
    );
  });

  it("loads the tour card and its placement engine only when a tour opens", () => {
    expect(
      inside(graph, "protected-tutorial/tutorial-component/index.tsx"),
    ).toEqual([]);
    expect(inside(graph, "protected-tutorial/engine/placement.ts")).toEqual([]);
  });
});

describe("Entregas (the table most people open)", () => {
  for (const page of [
    "src/app/(protected)/dashboard/deliveries/page.tsx",
    "src/app/(protected)/admin/deliveries/page.tsx",
  ]) {
    const graph = clientStaticGraph(page);

    it(`${page}: ships the table`, () => {
      expect(inside(graph, "features/deliveries/table/index.tsx")).toHaveLength(
        1,
      );
    });

    it(`${page}: leaves each tab panel to its own chunk`, () => {
      expect([
        ...inside(graph, "features/deliveries/chat/index.tsx"),
        ...inside(graph, "features/deliveries/chat/conversation.tsx"),
        ...inside(graph, "features/deliveries/proof-audits/panel.tsx"),
        ...inside(graph, "features/deliveries/message-templates/panel.tsx"),
        ...inside(graph, "features/deliveries/monitoring/index.tsx"),
      ]).toEqual([]);
    });
  }
});

describe("the photo drop zones (react-dropzone, ~15 KB gzipped)", () => {
  for (const page of [
    "src/app/(protected)/dashboard/fuel/page.tsx",
    "src/app/(protected)/dashboard/vehicle-checklist/page.tsx",
    "src/app/(protected)/admin/fuel/page.tsx",
    "src/app/(protected)/admin/vehicle-checklist/page.tsx",
  ]) {
    const graph = clientStaticGraph(page);

    it(`${page}: ships the create dialog, not the drop zone`, () => {
      const dialog = page.includes("fuel")
        ? "features/fuel/create-dialog"
        : "features/vehicle-checklist/create-form";

      expect(inside(graph, dialog)).not.toEqual([]);
      expect(graph.has("npm:react-dropzone")).toBe(false);
    });
  }
});

describe("the Meu Perfil page", () => {
  const graph = clientStaticGraph("src/app/(protected)/profile/page.tsx");

  it("ships the account forms", () => {
    expect(
      inside(graph, "profile/account/avatar-upload/index.tsx"),
    ).toHaveLength(1);
  });

  it("loads the avatar picker and cropper with their dialog", () => {
    expect(graph.has("npm:react-dropzone")).toBe(false);
    expect(graph.has("npm:react-easy-crop")).toBe(false);
  });
});

describe("the delivery detail", () => {
  it("is loaded on the first click, not with the tables or the chat", () => {
    for (const entry of [
      "src/app/(protected)/dashboard/deliveries/page.tsx",
      "src/features/deliveries/chat/index.tsx",
    ]) {
      const graph = clientStaticGraph(entry);

      expect(
        inside(graph, "features/deliveries/deliveries/detail-dialog/index.tsx"),
        entry,
      ).toEqual([]);
    }
  });
});

describe("Leaflet (~40 KB gzipped with its CSS)", () => {
  const pages = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return pages(full);
      return entry.name === "page.tsx"
        ? [path.relative(process.cwd(), full).replace(/\\/g, "/")]
        : [];
    });

  const all = pages(path.join(process.cwd(), "src/app"));

  it("finds the pages and the maps", () => {
    expect(all).toContain(
      "src/app/(protected)/dashboard/control-tower/page.tsx",
    );
    expect(
      clientStaticGraph(
        "src/app/(protected)/_components/shared/custom/location-picker/index.tsx",
      ).has("npm:leaflet"),
    ).toBe(true);
  });

  it("is never in a page's first load: every map is a dynamic import", () => {
    expect(
      all.filter((page) => clientStaticGraph(page).has("npm:leaflet")),
    ).toEqual([]);
  });
});
