import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every page the product has, reachable from the command palette.
 *
 * The palette drifted silently: Rotas, Torre de Controle, Integrações and
 * Atividades recentes all existed in the sidebar and none of them was in the
 * ⌘K list. Nobody notices, because a missing entry looks exactly like a list
 * that is simply short — and the palette is the fastest way around the
 * product for the people who use it all day.
 *
 * Drift is the failure mode worth testing, not the current contents. Adding a
 * page and forgetting the palette is one commit; this turns that commit red.
 *
 * Read as source text on purpose. The hook is a React component tree that
 * needs a router, a store and a session to evaluate, and what matters here is
 * a set of path strings — importing the module would buy nothing and cost a
 * pile of mocks.
 */
const ROUTES = readFileSync(
  resolve(__dirname, "../../src/app/app-routes/index.ts"),
  "utf8",
);

const COMMAND_BAR = readFileSync(
  resolve(
    __dirname,
    "../../src/app/(protected)/_components/layout/protected-command-bar-provider/hooks/index.tsx",
  ),
  "utf8",
);

const pathsIn = (source: string): string[] => [
  ...new Set(
    [...source.matchAll(/path: "(\/[^"]+)"/g)].map((match) => match[1]),
  ),
];

const registered = pathsIn(ROUTES);
const inPalette = new Set(pathsIn(COMMAND_BAR));

/**
 * Pages that are deliberately absent, each for a stated reason.
 *
 * An allow-list rather than a loosened rule: "this one on purpose" has to be
 * written down somewhere, and the alternative — dropping the assertion — is
 * how the four missing entries above went unnoticed.
 */
const NOT_IN_PALETTE = new Map<string, string>([
  [
    "/driver/kanban",
    "Driver surface: the app is the driver's product, and the palette is a keyboard affordance for a desk.",
  ],
  ["/driver/vehicles", "Same."],
  ["/driver/account-payable", "Same."],
  ["/driver/service-order", "Same."],
  ["/driver/fuel", "Same."],
  ["/driver/vehicle-checklist", "Same."],
  ["/driver/fine", "Same."],
  ["/driver/deliveries", "Same."],
]);

describe("the file reading itself", () => {
  it("found paths in both files", () => {
    // Without this, a regex that stopped matching would make every assertion
    // below pass over two empty lists.
    expect(registered.length).toBeGreaterThan(20);
    expect(inPalette.size).toBeGreaterThan(20);
  });
});

describe("every registered page is in the command palette", () => {
  it.each(
    registered.filter((path) => !NOT_IN_PALETTE.has(path)),
  )("%s", (path) => {
    expect(
      inPalette.has(path),
      `${path} está no registro de rotas e não no ⌘K`,
    ).toBe(true);
  });
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
});
