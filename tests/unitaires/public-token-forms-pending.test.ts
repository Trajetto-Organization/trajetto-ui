import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The public token forms follow the app's pending pattern (decision 16.64):
 * once sent, the field and the button are disabled, the button spins and says
 * what it is doing, and the form is aria-busy until the answer arrives.
 *
 * /verificar stays a plain GET form (it must work without JavaScript), so the
 * code must still be submitted exactly once although its field is disabled in
 * the submit handler.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const stop = vi.hoisted(() => ({ resolve: (_reached: boolean) => {} }));

vi.mock("@/app/acompanhar/[token]/parar/action", () => ({
  stopDeliveryMessages: vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        stop.resolve = resolve;
      }),
  ),
}));

import { VerifyCodeForm } from "@/app/verificar/_components/verify-code-form";
import { StopMessagesButton } from "@/app/acompanhar/[token]/parar/stop-button";

(globalThis as { React?: typeof React }).React = React;

const CODE = "a".repeat(64);

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("the /verificar code form", () => {
  it("is idle and plain until it is sent", async () => {
    const host = await mount(createElement(VerifyCodeForm));
    const form = host.querySelector("form")!;

    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/verificar");
    expect(form.hasAttribute("aria-busy")).toBe(false);
    expect(host.querySelector("button")!.textContent).toBe("Verificar");
  });

  it("disables the field and the button, spins and is aria-busy once sent", async () => {
    // Red before: the server-only form stayed as it was until the next page.
    const host = await mount(createElement(VerifyCodeForm));
    const form = host.querySelector("form")!;
    const input = host.querySelector<HTMLInputElement>("#codigo")!;

    input.value = CODE;

    // Holds the navigation; React's own listener runs before this one.
    const entries: Array<[string, FormDataEntryValue]> = [];
    const hold = (event: Event) => {
      entries.push(...new FormData(event.target as HTMLFormElement).entries());
      event.preventDefault();
    };

    document.addEventListener("submit", hold);

    try {
      await act(async () => {
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      });
    } finally {
      document.removeEventListener("submit", hold);
    }

    const button = host.querySelector("button")!;

    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Verificando…");
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();

    // The code goes once, whichever of the field or its hidden copy carried it.
    expect(entries).toEqual([["codigo", CODE]]);
    expect(new FormData(form).getAll("codigo")).toEqual([CODE]);
  });

  it("keeps the refused code and says why", async () => {
    const host = await mount(
      createElement(VerifyCodeForm, {
        defaultCode: "abc",
        error: "Código inválido.",
      }),
    );

    expect(host.querySelector<HTMLInputElement>("#codigo")!.value).toBe("abc");
    expect(host.textContent).toMatch(/Código inválido\./);
  });
});

describe("the /acompanhar stop button", () => {
  it("is disabled, spinning, says Parando… and is aria-busy until the answer", async () => {
    // Red before: it kept saying "Parar mensagens" and had no aria-busy.
    const host = await mount(
      createElement(StopMessagesButton, { token: "t".repeat(43) }),
    );
    const button = host.querySelector("button")!;

    await act(async () => {
      button.click();
    });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toBe("Parando…");
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();

    await act(async () => {
      stop.resolve(true);
    });

    expect(host.textContent).toMatch(/Você não receberá mais mensagens/);
  });
});
