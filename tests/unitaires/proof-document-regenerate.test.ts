import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * "Gerar novamente" on the delivery's receipt (decision 4.2).
 *
 * Regenerating rewrites a document that may already be in someone's hands,
 * and the API treats it as a write: a read-only profile gets 403
 * PERMISSION_DENIED. The button was offered to everybody, so the reader
 * pressed it and was told off by a toast. Now it stays on screen, disabled,
 * and says why — the same contract as every other write in the dialog.
 */
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fetched = vi.hoisted(() => ({
  calls: [] as Array<[string, string, boolean]>,
  // Decision 14.8 fields merged into the answer; empty = an older API.
  extra: {} as Record<string, unknown>,
}));

vi.mock("@/actions/delivery/get-proof-document", () => ({
  getProofDocument: async (
    businessId: string,
    deliveryId: string,
    regenerate: boolean,
  ) => {
    fetched.calls.push([businessId, deliveryId, regenerate]);

    return {
      success: true,
      message: "",
      data: {
        url: "https://files.test/proof.pdf",
        verificationUrl: "https://app.test/verificar/abc",
        sha256: "f".repeat(64),
        version: 1,
        ...fetched.extra,
      },
    };
  },
}));

import { ProofDocumentSection } from "@/features/deliveries/deliveries/proof-document";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  fetched.calls.length = 0;
  fetched.extra = {};
});

async function openReceipt(props: {
  canRegenerate?: boolean;
  regenerateBlockedReason?: string;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ProofDocumentSection, {
        businessId: "b1",
        deliveryId: "d1",
        status: "DELIVERED",
        ...props,
      }),
    );
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const view = [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Ver comprovante"),
  );

  await act(async () => {
    view!.click();
  });

  const regenerate = [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Gerar novamente"),
  );

  return { container, regenerate: regenerate! };
}

describe("the receipt's 'Gerar novamente'", () => {
  it("is offered to a profile that writes deliveries", async () => {
    const { regenerate } = await openReceipt({ canRegenerate: true });

    expect(regenerate).toBeTruthy();
    expect(regenerate.disabled).toBe(false);
  });

  it("is on screen but disabled for a read-only profile, with the reason", async () => {
    const reason = "Seu perfil de acesso permite apenas a leitura desta seção.";
    const { container, regenerate } = await openReceipt({
      canRegenerate: false,
      regenerateBlockedReason: reason,
    });

    expect(regenerate).toBeTruthy();
    expect(regenerate.disabled).toBe(true);

    // A disabled button takes no focus nor hover: the reason hangs on the
    // wrapper, which does.
    const trigger = regenerate.closest<HTMLElement>("[data-blocked-reason]");

    expect(trigger?.getAttribute("data-blocked-reason")).toBe(reason);
    expect(trigger?.tabIndex).toBe(0);

    await act(async () => {
      regenerate.click();
    });

    // Opening the receipt was a read; nothing asked to regenerate it.
    expect(fetched.calls.map(([, , again]) => again)).toEqual([false]);
    expect(container.textContent).toContain("Abrir PDF");
  });

  it("says the generic read-only reason when the caller gives none", async () => {
    const { regenerate } = await openReceipt({ canRegenerate: false });

    expect(
      regenerate
        .closest("[data-blocked-reason]")
        ?.getAttribute("data-blocked-reason"),
    ).toBe("Seu perfil de acesso permite apenas a leitura desta seção.");
  });
});

describe("the receipt's signature (decision 14.8)", () => {
  it("shows a signed document as signed, with where to validate it", async () => {
    fetched.extra = {
      layout_version: 2,
      signing_available: true,
      signature: {
        status: "SIGNED",
        profile: "PADES_AD_RB",
        signer_name: "TRAJETTO TECNOLOGIA LTDA",
        signer_cnpj: "00000000000000",
        cert_not_after: "2027-09-30T23:59:59.000Z",
        signed_at: "2026-10-06T13:00:00.000Z",
        unsigned_reason: null,
        icp_brasil: true,
      },
    };

    const { container } = await openReceipt({ canRegenerate: true });

    expect(
      container.querySelector("[data-signature-status]")?.textContent,
    ).toContain("Assinado digitalmente (ICP-Brasil)");
    expect(
      container.querySelector('a[href="https://validar.iti.gov.br"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("modelo anterior");
  });

  it("never claims a signature for an answer without one, and suggests the current layout", async () => {
    const { container } = await openReceipt({ canRegenerate: true });

    expect(
      container.querySelector("[data-signature-status]")?.textContent,
    ).toContain("Sem assinatura digital");
    expect(
      container.querySelector('a[href="https://validar.iti.gov.br"]'),
    ).toBeNull();
    expect(container.textContent).toContain("modelo anterior");
  });
});
