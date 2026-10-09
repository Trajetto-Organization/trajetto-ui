import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * The server side, as the two server actions answer it. Replaced because
 * they run on the Next server; the merge being proven is all client code.
 */
const server = vi.hoisted(() => ({
  usage: {
    ai_analysis_limit: 100,
    ai_analysis_used: 0,
    ai_analysis_in_progress: 0,
    ai_analysis_reset_at: null as string | null,
  },
}));

vi.mock("@/actions/business/get-ai-usage", () => ({
  getAIUsage: async () => ({ success: true, data: { ...server.usage } }),
}));

vi.mock("@/actions/business/entitlements", () => ({
  getBusinessEntitlements: async () => ({ success: true, data: null }),
}));

import { useLimitsContent } from "@/app/(protected)/_components/shared/limits/limits-content/hooks";
import { useAIVerificationStore } from "@/store/ai-verification-store";

/**
 * "Limites de uso" after the MASTER raises a company's AI limit (DLVP-ADM-2).
 *
 * The screen merges two sources: the server's answer and the usage the socket
 * carries with every AI verification event. The socket's always won — so
 * after one analysis on that tab, raising the limit from 100 to 500 and
 * pressing "Atualizar" still showed 100, until another analysis ran.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  server.usage = {
    ai_analysis_limit: 100,
    ai_analysis_used: 0,
    ai_analysis_in_progress: 0,
    ai_analysis_reset_at: null,
  };
  useAIVerificationStore.getState().clearAll();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
});

let limits: ReturnType<typeof useLimitsContent>;

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 20));
  });
}

async function mount(): Promise<void> {
  const Probe = () => {
    limits = useLimitsContent({ businessId: BUSINESS } as never);
    return null;
  };

  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(createElement(Probe)));
  unmounts.push(async () => act(async () => root.unmount()));

  await settle();
}

function socketUsage(used: number, limit: number): void {
  // What the notifications provider does with an `aiVerification` event.
  act(() => {
    useAIVerificationStore.getState().updateBusinessUsage(BUSINESS, {
      used,
      inProgress: 0,
      limit,
      remaining: limit - used,
      resetAt: null,
    });
  });
}

async function revalidate(): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new CustomEvent("data-revalidated"));
  });

  await settle();
}

describe("the Limites de uso tab", () => {
  it("shows the socket's usage when it is the newest thing the tab heard", async () => {
    await mount();
    expect(limits.aiUsage?.ai_analysis_used).toBe(0);

    socketUsage(7, 100);

    expect(limits.aiUsage?.ai_analysis_used).toBe(7);
  });

  it("shows the server's answer after Atualizar, over an older socket snapshot", async () => {
    await mount();
    socketUsage(7, 100);

    // The MASTER raises the limit in another session.
    server.usage = {
      ...server.usage,
      ai_analysis_limit: 500,
      ai_analysis_used: 7,
    };

    await revalidate();

    expect(
      limits.aiUsage?.ai_analysis_limit,
      "o limite novo não apareceu",
    ).toBe(500);
  });

  it("follows the socket again once it has something newer than that answer", async () => {
    await mount();
    socketUsage(7, 100);

    server.usage = {
      ...server.usage,
      ai_analysis_limit: 500,
      ai_analysis_used: 7,
    };
    await revalidate();

    // Date.now() may not have ticked since the answer; the event is later.
    await new Promise((done) => setTimeout(done, 5));
    socketUsage(8, 500);

    expect(limits.aiUsage?.ai_analysis_used).toBe(8);
    expect(limits.aiUsage?.ai_analysis_limit).toBe(500);
  });
});
