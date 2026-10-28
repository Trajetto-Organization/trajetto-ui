import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Registro de atividades: one toolbar line (decision of 28/10/2026, spec
 * §3.3).
 *
 * Atualizar sat alone on the page's action line, and the view switch and
 * the 7 / 30 dias shortcuts had a row of their own under it — so the button
 * was always a line above the controls it sits with. Now the view switch is
 * the line's left side and the shortcuts and Atualizar its right side, in
 * the shared ProtectedPageToolbar: one line while they fit, the right side
 * moving down whole when they do not, stacked on a phone.
 */
(globalThis as { React?: typeof React }).React = React;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams("view=timeline"),
  usePathname: () => "/dashboard/activity",
  redirect: vi.fn(),
}));

vi.mock("@/actions/activity/get-activity-summary", () => ({
  getActivitySummary: vi.fn(async () => ({ success: true, data: null })),
}));

vi.mock("@/actions/activity/list-activities-cursor", () => ({
  listActivitiesCursor: vi.fn(async () => ({
    success: true,
    data: [],
    nextCursor: null,
    hasMore: false,
  })),
}));

// The cards and the feed have suites of their own.
vi.mock("@/features/activity/stats", () => ({ ActivityStats: () => null }));
vi.mock("@/features/activity/timeline-feed", () => ({
  ActivityTimelineFeed: () => null,
}));

import { ActivityContent } from "@/features/activity/content";

let root: Root | null = null;

beforeEach(() => {
  navigation.push.mockClear();
  localStorage.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function mountContent(period?: string): Promise<HTMLElement> {
  const element = await ActivityContent({
    mode: "dashboard",
    searchParams: period ? { period } : {},
    token: "token",
  });

  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(element));

  return host;
}

describe("the activity toolbar", () => {
  it("puts the view switch, the period and Atualizar on one toolbar line", async () => {
    const host = await mountContent();

    const toolbar = host.querySelector<HTMLElement>("[data-page-toolbar]")!;
    const context = toolbar.querySelector("[data-toolbar-context]");
    const actions = toolbar.querySelector("[data-toolbar-actions]");

    expect(context, "a troca de visão saiu do lado esquerdo").not.toBeNull();
    expect(actions, "a linha de ações sumiu").not.toBeNull();

    // Both halves are children of the one top row.
    expect(context!.parentElement).toBe(actions!.parentElement);
    expect(context!.parentElement!.className).toContain("flex-wrap");

    expect(
      context!.querySelector('[data-tutorial="activity-view-switch"]'),
    ).not.toBeNull();

    const period = actions!.querySelector('[data-tutorial="activity-period"]');
    const refresh = [...actions!.querySelectorAll("button")].find((button) =>
      (button.textContent ?? "").includes("Atualizar"),
    );

    expect(period, "os atalhos de período saíram da linha").not.toBeNull();
    expect(refresh, "Atualizar saiu da linha").toBeTruthy();

    // The shortcuts first, Atualizar at the end of the line.
    expect(
      period!.compareDocumentPosition(refresh!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Not a second row of controls under the toolbar any more.
    expect(
      host.querySelectorAll('[data-tutorial="activity-period"]'),
    ).toHaveLength(1);
  });

  it("stacks the shortcuts and Atualizar on a phone and lines them up from sm", async () => {
    const host = await mountContent();

    const group = host.querySelector<HTMLElement>(
      "[data-toolbar-actions] [data-page-actions]",
    )!;

    expect(group.className).toContain("flex-col");
    expect(group.className).toContain("sm:flex-row");
    // The action row gives every button its height (decision 16.61): the
    // shortcuts are as tall as Atualizar beside them.
    expect(host.querySelector("[data-toolbar-actions]")!.className).toContain(
      "[&_button:not([role=switch]):not([role=checkbox])]:h-9",
    );
  });

  it("still moves the cards' window through the URL", async () => {
    const host = await mountContent("7d");

    const thirty = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "30 dias",
    )!;

    expect(
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent === "7 dias")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    await act(async () => thirty.click());

    expect(navigation.push).toHaveBeenCalledWith("?view=timeline&period=30d");
  });
});
