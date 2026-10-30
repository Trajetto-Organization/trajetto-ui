import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({
  loading: vi.fn(() => "toast-id"),
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));

import { useCepValidation } from "@/app/(protected)/_components/hooks";

/**
 * The CEP lookup of the company, branch, driver, supplier and delivery
 * forms asks ViaCEP from the browser. It had no time limit and react-query
 * retried it three times: when ViaCEP stopped answering (it happened to the
 * CI's runners on 29/10/2026), the CEP, city, UF and street fields and the
 * submit button stayed disabled for good, and nobody could finish the form
 * by typing the address. A lookup now gives up after a few seconds, retries
 * a dropped connection once, never retries a CEP ViaCEP does not know, and
 * hands the fields back to the person in every case.
 */
type Hook = ReturnType<typeof useCepValidation>;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function renderForm() {
  const result: { current: Hook | undefined } = { current: undefined };

  function Probe(): null {
    result.current = useCepValidation({ isOpen: true });
    return null;
  }

  const client = new QueryClient();

  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    ),
  );

  return result;
}

function addressFieldsDisabled(hook: Hook): Record<string, boolean> {
  return Object.fromEntries(
    hook.updatedFields
      .filter((field) => ["cep", "city", "uf", "street"].includes(field.name))
      .map((field) => [field.name, Boolean(field.disabled)]),
  );
}

async function typeCep(hook: { current: Hook | undefined }, cep: string) {
  await act(async () => hook.current!.handleFieldChange("cep", cep));
}

async function elapse(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** A ViaCEP that accepts the connection and never answers. */
function hangingFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
      }),
  );
}

const SE = {
  cep: "01001-000",
  localidade: "São Paulo",
  uf: "SP",
  logradouro: "Praça da Sé",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  toast.loading.mockClear();
  toast.success.mockClear();
  toast.error.mockClear();
  toast.dismiss.mockClear();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the CEP lookup when ViaCEP misbehaves", () => {
  it("gives the address fields and the submit back when ViaCEP never answers", async () => {
    const fetch = hangingFetch();
    vi.stubGlobal("fetch", fetch);
    const hook = renderForm();

    await typeCep(hook, "01001-000");
    expect(hook.current!.cepLoading).toBe(true);

    // The first try, one retry and the pause between them.
    await elapse(20_000);

    expect(hook.current!.cepLoading).toBe(false);
    expect(addressFieldsDisabled(hook.current!)).toEqual({
      cep: false,
      city: false,
      uf: false,
      street: false,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
    );
  });

  it("does not retry a CEP ViaCEP does not know, and says so", async () => {
    const fetch = vi.fn(async () => json({ erro: true }));
    vi.stubGlobal("fetch", fetch);
    const hook = renderForm();

    await typeCep(hook, "99999-999");
    await elapse(10_000);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(hook.current!.cepLoading).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      "CEP não encontrado. Preencha o endereço manualmente.",
    );
  });

  it("retries a dropped connection once and fills the address", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(SE));
    vi.stubGlobal("fetch", fetch);
    const hook = renderForm();

    await typeCep(hook, "01001-000");
    await elapse(5_000);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(hook.current!.cepLoading).toBe(false);
    expect(hook.current!.formValues).toMatchObject({
      city: "São Paulo",
      uf: "SP",
      street: "Praça da Sé",
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
