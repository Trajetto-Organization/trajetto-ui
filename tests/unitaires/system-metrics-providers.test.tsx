import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
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

// Puts React in scope for the classic-runtime JSX of the modules below.
import { React } from "./helpers/render-html";

import type { ProviderReadiness } from "@/actions/health/get-health-providers";
import type { ProviderChannelMetrics } from "@/actions/health/get-health-metrics";
import { ProviderReadinessCard } from "@/features/system-metrics/provider-readiness-card";
import { refreshSystemMetrics } from "@/features/system-metrics/reads";

import { refusal, stubRelay } from "./helpers/relay-fetch";
import {
  providerChannelStatus,
  readinessBadge,
  readinessSummary,
  redisStatus,
  worstStatus,
} from "@/features/system-metrics/rules";

void React;

/**
 * The MASTER's Sistema tab, contract §32/§33: provider latency and error rate
 * per channel, Redis, and whether each provider is configured and answering —
 * so "just set the env vars" is verified on the screen, not by the first
 * failed WhatsApp.
 */

function channel(
  fields: Partial<ProviderChannelMetrics>,
): ProviderChannelMetrics {
  return {
    channel: "WHATSAPP",
    calls: 0,
    errors: 0,
    error_rate: null,
    latency_p50_ms: null,
    latency_p95_ms: null,
    latency_max_ms: null,
    total_calls: 0,
    total_errors: 0,
    last_error_at: null,
    last_error_kind: null,
    ...fields,
  };
}

function provider(fields: Partial<ProviderReadiness>): ProviderReadiness {
  return {
    key: "email",
    label: "E-mail (Resend)",
    status: "ok",
    configured: true,
    reachable: true,
    latency_ms: 120,
    missing_env: [],
    message: "Chave aceita.",
    warnings: [],
    details: {},
    ...fields,
  };
}

describe("providerChannelStatus", () => {
  it("is calm without calls: unknown is not failing", () => {
    expect(providerChannelStatus(channel({}))).toEqual({
      label: "Sem chamadas",
      tone: "green",
    });
  });

  it("is red when a fifth of the calls fail", () => {
    expect(
      providerChannelStatus(channel({ calls: 10, errors: 2, error_rate: 0.2 }))
        .tone,
    ).toBe("red");
  });

  it("does not page on one failure in three calls, but does when all of them fail", () => {
    expect(
      providerChannelStatus(channel({ calls: 3, errors: 1, error_rate: 0.333 }))
        .tone,
    ).toBe("yellow");
    expect(
      providerChannelStatus(channel({ calls: 3, errors: 3, error_rate: 1 }))
        .tone,
    ).toBe("red");
  });

  it("is yellow when the p95 eats the pipeline's budget", () => {
    expect(
      providerChannelStatus(
        channel({ calls: 50, errors: 0, error_rate: 0, latency_p95_ms: 7_000 }),
      ).tone,
    ).toBe("yellow");
  });
});

describe("worstStatus", () => {
  it("picks red over yellow over green, and null for nothing", () => {
    expect(worstStatus([])).toBeNull();
    expect(
      worstStatus([
        { label: "Normal", tone: "green" },
        { label: "Atenção", tone: "yellow" },
        { label: "Falhando", tone: "red" },
      ])?.tone,
    ).toBe("red");
    expect(worstStatus([{ label: "Sem chamadas", tone: "green" }])).toEqual({
      label: "Normal",
      tone: "green",
    });
  });
});

describe("redisStatus", () => {
  const up = {
    status: "up" as const,
    latency_ms: 1,
    used_memory_mb: 10,
    maxmemory_mb: 256,
    connected_clients: 4,
    blocked_clients: 0,
    rejected_connections: 0,
    evicted_keys: 0,
    uptime_seconds: 60,
  };

  it("reads an older API (no redis) as unknown", () => {
    expect(redisStatus(undefined)).toBeNull();
  });

  it("is red when down and yellow when evicting keys or near the ceiling", () => {
    expect(redisStatus({ ...up, status: "down" })?.tone).toBe("red");
    expect(redisStatus({ ...up, evicted_keys: 3 })?.tone).toBe("yellow");
    expect(redisStatus({ ...up, used_memory_mb: 230 })?.label).toBe(
      "Memória alta",
    );
    expect(redisStatus(up)).toEqual({ label: "Saudável", tone: "green" });
  });
});

describe("readiness badges", () => {
  it("treats an unset provider as a problem and a deliberately off one as fine", () => {
    expect(readinessBadge("not_configured").tone).toBe("red");
    expect(readinessBadge("disabled")).toEqual({
      label: "Desligado",
      tone: "green",
    });
    expect(readinessBadge("warning").tone).toBe("yellow");
  });

  it("summarises by the worst provider", () => {
    expect(readinessSummary(undefined)).toBeNull();
    expect(
      readinessSummary([
        provider({}),
        provider({ key: "whatsapp", status: "not_configured" }),
        provider({ key: "storage", status: "error" }),
      ]),
    ).toEqual({ label: "2 com problema", tone: "red" });
    expect(
      readinessSummary([provider({}), provider({ status: "warning" })])?.tone,
    ).toBe("yellow");
  });
});

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
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

/** Renders the card and lets its relay read land. */
async function renderCard(): Promise<void> {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <ProviderReadinessCard />
      </QueryClientProvider>,
    ),
  );

  await act(async () => {
    await new Promise((done) => setTimeout(done, 10));
  });
}

describe("ProviderReadinessCard", () => {
  it("shows each provider, the missing variables by name, and the summary", async () => {
    const relay = stubRelay({
      "/health/providers": () => ({
        checked_at: "2026-10-07T12:00:00.000Z",
        cached: false,
        providers: [
          provider({}),
          provider({
            key: "whatsapp",
            label: "WhatsApp (Meta)",
            status: "not_configured",
            configured: false,
            reachable: null,
            latency_ms: null,
            missing_env: ["META_WHATSAPP_ACCESS_TOKEN"],
            message: "Nenhum WhatsApp sai.",
          }),
        ],
      }),
    });

    await renderCard();

    // The first read takes the API's cache.
    const [first] = relay.callsTo("/health/providers");

    expect(first?.query.has("refresh")).toBe(false);

    const text = host.textContent ?? "";

    expect(text).toContain("E-mail (Resend)");
    expect(text).toContain("WhatsApp (Meta)");
    expect(text).toContain("Não configurado");
    expect(text).toContain("META_WHATSAPP_ACCESS_TOKEN");
    expect(text).toContain("1 com problema");
  });

  it("probes again, past the cache, on Atualizar", async () => {
    const relay = stubRelay({
      "/health/providers": () => ({
        checked_at: "2026-10-07T12:00:00.000Z",
        cached: true,
        providers: [provider({})],
      }),
    });

    await renderCard();
    await act(async () => {
      await refreshSystemMetrics(client);
    });

    const reads = relay.callsTo("/health/providers");

    expect(reads).toHaveLength(2);
    expect(reads[1].query.get("refresh")).toBe("true");
  });

  it("says why when the API refuses", async () => {
    stubRelay({
      "/health/providers": () =>
        refusal(403, {
          code: "AUTH_ROLE_FORBIDDEN",
          message: "Acesso negado.",
        }),
    });

    await renderCard();

    expect(host.textContent).toContain("Acesso negado.");
  });
});
