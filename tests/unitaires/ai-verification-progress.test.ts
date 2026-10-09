import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: router.refresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

/** The API's answers for the record, as the server actions return them. */
const api = vi.hoisted(() => ({
  progress: [] as Array<Record<string, unknown>>,
  calls: 0,
}));

vi.mock("@/actions/ai-analysis", () => ({
  getAIVerificationProgress: async () => {
    const answer = api.progress[Math.min(api.calls, api.progress.length - 1)];
    api.calls += 1;

    return { success: true, message: "ok", data: answer };
  },
  requestAIVerification: async () => ({
    success: true,
    message: "Verificação IA iniciada.",
  }),
}));

import {
  AIAnalysisProgressFallback,
  RequestAIVerificationButton,
} from "@/app/(protected)/_components/shared/ai-verification";
import {
  PAUSED_POLL_MS,
  pollInterval,
  progressView,
} from "@/app/(protected)/_components/shared/ai-verification/progress-view";

/**
 * The durable progress of an AI analysis on the web (AI-6) and the button
 * that asks for one (AI-1).
 *
 * The box polled every 5 s and never looked at the status: an analysis that
 * ended while nobody heard the socket stayed "Analisando... 8 de 8 fotos"
 * forever. And the button was decided by the company's usage, which only
 * admins may read.
 */
const base = {
  unitsTotal: 8,
  unitsCompleted: 3,
  attempts: 1,
  availableAt: null,
  lastErrorCode: null,
  lastError: null,
  paused: false,
  aiEnabled: true,
  canRequest: true,
};

/** A reading the provider refused, as the API answers it now. */
const PAUSED = {
  paused: true,
  lastErrorCode: "AI_PROVIDER_PAUSED" as const,
  lastError:
    "O provedor de IA recusou o serviço; a leitura será retomada automaticamente.",
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.progress = [];
  api.calls = 0;
  router.refresh.mockClear();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  vi.useRealTimers();
});

async function render(element: React.ReactElement): Promise<HTMLElement> {
  const container = document.createElement("div");
  const root = createRoot(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () =>
    root.render(createElement(QueryClientProvider, { client }, element)),
  );
  unmounts.push(async () => act(async () => root.unmount()));

  await act(async () => {
    await new Promise((done) => setTimeout(done, 20));
  });

  return container;
}

describe("the progress box's words", () => {
  it("counts photos while the analysis runs", () => {
    expect(progressView({ ...base, status: "PROCESSING" })).toMatchObject({
      label: "Analisando... 3 de 8 fotos",
      terminal: false,
    });
  });

  it("says how it ended once it ended", () => {
    expect(progressView({ ...base, status: "COMPLETED" })).toMatchObject({
      terminal: true,
      tone: "done",
    });
    expect(progressView({ ...base, status: "FAILED" })).toMatchObject({
      label: "A análise não pôde ser concluída.",
      terminal: true,
      tone: "failed",
    });
    expect(progressView({ ...base, status: "SKIPPED" }).terminal).toBe(true);
  });

  // Red before: a request the provider refused (spend limit) is PENDING and
  // due, so it read "Analisando..." and was asked about every 5 s for hours.
  it("says the reading is paused when the provider refused service", () => {
    const paused = {
      ...base,
      ...PAUSED,
      status: "PENDING" as const,
      availableAt: new Date(Date.now() - 1_000).toISOString(),
    };

    expect(progressView(paused)).toMatchObject({
      label:
        "Leitura pausada: o provedor de IA recusou o serviço; será retomada automaticamente.",
      terminal: false,
      tone: "paused",
    });

    expect(pollInterval(paused)).toBe(PAUSED_POLL_MS);
    expect(pollInterval({ ...base, status: "PROCESSING" })).toBe(5_000);
    expect(pollInterval({ ...base, status: "COMPLETED" })).toBe(false);

    // Any other error on a waiting request is a retry, not a pause.
    expect(
      progressView({
        ...paused,
        paused: false,
        lastErrorCode: "AI_ANALYSIS_ERROR",
        lastError:
          "A última tentativa de leitura falhou; uma nova tentativa está agendada.",
      }).tone,
    ).toBe("running");
  });

  // Red before: the pause was read off the error text's prefix, so a request
  // queued during the outage — no error of its own, held by the circuit —
  // read "Analisando..." and was asked about every 5 s.
  it("follows the API's paused flag, not the error's wording", () => {
    const queuedBehind = {
      ...base,
      status: "PENDING" as const,
      availableAt: new Date(Date.now() - 1_000).toISOString(),
      paused: true,
      lastErrorCode: "AI_PROVIDER_PAUSED" as const,
      lastError:
        "O provedor de IA recusou o serviço; a leitura será retomada automaticamente.",
    };

    expect(progressView(queuedBehind).tone).toBe("paused");
    expect(pollInterval(queuedBehind)).toBe(PAUSED_POLL_MS);

    // The old raw marker, without the flag, is not a pause.
    expect(
      progressView({
        ...queuedBehind,
        paused: false,
        lastError: "AI_PROVIDER_PAUSED: limite de gasto do provedor atingido",
      }).tone,
    ).toBe("running");
  });

  it("says why an analysis was not done, in the API's words", () => {
    expect(
      progressView({
        ...base,
        status: "SKIPPED",
        lastErrorCode: "AI_QUOTA_EXCEEDED",
        lastError: "Limite de análises do período atingido.",
      }).label,
    ).toBe("Análise não realizada. Limite de análises do período atingido.");
  });

  it("says it waits for the next attempt, with what is already read", () => {
    const later = new Date(Date.now() + 60_000).toISOString();

    expect(
      progressView({ ...base, status: "PENDING", availableAt: later }).label,
    ).toBe("Aguardando nova tentativa (3/8 fotos analisadas)");
  });
});

describe("the durable progress box", () => {
  // Red before: no terminal handling — the label stayed "Analisando..." and
  // the poll went on every 5 seconds.
  it("stops asking and reloads the screen once the analysis ended", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    api.progress = [
      { ...base, status: "PROCESSING" },
      { ...base, status: "COMPLETED", unitsCompleted: 8 },
    ];

    const container = await render(
      createElement(AIAnalysisProgressFallback, {
        recordType: "fuel",
        recordId: "fuel-1",
      }),
    );

    expect(container.textContent).toContain("Analisando... 3 de 8 fotos");
    expect(router.refresh).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100);
    });

    expect(container.textContent).toContain("Análise concluída");
    expect(router.refresh).toHaveBeenCalledTimes(1);

    const callsAtTheEnd = api.calls;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(api.calls).toBe(callsAtTheEnd);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("a reading paused by the provider", () => {
  it("shows the pause and stops asking every 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    api.progress = [
      {
        ...base,
        ...PAUSED,
        status: "PENDING",
        availableAt: new Date(Date.now() - 1_000).toISOString(),
      },
    ];

    const container = await render(
      createElement(AIAnalysisProgressFallback, {
        recordType: "checklist",
        recordId: "chk-paused",
      }),
    );

    expect(container.textContent).toContain("Leitura pausada");

    const callsAfterFirst = api.calls;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(api.calls).toBe(callsAfterFirst);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe("the 'Verificar com IA' button", () => {
  it("is offered to whom the API says may ask", async () => {
    api.progress = [{ ...base, status: "none", canRequest: true }];

    const container = await render(
      createElement(RequestAIVerificationButton, {
        recordType: "checklist",
        recordId: "chk-1",
        isRetry: false,
      }),
    );

    expect(container.textContent).toContain("Verificar com IA");
  });

  // Red before: decided by get-ai-usage, which answers only admins.
  it("is not offered to a read-only profile, a driver or a company without AI", async () => {
    api.progress = [{ ...base, status: "none", canRequest: false }];

    const container = await render(
      createElement(RequestAIVerificationButton, {
        recordType: "checklist",
        recordId: "chk-2",
        isRetry: true,
      }),
    );

    expect(container.textContent).toBe("");
  });
});
