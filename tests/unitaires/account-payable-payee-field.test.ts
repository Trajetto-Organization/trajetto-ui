import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PayeeField } from "@/features/account-payable/form-dialog/payee-field";
import {
  FULL_ACCESS,
  NO_ACCESS_HINTS,
  initialFormValues,
} from "@/features/account-payable/lib/form-values";

/**
 * "Favorecido", mounted (decisions 3.3, 3.4 and 8.4).
 *
 * The payee choice was a bare <Label>"Favorecido *"</Label> over a radio
 * group: no red star, no aria-required, while every other field of the form
 * had both. It is a field now, required to create and to edit a bill that
 * names a payee, optional on a bill from before the column. A profile that
 * cannot list suppliers is sent to the name, told why, and never asks the
 * API for a list it would refuse.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function mount(
  props: Partial<React.ComponentProps<typeof PayeeField>> = {},
): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  const values = initialFormValues(undefined, props.access ?? FULL_ACCESS);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(PayeeField, {
          businessId: "018f0000-0000-7000-8000-00000000000a",
          values,
          set: () => undefined,
          errors: {},
          pending: false,
          access: FULL_ACCESS,
          payeeRequired: true,
          ...props,
        }),
      ),
    );
  });

  return host;
}

const group = (host: HTMLElement) => host.querySelector('[role="radiogroup"]')!;
const labelOf = (host: HTMLElement) => host.querySelector("label")!;

describe("the payee field", () => {
  it("is required like every other field: red star and aria-required", async () => {
    const host = await mount({
      values: { payeeKind: "name", supplierId: "", payee_name: "" },
    });

    expect(labelOf(host).textContent).toBe("Favorecido *");
    expect(
      labelOf(host).querySelector('span[aria-hidden="true"]')?.className,
    ).toContain("text-red-600");
    expect(group(host).getAttribute("aria-required")).toBe("true");
    expect(group(host).getAttribute("aria-label")).toBe("Favorecido");
    expect(
      host.querySelector("#payee_name")!.getAttribute("aria-required"),
    ).toBe("true");
  });

  it("is optional on a legacy bill, without a star or aria-required", async () => {
    const host = await mount({
      payeeRequired: false,
      values: { payeeKind: "name", supplierId: "", payee_name: "" },
    });

    expect(labelOf(host).textContent).toBe("Favorecido (opcional)");
    // Radix writes aria-required="false" for a group that is not required.
    expect(group(host).getAttribute("aria-required")).not.toBe("true");
    expect(
      host.querySelector("#payee_name")!.hasAttribute("aria-required"),
    ).toBe(false);
  });

  it("turns the supplier option off, says why and asks the API nothing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const noSuppliers = { ...FULL_ACCESS, suppliers: false };
    const host = await mount({ access: noSuppliers });

    const supplierOption = host.querySelector(
      "#payee-kind-supplier",
    ) as HTMLButtonElement;

    expect(supplierOption.disabled).toBe(true);
    expect(host.textContent).toContain(NO_ACCESS_HINTS.suppliers);
    // A new bill opens on the name, the way in that works.
    expect(host.querySelector("#payee_name")).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps a registered payee readable but off when suppliers cannot be listed", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const host = await mount({
      access: { ...FULL_ACCESS, suppliers: false },
      values: { payeeKind: "supplier", supplierId: "s1", payee_name: "" },
    });

    const trigger = host.querySelector(
      "#account-payable-supplier",
    ) as HTMLButtonElement;

    expect(trigger.disabled).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
