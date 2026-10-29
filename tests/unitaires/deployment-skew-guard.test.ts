import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * How often an open tab asks the server which build it runs.
 *
 * The guard checks when the window gains focus and when the tab comes back
 * into view. Both fire all day long — a dispatcher alt-tabs between the
 * dashboard, WhatsApp and a spreadsheet dozens of times an hour — and every
 * open tab of every user sent one request to the single web replica per
 * switch. A deploy is noticed just as well with one question a minute.
 */
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BUILD_SHA = "aaa111";
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

const toast = vi.hoisted(() => ({ info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { DeploymentSkewGuard } from "@/components/shared/deployment-skew-guard";

const START = new Date("2026-09-24T12:00:00Z").getTime();

let root: Root | null = null;
let served = "aaa111";

const fetchBuild = vi.fn(
  async () =>
    new Response(JSON.stringify({ sha: served }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
);

async function mount(): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(DeploymentSkewGuard));
  });
}

async function focusWindow(): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(START);

  served = "aaa111";
  fetchBuild.mockClear();
  toast.info.mockClear();
  vi.stubGlobal("fetch", fetchBuild);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;

  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the build check", () => {
  it("asks at most once a minute, however often the window gains focus", async () => {
    await mount();

    for (let second = 0; second < 50; second += 10) {
      vi.setSystemTime(START + second * 1000);
      await focusWindow();
    }

    expect(fetchBuild).toHaveBeenCalledTimes(1);

    vi.setSystemTime(START + 61_000);
    await focusWindow();

    expect(fetchBuild).toHaveBeenCalledTimes(2);
  });

  it("still tells the person about a new build", async () => {
    await mount();

    served = "bbb222";
    await focusWindow();

    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info.mock.calls[0][0]).toContain("nova versão");
  });
});
