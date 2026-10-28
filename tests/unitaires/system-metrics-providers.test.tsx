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
  PROVIDER_RECHECK_MS,
  hasTransientProvider,
  probeNote,
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

/**
 * §12: loading, not verified, operational, unstable and a confirmed error
 * read differently, and none of them is shown as another.
 */
describe("readiness states", () => {
  it("tells an unstable provider from a standing caveat", () => {
    expect(readinessBadge(provider({ status: "ok" }))).toEqual({
      label: "Operacional",
      tone: "green",
    });
    expect(
      readinessBadge(provider({ status: "warning", transient: true })),
    ).toEqual({ label: "Instável", tone: "yellow" });
    expect(readinessBadge(provider({ status: "warning" }))).toEqual({
      label: "Atenção",
      tone: "yellow",
    });
  });

  it("never softens an error the API confirmed, transient or not", () => {
    for (const transient of [true, false, undefined]) {
      expect(readinessBadge(provider({ status: "error", transient }))).toEqual({
        label: "Com erro",
        tone: "red",
      });
    }
  });

  it("reads a status it does not know as not verified: neither red nor green", () => {
    const unknown = provider({
      status: "degraded" as unknown as ProviderReadiness["status"],
    });

    expect(readinessBadge(unknown)).toEqual({
      label: "Não verificado",
      tone: "gray",
    });
    expect(readinessSummary([provider({}), unknown])).toEqual({
      label: "Não verificado",
      tone: "gray",
    });
  });

  it("does not count an unstable provider as a problem", () => {
    expect(
      readinessSummary([
        provider({}),
        provider({ key: "storage", status: "warning", transient: true }),
      ]),
    ).toEqual({ label: "1 instável", tone: "yellow" });
    expect(
      readinessSummary([
        provider({ status: "warning", transient: true }),
        provider({ key: "storage", status: "warning", transient: true }),
      ]),
    ).toEqual({ label: "2 instáveis", tone: "yellow" });
    expect(
      readinessSummary([
        provider({ status: "warning", transient: true }),
        provider({ key: "storage", status: "error", transient: true }),
      ]),
    ).toEqual({ label: "1 com problema", tone: "red" });
    expect(readinessSummary([provider({}), provider({ key: "push" })])).toEqual(
      { label: "Todos operacionais", tone: "green" },
    );
  });

  it("says how the verdict was reached, in words", () => {
    expect(probeNote(provider({ attempts: 2, failure_kind: "timeout" }))).toBe(
      "2 tentativas · última falha: tempo esgotado",
    );
    expect(
      probeNote(provider({ attempts: 1, failure_kind: "throttled" })),
    ).toBe("1 tentativa · última falha: limite de chamadas (429)");
    // A clean first answer, nothing probed, and an older API say nothing.
    expect(probeNote(provider({ attempts: 1, failure_kind: null }))).toBeNull();
    expect(probeNote(provider({ attempts: 0 }))).toBeNull();
    expect(probeNote(provider({}))).toBeNull();
  });

  it("asks for a recheck only when some verdict may change", () => {
    expect(hasTransientProvider(undefined)).toBe(false);
    expect(hasTransientProvider({ providers: [provider({})] })).toBe(false);
    expect(
      hasTransientProvider({
        providers: [provider({}), provider({ transient: true })],
      }),
    ).toBe(true);
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
  vi.useRealTimers();
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

  it("says it is checking while the first read is out", async () => {
    stubRelay({ "/health/providers": () => new Promise(() => {}) });

    await renderCard();

    expect(host.textContent).toContain("Verificando…");
    expect(host.textContent).not.toContain("Com erro");
  });
});

/** A report whose R2 answered only on the second attempt. */
const UNSTABLE = {
  checked_at: "2026-10-07T12:00:00.000Z",
  cached: false,
  providers: [
    provider({}),
    provider({
      key: "storage",
      label: "Armazenamento (R2)",
      status: "warning",
      transient: true,
      attempts: 2,
      failure_kind: "timeout",
      message: "Bucket acessível com a credencial configurada.",
      warnings: ["A 1ª tentativa falhou (tempo esgotado); a 2ª respondeu."],
    }),
  ],
};

const RECOVERED = {
  checked_at: "2026-10-07T12:00:10.000Z",
  cached: false,
  providers: [
    provider({}),
    provider({
      key: "storage",
      label: "Armazenamento (R2)",
      attempts: 1,
      transient: false,
      failure_kind: null,
      message: "Bucket acessível com a credencial configurada.",
    }),
  ],
};

/** The R2 row's text. */
function storageRow(): string {
  const row = Array.from(host.querySelectorAll("li")).find((item) =>
    item.textContent?.includes("Armazenamento (R2)"),
  );

  return row?.textContent ?? "";
}

describe("ProviderReadinessCard, unstable providers (§12)", () => {
  /** Answers each read with the next reply; the last one repeats. */
  function replies(...answers: unknown[]) {
    let call = 0;

    return () => answers[Math.min(call++, answers.length - 1)];
  }

  async function renderWithFakeTimers(): Promise<void> {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <ProviderReadinessCard />
        </QueryClientProvider>,
      ),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }

  async function wait(ms: number): Promise<void> {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it("shows an unstable provider as Instável, with its attempts in words", async () => {
    stubRelay({ "/health/providers": () => UNSTABLE });

    await renderCard();

    expect(storageRow()).toContain("Instável");
    expect(storageRow()).toContain(
      "2 tentativas · última falha: tempo esgotado",
    );
    expect(storageRow()).not.toContain("Com erro");
    expect(host.textContent).toContain("1 instável");
  });

  it("reads once more by itself after a transient result, then shows the recovery", async () => {
    const relay = stubRelay({
      "/health/providers": replies(UNSTABLE, RECOVERED),
    });

    await renderWithFakeTimers();

    expect(relay.callsTo("/health/providers")).toHaveLength(1);
    expect(host.textContent).toContain("nova verificação automática");

    await wait(PROVIDER_RECHECK_MS - 20);
    expect(relay.callsTo("/health/providers")).toHaveLength(1);

    await wait(20);

    const reads = relay.callsTo("/health/providers");

    expect(reads).toHaveLength(2);
    // A plain read: the API's short copy of a transient report has expired.
    expect(reads[1].query.has("refresh")).toBe(false);
    expect(storageRow()).toContain("Operacional");
    expect(storageRow()).not.toContain("Instável");
    expect(host.textContent).toContain("Todos operacionais");
    expect(host.textContent).not.toContain("nova verificação automática");

    // Nothing transient any more: no further read.
    await wait(PROVIDER_RECHECK_MS * 5);
    expect(relay.callsTo("/health/providers")).toHaveLength(2);
  });

  it("does not loop when the provider stays unstable", async () => {
    const relay = stubRelay({ "/health/providers": () => UNSTABLE });

    await renderWithFakeTimers();
    await wait(PROVIDER_RECHECK_MS * 6);

    expect(relay.callsTo("/health/providers")).toHaveLength(2);
    expect(storageRow()).toContain("Instável");
  });

  it("keeps a confirmed error red through its one recheck", async () => {
    const down = {
      ...UNSTABLE,
      providers: [
        provider({
          key: "storage",
          label: "Armazenamento (R2)",
          status: "error",
          reachable: false,
          latency_ms: null,
          transient: true,
          attempts: 2,
          failure_kind: "timeout",
          message: "O R2 não respondeu (2 tentativas de até 3,5 s).",
        }),
      ],
    };
    const relay = stubRelay({ "/health/providers": () => down });

    await renderWithFakeTimers();
    await wait(PROVIDER_RECHECK_MS);

    expect(relay.callsTo("/health/providers")).toHaveLength(2);
    expect(storageRow()).toContain("Com erro");
    expect(host.textContent).toContain("1 com problema");
  });

  it("keeps the last verdict and says it may be stale when a read fails", async () => {
    stubRelay({
      "/health/providers": replies(
        UNSTABLE,
        refusal(503, {
          code: "UPSTREAM_UNAVAILABLE",
          message: "API indisponível.",
        }),
      ),
    });

    await renderWithFakeTimers();
    await wait(PROVIDER_RECHECK_MS);

    const text = host.textContent ?? "";

    expect(storageRow()).toContain("Instável");
    expect(text).toContain("Não foi possível atualizar agora");
    expect(text).toContain("(API indisponível). Exibindo a verificação de");
    expect(text).toContain("pode estar desatualizada");
  });

  it("Atualizar while the automatic re-read is out cancels it and probes past the cache", async () => {
    /*
      react-query hands a refetch the fetch already running: the press used
      to join the automatic re-read, so no refresh=true went out and the
      result was taken as the automatic one (no recheck after it).
    */
    let call = 0;
    const relay = stubRelay({
      "/health/providers": () => {
        call += 1;

        if (call === 1) return UNSTABLE;
        // The automatic re-read, still out when the person presses.
        if (call === 2) return new Promise(() => {});
        if (call === 3) return UNSTABLE;

        return RECOVERED;
      },
    });

    await renderWithFakeTimers();
    await wait(PROVIDER_RECHECK_MS);

    expect(relay.callsTo("/health/providers")).toHaveLength(2);

    await act(async () => {
      await refreshSystemMetrics(client);
    });
    await wait(10);

    const reads = relay.callsTo("/health/providers");

    expect(reads).toHaveLength(3);
    expect(reads[1].query.has("refresh")).toBe(false);
    expect(reads[1].signal?.aborted).toBe(true);
    expect(reads[2].query.get("refresh")).toBe("true");

    // The person's result is judged on its own: still unstable, so it gets
    // its one automatic re-read — and that one is the last.
    expect(host.textContent).toContain("nova verificação automática");

    await wait(PROVIDER_RECHECK_MS);

    const after = relay.callsTo("/health/providers");

    expect(after).toHaveLength(4);
    expect(after[3].query.has("refresh")).toBe(false);
    expect(storageRow()).toContain("Operacional");

    await wait(PROVIDER_RECHECK_MS * 5);
    expect(relay.callsTo("/health/providers")).toHaveLength(4);
  });

  it("skips the automatic re-read that falls due while Atualizar is out", async () => {
    let release: (reply: unknown) => void = () => {};
    let call = 0;
    const relay = stubRelay({
      "/health/providers": () => {
        call += 1;

        if (call === 1) return UNSTABLE;
        if (call === 2)
          return new Promise((done) => {
            release = done;
          });

        return RECOVERED;
      },
    });

    await renderWithFakeTimers();
    await wait(PROVIDER_RECHECK_MS - 1_000);

    let pressed: Promise<void> = Promise.resolve();

    await act(async () => {
      pressed = refreshSystemMetrics(client);
    });

    expect(relay.callsTo("/health/providers")[1].query.get("refresh")).toBe(
      "true",
    );

    // The re-read's time comes while the person's probe is out.
    await wait(1_010);
    expect(relay.callsTo("/health/providers")).toHaveLength(2);

    await act(async () => {
      release(UNSTABLE);
      await pressed;
    });
    await wait(10);

    // Still unstable: the person's result gets its own automatic re-read.
    expect(host.textContent).toContain("nova verificação automática");

    await wait(PROVIDER_RECHECK_MS);

    const reads = relay.callsTo("/health/providers");

    expect(reads).toHaveLength(3);
    expect(reads[2].query.has("refresh")).toBe(false);
    expect(storageRow()).toContain("Operacional");

    await wait(PROVIDER_RECHECK_MS * 5);
    expect(relay.callsTo("/health/providers")).toHaveLength(3);
  });

  it("joins an Atualizar already out instead of probing twice", async () => {
    let release: (reply: unknown) => void = () => {};
    let call = 0;
    const relay = stubRelay({
      "/health/providers": () => {
        call += 1;

        if (call === 2)
          return new Promise((done) => {
            release = done;
          });

        return RECOVERED;
      },
    });

    await renderCard();

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();

    await act(async () => {
      first = refreshSystemMetrics(client);
      second = refreshSystemMetrics(client);
    });

    expect(relay.callsTo("/health/providers")).toHaveLength(2);

    await act(async () => {
      release(RECOVERED);
      await Promise.all([first, second]);
    });

    // A press after it landed is a new probe.
    await act(async () => {
      await refreshSystemMetrics(client);
    });

    const reads = relay.callsTo("/health/providers");

    expect(reads).toHaveLength(3);
    expect(reads[1].query.get("refresh")).toBe("true");
    expect(reads[2].query.get("refresh")).toBe("true");
  });

  it("keeps the rows when Atualizar is refused after a good read", async () => {
    stubRelay({
      "/health/providers": replies(
        RECOVERED,
        refusal(429, { code: "RATE_LIMITED", message: "Muitas leituras." }),
      ),
    });

    await renderCard();
    await act(async () => {
      await refreshSystemMetrics(client);
    });

    const text = host.textContent ?? "";

    expect(storageRow()).toContain("Operacional");
    expect(text).toContain(
      "Não foi possível atualizar agora (Muitas leituras). Exibindo",
    );
  });
});
