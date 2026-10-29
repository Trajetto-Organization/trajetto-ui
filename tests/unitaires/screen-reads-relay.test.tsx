import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, setLogger } from "react-query";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The screens' reads, off Next's Server Action queue.
 *
 * Next 14's router runs Server Actions one at a time, `router.refresh()`
 * included, and a navigation drops whatever is still queued with promises
 * that never settle. Some fifty reads were Server Actions used as
 * react-query `queryFn`s, so the reads a screen fired "together" ran as a
 * chain: Sistema asked for the providers' probes and then the metrics; every
 * protected page queued the tickets' counts, the alert sound and the socket
 * ticket on mount. They are relay GETs now (lib/relay-read): sent at once,
 * cancelled by react-query's signal, failing with a real status.
 *
 * Any call to a Server Action here fails the test: the read modules must not
 * reach for one.
 */
const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

const actionCalled = vi.hoisted(() => (name: string) => () => {
  throw new Error(`a screen read called the Server Action ${name}`);
});

vi.mock("@/actions/health/get-health-metrics", () => ({
  getHealthMetrics: actionCalled("getHealthMetrics"),
}));
vi.mock("@/actions/health/get-health-providers", () => ({
  getHealthProviders: actionCalled("getHealthProviders"),
}));

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import { SystemMetrics } from "@/features/system-metrics";
import { refreshSystemMetrics } from "@/features/system-metrics/reads";
import { ButtonRevalidation } from "@/app/(protected)/_components/overview-dashboard/revalidation-button";
import { fetchTicketsSummary } from "@/features/deliveries/chat/lib/chat-reads";
import { fetchOpsAlertSound } from "@/features/deliveries/ops-alert/sound-preference";
import { RelayReadError, relayAnswer } from "@/lib/relay-read";

import { refusal, stubRelay } from "./helpers/relay-fetch";

void React;

const SRC = resolve(__dirname, "../../src");

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  // Refusals below are the point; react-query need not print them.
  setLogger({
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  });
});

beforeEach(() => {
  localStorage.clear();
  router.refresh.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  client.clear();
  vi.unstubAllGlobals();
});

/** A relay answer the test releases by hand. */
function held<T>() {
  let release: (body: T) => void = () => undefined;
  const answer = new Promise<T>((done) => {
    release = done;
  });

  return { answer, release: (body: T) => release(body) };
}

const METRICS = {
  timestamp: "2026-10-28T12:00:00.000Z",
  database: {
    active_connections: 6,
    max_connections: 100,
    connection_usage_percent: 6,
  },
  outbox: { pending: 0, failed: 0, oldest_pending_seconds: null },
  ai_pipeline: { pending: 0, running: 0 },
};

const PROVIDERS = {
  checked_at: "2026-10-28T12:00:00.000Z",
  cached: true,
  providers: [],
};

describe("the Sistema tab", () => {
  it("asks for the providers and the metrics at once, through the relay", async () => {
    const providers = held<typeof PROVIDERS>();
    const metrics = held<typeof METRICS>();

    const relay = stubRelay({
      "/health/providers": () => providers.answer,
      "/health/metrics": () => metrics.answer,
    });

    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <SystemMetrics />
        </QueryClientProvider>,
      ),
    );

    // Neither has answered, and both are already out: as Server Actions
    // the metrics waited for the providers' probes to finish.
    expect(relay.calls.map((call) => call.path).sort()).toEqual([
      "/health/metrics",
      "/health/providers",
    ]);
    expect(relay.calls.every((call) => call.signal !== null)).toBe(true);

    await act(async () => {
      metrics.release(METRICS);
      providers.release(PROVIDERS);
      await new Promise((done) => setTimeout(done, 10));
    });

    expect(host.textContent).toContain("Pool desta réplica");
  });

  it("refreshes only its two reads on Atualizar, the probes past the cache", async () => {
    const relay = stubRelay({
      "/health/providers": () => PROVIDERS,
      "/health/metrics": () => METRICS,
    });

    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <SystemMetrics />
          <ButtonRevalidation
            rateLimit={{ storageKey: "screen-reads-relay", maxClicks: 3 }}
            onRevalidate={() => refreshSystemMetrics(client)}
          />
        </QueryClientProvider>,
      ),
    );

    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });

    const button = host.querySelector<HTMLButtonElement>(
      "button[data-revalidate]",
    );

    expect(button, "o botão Atualizar não foi renderizado").not.toBeNull();

    await act(async () => {
      button!.click();
      await new Promise((done) => setTimeout(done, 10));
    });

    // No re-render of the whole /admin page around the two cards.
    expect(router.refresh).not.toHaveBeenCalled();

    const providers = relay.callsTo("/health/providers");
    const metrics = relay.callsTo("/health/metrics");

    expect(providers).toHaveLength(2);
    expect(metrics).toHaveLength(2);
    expect(providers[0].query.has("refresh")).toBe(false);
    expect(providers[1].query.get("refresh")).toBe("true");
  });
});

describe("the reads every protected page makes on mount", () => {
  it("leave together: the tickets' counts do not wait for the sound switch", async () => {
    const summary = held<Record<string, number>>();
    const preferences = held<{ opsAlert: { sound: boolean } }>();

    const relay = stubRelay({
      "/chat/tickets/summary": () => summary.answer,
      "/notification/preferences": () => preferences.answer,
    });

    const counts = fetchTicketsSummary();
    const sound = fetchOpsAlertSound();

    // Both requests are on the wire before either answers.
    await vi.waitFor(() => expect(relay.calls).toHaveLength(2));

    preferences.release({ opsAlert: { sound: false } });
    summary.release({ open: 2, unreadOpen: 1 });

    await expect(sound).resolves.toBe(false);
    await expect(counts).resolves.toEqual({ open: 2, unreadOpen: 1 });
  });

  it("carry the API's status and code, so the client knows not to retry", async () => {
    stubRelay({
      "/chat/tickets/summary": () =>
        refusal(403, { code: "MODULE_NOT_ENABLED", message: "Sem módulo." }),
    });

    const failure = await fetchTicketsSummary().catch((error) => error);

    expect(failure).toBeInstanceOf(RelayReadError);
    expect(failure.status).toBe(403);
    expect(failure.code).toBe("MODULE_NOT_ENABLED");
    expect(failure.accessError?.kind).toBe("module-not-enabled");
  });

  it("answer an outage as a value where the caller reads one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const answer = await relayAnswer(
      fetchTicketsSummary(),
      "Não foi possível carregar.",
    );

    expect(answer).toMatchObject({
      success: false,
      status: null,
      message: "Houve um erro ao carregar o resumo dos atendimentos.",
    });
  });
});

/**
 * The converted reads, by file: none may go back to the action it replaced.
 * A read moved back into a Server Action would queue behind every other one
 * again, silently.
 */
describe("the converted screens", () => {
  const converted: Array<[string, RegExp]> = [
    ["features/system-metrics/index.tsx", /getHealthMetrics/],
    [
      "features/system-metrics/provider-readiness-card.tsx",
      /getHealthProviders/,
    ],
    ["features/deliveries/chat/lib/use-chat-unread.ts", /getTicketsSummary/],
    ["features/deliveries/ops-alert/ops-alert-balloon.tsx", /getOpsAlertSound/],
    [
      "features/deliveries/ops-alert/ops-alert-sound-setting.tsx",
      /getOpsAlertSound/,
    ],
    ["features/deliveries/message-templates/panel.tsx", /listMessageTemplates/],
    [
      "app/(protected)/_components/shared/limits/limits-content/hooks/index.ts",
      /getAIUsage|getBusinessEntitlements/,
    ],
    [
      "features/deliveries/chat/index.tsx",
      /\b(listTickets|getTicket|searchChatMessages)\b/,
    ],
    ["features/deliveries/chat/conversation.tsx", /\blistChatMessages\(/],
    [
      "features/deliveries/chat/tickets/ticket-header.tsx",
      /\b(getTicket|listTicketEvents|listTicketAssignees)\b/,
    ],
    [
      "features/deliveries/chat/lib/use-chat-recipients.ts",
      /listChatRecipients/,
    ],
    ["features/deliveries/monitoring/route-board.tsx", /getRouteMonitoring/],
    [
      "features/deliveries/occurrence-authorizations/queue.tsx",
      /listPendingAuthorizations|\blistTickets\b/,
    ],
    ["features/deliveries/proof-audits/panel.tsx", /listProofAudits/],
    ["hooks/use-delivery-detail.ts", /getDelivery\b/],
    ["hooks/use-occurrence-types.ts", /listOccurrenceTypes/],
    ["features/integrations/lib/queries.ts", /listApiKeys/],
  ];

  it.each(converted)("%s reads through the relay", (file, action) => {
    const source = readFileSync(resolve(SRC, file), "utf8");

    expect(source).not.toMatch(action);
  });
});
