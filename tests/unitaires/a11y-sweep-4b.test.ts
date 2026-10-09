import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * axe findings of the visual sweep (wave 4b), in both themes at 1440px:
 * the Kanban column handle and menu had no name, the priority chips and the
 * 2FA badge were under 4.5:1, and the activity view switch pointed
 * aria-controls at a panel that does not exist.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/admin/activity",
}));

import { ActivityViewSwitch } from "@/features/activity/view-switch";

(globalThis as { React?: typeof React }).React = React;

const SRC = resolve(__dirname, "../../src");
const read = (path: string) => readFileSync(resolve(SRC, path), "utf8");

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("accessibility sweep (wave 4b)", () => {
  it("the Atividade view tabs do not point aria-controls at a missing panel", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(ActivityViewSwitch, { activeView: "timeline" }),
      );
    });

    const tabs = host.querySelectorAll('[role="tab"]');

    expect(tabs).toHaveLength(2);
    tabs.forEach((tab) =>
      expect(tab.hasAttribute("aria-controls")).toBe(false),
    );
  });

  it("the Kanban column's handle and menu have a name", () => {
    const column = read("app/(protected)/_components/kanban/column/index.tsx");

    expect(column).toContain("aria-label={`Mover a coluna ${column.title}`}");
    expect(column).toContain("aria-label={`Ações da coluna ${column.title}`}");
  });

  it("the priority badges use the 700 tone on the 100", () => {
    const card = read("app/(protected)/_components/kanban/card/index.tsx");
    const block = /const priorityColors = \{([\s\S]*?)\};/.exec(card)![1];

    expect(block).not.toMatch(/text-\w+-600/);
    expect(block.match(/text-\w+-700/g)).toHaveLength(4);
  });

  it("the profile's 2FA badge passes 4.5:1 in both themes", () => {
    const twoFactor = read(
      "app/(protected)/_components/profile/account/user-two-factor-authentication/index.tsx",
    );

    expect(twoFactor).toContain("dark:text-red-400 text-red-700");
    expect(twoFactor).toContain("dark:text-green-400 text-green-700");
    expect(twoFactor).not.toMatch(/dark:text-red-500 text-red-600/);
  });
});
