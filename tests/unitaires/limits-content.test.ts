import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Limites de Uso (DASH-MOD-1, decision 2.6).
 *
 * The AI card said "abastecimentos e checklists" to every company, while the
 * same quota also pays for the proof analysis of Entregas (decision 6.9): a
 * deliveries-only carrier read a quota that seemed not to be theirs. And on
 * /admin, a company switch kept the previous company's plan on screen until
 * the next answer, and an answer that came back late overwrote the new one.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));

type Pending<T> = { resolve: (value: T) => void; promise: Promise<T> };

function deferred<T>(): Pending<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { resolve, promise };
}

const api = vi.hoisted(() => ({
  usage: new Map<string, Pending<unknown>>(),
  plans: new Map<string, Pending<unknown>>(),
}));

vi.mock("@/actions/business/get-ai-usage", () => ({
  getAIUsage: (businessId: string) => api.usage.get(businessId)!.promise,
}));

vi.mock("@/actions/business/entitlements", () => ({
  getBusinessEntitlements: (businessId: string) =>
    api.plans.get(businessId)!.promise,
}));

import {
  AI_QUOTA_NOTE,
  aiQuotaScope,
} from "@/app/(protected)/_components/shared/limits/limits-content/lib/ai-quota-scope";
import { useLimitsContent } from "@/app/(protected)/_components/shared/limits/limits-content/hooks";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  api.usage.clear();
  api.plans.clear();
});

const on = (...modules: string[]) =>
  ["FLEET", "DELIVERIES"].map((module) => ({
    module,
    enabled: modules.includes(module),
  }));

const FLEET_TEXT =
  "Leitura automática do odômetro nos abastecimentos e no checklist, feita na infraestrutura da Trajetto.";
const DELIVERIES_TEXT =
  "Leitura automática do canhoto (número da NF e data de recebimento), feita na infraestrutura da Trajetto. A assinatura segue para conferência da sua equipe.";

describe("what the AI quota says it pays for (ADR 0010)", () => {
  // Red before: "Leitura inteligente de abastecimentos e checklists" promised
  // a reading of every checklist photo, and said nothing of where it ran.
  it.each([
    [on("FLEET"), FLEET_TEXT],
    [on("DELIVERIES"), DELIVERIES_TEXT],
    [on("FLEET", "DELIVERIES"), `${FLEET_TEXT} ${DELIVERIES_TEXT}`],
  ])("follows the company's modules", (modules, text) => {
    expect(aiQuotaScope(modules)).toBe(text);
  });

  it("does not claim a module before the plan is known", () => {
    const unknown =
      "Leitura automática das fotos enviadas pelo aplicativo, feita na infraestrutura da Trajetto.";

    expect(aiQuotaScope(null)).toBe(unknown);
    expect(aiQuotaScope(on())).toBe(unknown);
  });

  it("never names an external provider, and says the signature is the team's", () => {
    for (const modules of [
      on("FLEET"),
      on("DELIVERIES"),
      on("FLEET", "DELIVERIES"),
      null,
    ]) {
      expect(aiQuotaScope(modules)).not.toMatch(
        /claude|anthropic|haiku|gpt|gemini/i,
      );
    }

    expect(aiQuotaScope(on("DELIVERIES"))).toContain(
      "A assinatura segue para conferência da sua equipe.",
    );
  });

  it("says, under the bar, what counts once and what never counts", () => {
    expect(AI_QUOTA_NOTE).toBe(
      "Cada foto lida conta uma vez. Itens do checklist como combustível, pneus e condição não são lidos automaticamente e não contam.",
    );
  });

  // Red before: the note promised a device pre-check that is not shipped.
  it("does not mention the device pre-check before it exists", () => {
    expect(AI_QUOTA_NOTE).not.toMatch(/pré-checagem|celular/i);
  });
});

const A = "018f0000-0000-7000-8000-00000000000a";
const B = "018f0000-0000-7000-8000-00000000000b";

const usageOf = (used: number) => ({
  success: true,
  message: "",
  data: {
    ai_analysis_used: used,
    ai_analysis_limit: 100,
    ai_analysis_in_progress: 0,
  },
});

const planOf = (vehicles: number) => ({
  success: true,
  message: "",
  data: {
    modules: on("FLEET"),
    vehicle_limit: 10,
    vehicle_count: vehicles,
    vehicle_limit_enabled: true,
  },
});

describe("switching company on /admin", () => {
  it("never shows the previous company's numbers under the new one", async () => {
    for (const id of [A, B]) {
      api.usage.set(id, deferred());
      api.plans.set(id, deferred());
    }

    const seen: Array<ReturnType<typeof useLimitsContent>> = [];

    const Probe = ({ businessId }: { businessId: string }) => {
      seen.push(useLimitsContent({ businessId }));
      return null;
    };

    const container = document.createElement("div");
    const root = createRoot(container);

    unmounts.push(async () => {
      await act(async () => root.unmount());
    });

    await act(async () => {
      root.render(createElement(Probe, { businessId: A }));
    });

    // A's plan arrives; A's usage is still on its way when the master
    // switches to B.
    await act(async () => {
      api.plans.get(A)!.resolve(planOf(7));
    });

    expect(seen.at(-1)?.entitlements?.vehicle_count).toBe(7);

    await act(async () => {
      root.render(createElement(Probe, { businessId: B }));
    });

    // Under B, A's plan is gone at once rather than shown until B answers.
    expect(seen.at(-1)?.businessId).toBe(B);
    expect(seen.at(-1)?.entitlements).toBeNull();

    await act(async () => {
      api.usage.get(B)!.resolve(usageOf(3));
      api.plans.get(B)!.resolve(planOf(2));
    });

    // A's usage answers last. It must not land on B's screen.
    await act(async () => {
      api.usage.get(A)!.resolve(usageOf(99));
    });

    const last = seen.at(-1)!;

    expect(last.businessId).toBe(B);
    expect(last.aiUsage?.ai_analysis_used).toBe(3);
    expect(last.entitlements?.vehicle_count).toBe(2);
  });
});
