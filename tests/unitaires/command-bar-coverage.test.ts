import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/app-routes";
import {
  paletteEntries,
  type NavSurface,
} from "@/app/(protected)/_components/layout/protected-navbar-items";

/**
 * Every page the product has, reachable from the command palette.
 *
 * The palette drifted silently: Rotas, Torre de Controle, Integrações and
 * Atividades recentes all existed in the sidebar and none of them was in the
 * ⌘K list. Nobody notices, because a missing entry looks exactly like a list
 * that is simply short — and the palette is the fastest way around the
 * product for the people who use it all day.
 *
 * The palette and the sidebar now read one navigation list
 * (protected-navbar-items); this compares that list with the route registry.
 */
const SURFACES: NavSurface[] = ["admin", "dashboard", "driver"];

const registered = [...new Set(appRoutes.map((route) => route.path))];

const inPalette = new Set(
  SURFACES.flatMap((surface) => paletteEntries(surface)).map(
    (entry) => entry.path,
  ),
);

/**
 * Pages that are deliberately absent, each for a stated reason.
 *
 * An allow-list rather than a loosened rule: "this one on purpose" has to be
 * written down somewhere, and the alternative — dropping the assertion — is
 * how the four missing entries above went unnoticed.
 */
const NOT_IN_PALETTE = new Map<string, string>([
  [
    "/driver/vehicles/:vehicleId/fuels",
    "Opened from a vehicle card: the page needs the vehicle's id.",
  ],
  ["/driver/vehicles/:vehicleId/service-orders", "Same."],
]);

describe("the lists themselves", () => {
  it("are not empty", () => {
    // Without this, a broken import would make every assertion below pass
    // over two empty lists.
    expect(registered.length).toBeGreaterThan(20);
    expect(inPalette.size).toBeGreaterThan(20);
  });
});

describe("every registered page is in the command palette", () => {
  it.each(registered.filter((path) => !NOT_IN_PALETTE.has(path)))(
    "%s",
    (path) => {
      expect(
        inPalette.has(path),
        `${path} está no registro de rotas e não no ⌘K`,
      ).toBe(true);
    },
  );
});

describe("and the palette does not point anywhere unknown", () => {
  it("has no action for a path the registry never heard of", () => {
    /**
     * The other direction, and it matters more than it looks: the palette
     * filters its actions through `canAccessPath`, which ALLOWS a path it
     * does not know. An entry for an unregistered page would therefore be
     * offered to everybody, permission and hired module included — which is
     * exactly the hole that left the control tower and the integrations
     * screen ungated until this week.
     */
    const registeredSet = new Set(registered);

    const unknown = [...inPalette].filter((path) => !registeredSet.has(path));

    expect(
      unknown,
      `ações do ⌘K para caminhos fora do registro: ${unknown.join(", ")}`,
    ).toEqual([]);
  });

  it("gives every action a unique id on its surface", () => {
    for (const surface of SURFACES) {
      const paths = paletteEntries(surface).map((entry) => entry.path);

      expect(new Set(paths).size, surface).toBe(paths.length);
    }
  });
});
