import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const navigation = vi.hoisted(() => ({
  current: "",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(navigation.current),
  usePathname: () => "/admin/deliveries",
}));

/**
 * The pickers read through the same-origin relay (the page holds no token):
 * a request that still went straight to the API is a regression. Returns the
 * URL as the API will see it.
 */
function relayed(input: unknown): URL {
  const raw = String(input);

  if (!raw.startsWith("/api/relay/")) throw new Error(`not relayed: ${raw}`);

  const url = new URL(raw, "http://web.test");

  url.pathname = url.pathname.slice("/api/relay".length);

  return url;
}

import { queryClientProps } from "@/lib/query-client-props";
import { useBusinessSelector } from "@/app/(protected)/_components/shared/business-selector/hooks";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The MASTER switching company in the /admin selector (decision 2.6; CRIT-19).
 *
 * The switch only replaced `businessId` in the URL and kept the rest: page 3
 * of company A's deliveries, A's search text, and — on Entregas — A's open
 * driver conversation (`chatDriver`), now rendered under company B.
 */
const A = "018f0000-0000-7000-8000-00000000000a";
const B = "018f0000-0000-7000-8000-00000000000b";
const X = "018f0000-0000-7000-8000-0000000000ff";

type Company = { id: string; corporate_reason: string; cnpj: string };

const ALFA: Company = {
  id: A,
  corporate_reason: "Transportes Alfa",
  cnpj: "11222333000181",
};
const BETA: Company = {
  id: B,
  corporate_reason: "Logística Beta",
  cnpj: "44555666000199",
};
const XINGU: Company = {
  id: X,
  corporate_reason: "Xingu Cargas",
  cnpj: "77888999000155",
};

/**
 * The API as the selector meets it: `listed` is page 1 of the full list (the
 * newest companies), `server` is every company a search or a read by id can
 * reach. With ~3,600 tenants most companies are never on page 1.
 */
let listed: Company[] = [];
let server: Company[] = [];
let byIdAvailable = true;
let searchGate: Promise<void> | null = null;
const requests: URL[] = [];

function ndjsonResponse(lines: unknown[]) {
  const bytes = new TextEncoder().encode(
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
  );
  let sent = false;

  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: bytes };
        },
      }),
    },
  };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  seedPublicConfig({ apiUrl: "http://api.test" });
});

beforeEach(() => {
  navigation.push.mockClear();
  requests.length = 0;
  listed = [ALFA, BETA];
  server = [ALFA, BETA];
  byIdAvailable = true;
  searchGate = null;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = relayed(input);
      requests.push(url);

      const byId = url.pathname.match(/^\/business\/get-ai-usage\/(.+)$/);

      if (byId) {
        const company = server.find(
          (row) => row.id === decodeURIComponent(byId[1]),
        );

        if (!byIdAvailable || !company) {
          return jsonResponse(400, { message: "Empresa não encontrada!" });
        }

        return jsonResponse(200, {
          data: {
            id: company.id,
            corporate_reason: company.corporate_reason,
            fantasy_name: null,
          },
        });
      }

      const term = url.searchParams.get("search");

      if (term && searchGate) await searchGate;

      // The API matches razão social, fantasia, CNPJ and e-mail.
      const rows = term
        ? server.filter(
            (company) =>
              company.cnpj.includes(term) ||
              company.corporate_reason.includes(term),
          )
        : listed;

      return ndjsonResponse([
        {
          meta: {
            searchMeta: {
              nextCursor: null,
              hasMore: !term && listed.length < server.length,
            },
          },
        },
        ...rows,
      ]);
    }),
  );
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

let selector: ReturnType<typeof useBusinessSelector>;

/** Mounts the selector; `navigate` re-renders it as the page does when the URL lands. */
async function mountSelector(
  currentBusinessId: string,
): Promise<{ navigate: (id: string) => Promise<void> }> {
  const Probe = ({ id }: { id: string }) => {
    selector = useBusinessSelector({ currentBusinessId: id });
    return null;
  };

  const root = createRoot(document.createElement("div"));

  const render = async (id: string) => {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(Probe, { id }),
        ),
      );
    });
  };

  await render(currentBusinessId);

  unmounts.push(async () => act(async () => root.unmount()));

  return {
    navigate: async (id: string) => {
      navigation.current = `businessId=${id}`;
      await render(id);
    },
  };
}

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function wait(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

const byIdReads = () =>
  requests.filter((url) => url.pathname.startsWith("/business/get-ai-usage/"));

describe("switching company", () => {
  it("starts the screen over: no page, search, filter or open conversation of the old one", async () => {
    navigation.current = new URLSearchParams({
      businessId: A,
      tab: "chat",
      page: "3",
      search: "joão",
      status: "FAILED",
      chatDriver: "driver-of-a",
      chatDriverName: "João",
      chatDelivery: "delivery-of-a",
      pageSize: "50",
      view: "table",
      period: "30d",
    }).toString();

    await mountSelector(A);

    await act(async () => selector.handleBusinessChange(B));

    expect(navigation.push).toHaveBeenCalledTimes(1);

    const next = new URLSearchParams(
      String(navigation.push.mock.calls[0][0]).replace(/^\?/, ""),
    );

    expect(Object.fromEntries(next)).toEqual({
      businessId: B,
      // Where the person is and how they like to see it stay.
      tab: "chat",
      pageSize: "50",
      view: "table",
      period: "30d",
    });
  });

  it("keeps a custom period's days, so it does not fall back to today", async () => {
    // A custom period is three params: kept without its days,
    // `period=custom` alone read as an invalid range and opened on today.
    navigation.current = new URLSearchParams({
      businessId: A,
      tab: "deliveries",
      period: "custom",
      from: "2026-10-01",
      to: "2026-10-15",
      page: "2",
    }).toString();

    await mountSelector(A);
    await act(async () => selector.handleBusinessChange(B));

    const next = new URLSearchParams(
      String(navigation.push.mock.calls[0][0]).replace(/^\?/, ""),
    );

    expect(Object.fromEntries(next)).toEqual({
      businessId: B,
      tab: "deliveries",
      period: "custom",
      from: "2026-10-01",
      to: "2026-10-15",
    });
  });

  it("drops stray days that do not belong to a custom period", async () => {
    navigation.current = new URLSearchParams({
      businessId: A,
      period: "7d",
      from: "2026-10-01",
      to: "2026-10-15",
    }).toString();

    await mountSelector(A);
    await act(async () => selector.handleBusinessChange(B));

    const next = new URLSearchParams(
      String(navigation.push.mock.calls[0][0]).replace(/^\?/, ""),
    );

    expect(Object.fromEntries(next)).toEqual({ businessId: B, period: "7d" });
  });

  it("does nothing when the same company is picked again", async () => {
    navigation.current = `businessId=${A}&page=2`;

    await mountSelector(A);
    await act(async () => selector.handleBusinessChange(A));

    expect(navigation.push).not.toHaveBeenCalled();
  });
});

describe("searching companies", () => {
  it("asks the API, and shows its answer even when the match is not in the name", async () => {
    navigation.current = "";
    await mountSelector(A);

    expect(await until(() => selector.filteredBusiness.length === 2)).toBe(
      true,
    );

    // A CNPJ typed into the box: nothing in the loaded names contains it.
    await act(async () => selector.setSearchValue("44555666"));

    expect(
      await until(() =>
        requests.some((url) => url.searchParams.get("search") === "44555666"),
      ),
      "a busca não foi enviada para a API",
    ).toBe(true);

    expect(
      await until(
        () =>
          selector.filteredBusiness.map((company) => company.id).join() === B,
      ),
      "a empresa encontrada pelo CNPJ foi escondida pelo filtro local",
    ).toBe(true);
  });

  /**
   * While the term was on its way the loaded rows were narrowed by name
   * only: a CNPJ matched nothing, and the popover said "Nenhuma empresa
   * encontrada." for the debounce plus the request, then showed the match.
   */
  async function holdSearchAnswers(): Promise<() => void> {
    navigation.current = `businessId=${A}`;
    await mountSelector(A);

    expect(await until(() => selector.filteredBusiness.length === 2)).toBe(
      true,
    );

    let release!: () => void;
    searchGate = new Promise<void>((done) => {
      release = done;
    });

    return () => release();
  }

  it("while the answer is in flight, keeps on screen a loaded company typed by CNPJ", async () => {
    const release = await holdSearchAnswers();

    await act(async () => selector.setSearchValue("44555666"));

    expect(
      await until(() =>
        requests.some((url) => url.searchParams.get("search") === "44555666"),
      ),
    ).toBe(true);

    // Debounced and sent, answer held: B is already loaded, so it stays.
    expect(
      selector.filteredBusiness.map((company) => company.id),
      "a empresa carregada sumiu enquanto a busca pelo CNPJ estava em voo",
    ).toEqual([B]);

    await act(async () => release());
  });

  it("says the search is pending while nothing loaded matches yet, so an empty list is not 'not found'", async () => {
    const release = await holdSearchAnswers();

    expect(selector.isSearchPending).toBe(false);

    // A CNPJ of a company nobody loaded: nothing to narrow to yet.
    await act(async () => selector.setSearchValue("77888999"));

    expect(selector.filteredBusiness).toEqual([]);
    expect(
      selector.isSearchPending,
      "lista vazia com busca pendente viraria 'nenhuma encontrada'",
    ).toBe(true);

    expect(
      await until(() =>
        requests.some((url) => url.searchParams.get("search") === "77888999"),
      ),
    ).toBe(true);
    expect(selector.isSearchPending, "a busca em voo não foi sinalizada").toBe(
      true,
    );

    await act(async () => release());
  });

  it("stops saying pending once the server answered the term, even with no match", async () => {
    navigation.current = `businessId=${A}`;
    await mountSelector(A);

    expect(await until(() => selector.filteredBusiness.length === 2)).toBe(
      true,
    );

    await act(async () => selector.setSearchValue("00000000"));

    expect(await until(() => !selector.isSearchPending)).toBe(true);
    expect(selector.filteredBusiness).toEqual([]);
  });
});

describe("the company in use while searching", () => {
  /**
   * The list became the server's answer to the typed term, and the label was
   * looked up in that list: typing company B's CNPJ while on A turned the
   * trigger into "Selecione uma empresa" with A's data still on the page, and
   * it stayed that way after Esc because the term outlived the popover.
   */
  it("keeps naming the current company while another one is searched, and after closing without choosing", async () => {
    navigation.current = `businessId=${A}`;
    await mountSelector(A);

    expect(await until(() => selector.selectedBusiness?.id === A)).toBe(true);

    await act(async () => selector.setOpen(true));
    await act(async () => selector.setSearchValue("44555666"));

    expect(
      await until(
        () =>
          selector.filteredBusiness.map((company) => company.id).join() === B,
      ),
    ).toBe(true);

    expect(
      selector.selectedBusiness?.id,
      "o rótulo trocou para o placeholder durante a busca",
    ).toBe(A);

    // Esc or a click outside: the popover closes without a choice.
    await act(async () => selector.setOpen(false));

    expect(selector.searchValue).toBe("");
    expect(
      selector.selectedBusiness?.id,
      "o rótulo ficou no placeholder depois de fechar",
    ).toBe(A);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("does not carry the old company's label over to a company nobody can name", async () => {
    navigation.current = `businessId=${A}`;
    await mountSelector(A);

    expect(await until(() => selector.selectedBusiness?.id === A)).toBe(true);

    // The URL moved to a company neither the list nor the API knows.
    const C = "018f0000-0000-7000-8000-00000000000c";
    await unmounts.pop()!();
    await mountSelector(C);

    expect(await until(() => byIdReads().length === 1)).toBe(true);
    await wait(50);

    expect(selector.selectedBusiness ?? null).toBeNull();
  });
});

describe("a company found only through the search", () => {
  beforeEach(() => {
    // X is company #500: the search reaches it, page 1 never shows it.
    listed = [ALFA, BETA];
    server = [ALFA, BETA, XINGU];
  });

  async function pickXThroughTheSearch(): Promise<{
    navigate: (id: string) => Promise<void>;
  }> {
    navigation.current = `businessId=${A}`;
    const view = await mountSelector(A);

    expect(await until(() => selector.selectedBusiness?.id === A)).toBe(true);

    await act(async () => selector.setOpen(true));
    await act(async () => selector.setSearchValue("77888999"));

    expect(
      await until(
        () =>
          selector.filteredBusiness.map((company) => company.id).join() === X,
      ),
    ).toBe(true);

    await act(async () => selector.handleBusinessChange(X));
    expect(navigation.push).toHaveBeenCalledTimes(1);

    return view;
  }

  /**
   * Picking cleared the term; 300 ms later the list was page 1 again, without
   * X, and the label was looked up there. Only a navigation faster than the
   * debounce kept the name — never the case on the /admin pages.
   */
  it("keeps its name when the navigation lands after the list went back to page 1", async () => {
    // The pick itself must carry the name, not a later read.
    byIdAvailable = false;

    const view = await pickXThroughTheSearch();

    // Past the debounce: the list is page 1 again.
    await wait(600);
    expect(
      selector.filteredBusiness.map((company) => company.id),
    ).not.toContain(X);

    await view.navigate(X);
    await wait(100);

    expect(
      selector.selectedBusiness?.id,
      "o rótulo caiu no placeholder depois de escolher pela busca",
    ).toBe(X);
    expect(selector.selectedBusiness?.corporate_reason).toBe("Xingu Cargas");
  });

  it("keeps its name when the selector remounts (another branch of the page)", async () => {
    byIdAvailable = false;

    await pickXThroughTheSearch();
    await wait(400);

    await unmounts.pop()!();
    navigation.current = `businessId=${X}`;
    await mountSelector(X);
    await wait(100);

    expect(selector.selectedBusiness?.corporate_reason).toBe("Xingu Cargas");
  });

  it("is named on a page opened straight on it (link or F5), by reading the company by id", async () => {
    navigation.current = `businessId=${X}`;
    await mountSelector(X);

    expect(
      await until(() => selector.selectedBusiness?.id === X),
      "página aberta direto numa empresa fora da página 1 ficou sem nome",
    ).toBe(true);

    expect(selector.selectedBusiness?.corporate_reason).toBe("Xingu Cargas");
    expect(byIdReads().map((url) => url.pathname)).toEqual([
      `/business/get-ai-usage/${X}`,
    ]);
  });

  it("does not read by id a company the list already shows", async () => {
    navigation.current = `businessId=${B}`;
    await mountSelector(B);

    expect(await until(() => selector.selectedBusiness?.id === B)).toBe(true);
    await wait(50);

    expect(byIdReads()).toEqual([]);
  });
});
