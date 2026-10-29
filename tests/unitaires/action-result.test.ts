import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

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
 * A Server Action called from a tab that outlived its build.
 *
 * After a deploy the action ids change. Next 14 answers an id it does not know
 * with the not-found page as HTML, and the client resolves the call with
 * `undefined` instead of throwing. Every screen that reads `result.success`
 * then threw a TypeError into its own `catch` and said "Erro inesperado" —
 * over and over, until somebody pressed F5, because nothing said that F5 was
 * the fix.
 *
 * The shared check recognises that answer and hands it to the deploy guard,
 * which already knows how to say "there is a new version, reload". A real
 * answer, success or failure, goes on exactly as before.
 */
const nav = vi.hoisted(() => ({ pathname: "/dashboard/profile" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const toast = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

const updateWhatsAppSettings = vi.hoisted(() => vi.fn());
vi.mock("@/actions/whatsapp/whatsapp-settings", () => ({
  updateWhatsAppSettings,
}));

import {
  STALE_BUILD_EVENT,
  guardFormAction,
  isStaleActionResult,
} from "@/lib/action-result";
import { DeploymentSkewGuard } from "@/components/shared/deployment-skew-guard";
import { useWhatsAppSettings } from "@/app/(protected)/_components/profile/notifications/whatsapp/whatsapp-settings/hooks";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const roots: Root[] = [];

async function render(element: React.ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const root = createRoot(host);
  roots.push(root);

  await act(async () => {
    root.render(element);
  });
}

const staleEvents = vi.fn();

beforeEach(() => {
  window.addEventListener(STALE_BUILD_EVENT, staleEvents);
});

afterEach(async () => {
  while (roots.length) {
    const root = roots.pop()!;
    await act(async () => root.unmount());
  }

  window.removeEventListener(STALE_BUILD_EVENT, staleEvents);
  vi.clearAllMocks();
});

describe("isStaleActionResult", () => {
  it("recognises the answer of an action the server no longer has, and says so once per call", () => {
    expect(isStaleActionResult(undefined)).toBe(true);
    expect(staleEvents).toHaveBeenCalledTimes(1);
  });

  it("treats an answer that is not an object as unusable too", () => {
    expect(isStaleActionResult("<!DOCTYPE html>")).toBe(true);
    expect(isStaleActionResult(404)).toBe(true);
    expect(staleEvents).toHaveBeenCalledTimes(2);
  });

  it("leaves every real answer alone, failures included", () => {
    expect(isStaleActionResult({ success: true, data: { id: "1" } })).toBe(
      false,
    );
    expect(
      isStaleActionResult({ success: false, message: "Sem permissão" }),
    ).toBe(false);
    expect(isStaleActionResult({})).toBe(false);
    expect(isStaleActionResult([])).toBe(false);

    // The initial state of several useFormState forms, never an answer the
    // framework makes up.
    expect(isStaleActionResult(null)).toBe(false);

    expect(staleEvents).not.toHaveBeenCalled();
  });
});

describe("guardFormAction, for useFormState", () => {
  /**
   * `useFormState` keeps whatever the action answers, and the create/update
   * forms read it during render (`state.createFuelError?.amount`). An
   * `undefined` there took the whole screen down into the error boundary.
   */
  const previous = { createFuelError: { amount: ["Obrigatório"] } };
  const form = new FormData();

  it("answers the previous state when the action is stale, so the form survives", async () => {
    const action = vi.fn(
      async (_state: unknown, _payload: FormData) => undefined,
    );

    await expect(guardFormAction(action)(previous, form)).resolves.toBe(
      previous,
    );
    expect(action).toHaveBeenCalledWith(previous, form);
    expect(staleEvents).toHaveBeenCalledTimes(1);
  });

  it("hands every real answer through untouched", async () => {
    const answer = { successMessage: "Abastecimento criado!" };
    const action = vi.fn(async (_state: unknown, _payload: FormData) => answer);

    await expect(guardFormAction(action)(previous, form)).resolves.toBe(answer);
    expect(staleEvents).not.toHaveBeenCalled();
  });

  it("wraps the closures the delete dialogs pass as well", async () => {
    const answer = { deleteFuelError: "Não encontrado" };

    // React calls it with (state, payload) whatever it declares.
    const asReact = (action: () => Promise<unknown>) =>
      guardFormAction(action) as unknown as (
        state: unknown,
        payload: FormData,
      ) => Promise<unknown>;

    await expect(asReact(async () => answer)(null, form)).resolves.toBe(answer);
    await expect(
      asReact(async () => undefined)(null, form),
    ).resolves.toBeNull();
  });
});

describe("the deploy guard, told by a stale action answer", () => {
  it("shows the new-version notice with the reload button", async () => {
    await render(createElement(DeploymentSkewGuard));

    await act(async () => {
      isStaleActionResult(undefined);
    });

    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info.mock.calls[0][0]).toContain("nova versão");
    expect(toast.info.mock.calls[0][1]).toMatchObject({
      id: "deployment-skew",
      action: { label: "Recarregar" },
    });
  });

  it("says it once for background reads, and again for what the person just did", async () => {
    await render(createElement(DeploymentSkewGuard));

    await act(async () => {
      isStaleActionResult(undefined, { background: true });
      isStaleActionResult(undefined, { background: true });
    });

    // A poll every few seconds must not keep raising a notice the person
    // closed.
    expect(toast.info).toHaveBeenCalledTimes(1);

    await act(async () => {
      isStaleActionResult(undefined);
    });

    expect(toast.info).toHaveBeenCalledTimes(2);
  });

  it("loads the next page in full instead of navigating inside the old build", async () => {
    const reload = vi.fn();
    const original = window.location;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, reload },
    });

    try {
      const Guard = () => createElement(DeploymentSkewGuard);

      await render(createElement(Guard));

      await act(async () => {
        isStaleActionResult(undefined);
      });

      expect(reload).not.toHaveBeenCalled();

      nav.pathname = "/dashboard/routes";
      await act(async () => {
        roots[0].render(createElement(Guard));
      });

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
      nav.pathname = "/dashboard/profile";
    }
  });
});

describe("a representative screen: the WhatsApp opt-in card", () => {
  let hook: ReturnType<typeof useWhatsAppSettings>;

  const Card = () => {
    hook = useWhatsAppSettings({
      initialSettings: { enabled: true, phoneNumber: "11987654321" } as never,
    });
    return null;
  };

  it("does not call a stale action an unexpected error, and hands it to the deploy guard", async () => {
    updateWhatsAppSettings.mockResolvedValueOnce(undefined);

    await render(createElement(Card));

    await act(async () => {
      await hook.handleToggleNotifications(false);
    });

    expect(toast.error).not.toHaveBeenCalled();
    expect(staleEvents).toHaveBeenCalledTimes(1);
    expect(hook.isUpdating).toBe(false);
  });

  it("keeps a real failure and a real success exactly as they were", async () => {
    updateWhatsAppSettings
      .mockResolvedValueOnce({ success: false, message: "Número bloqueado" })
      .mockResolvedValueOnce({
        success: true,
        data: { enabled: false, phoneNumber: "11987654321" },
      });

    await render(createElement(Card));

    await act(async () => {
      await hook.handleToggleNotifications(false);
    });

    expect(toast.error).toHaveBeenCalledWith("Número bloqueado");

    await act(async () => {
      await hook.handleToggleNotifications(false);
    });

    expect(toast.success).toHaveBeenCalledWith(
      "WhatsApp desabilitado com sucesso!",
    );
    expect(staleEvents).not.toHaveBeenCalled();
  });
});
