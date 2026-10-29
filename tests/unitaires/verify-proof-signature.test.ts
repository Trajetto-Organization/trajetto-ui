import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: () => new Headers() }));

import { signatureCopy } from "@/app/verificar/_lib/signature-copy";

import { renderHtml } from "./helpers/render-html";

/**
 * What /verificar says about the ICP-Brasil signature (decision 14.8).
 *
 * The footer used to state, for EVERY document, that it "não possui
 * assinatura digital ICP-Brasil" — false for a signed one. And the opposite
 * mistake, an unsigned document presented as legally valid, must never
 * happen either.
 */
describe("the signature copy on /verificar", () => {
  it("never claims a signature or validity for an unsigned document, nor for an old API's answer", () => {
    for (const signature of [
      { status: "UNSIGNED" as const },
      undefined,
      null,
    ]) {
      const copy = signatureCopy(signature);

      expect(copy.signed).toBe(false);
      expect(copy.validator).toBeNull();
      expect(copy.body).toContain("não possui assinatura digital ICP-Brasil");
      expect(copy.footer).toContain("não afirma validade jurídica própria");
      expect(`${copy.title} ${copy.body} ${copy.footer}`).not.toContain(
        "validar.iti",
      );
    }
  });

  // The staging test certificate says O=ICP-Brasil in its issuer but chains
  // to no ICP-Brasil root: it signs, and the page must claim nothing more.
  it.each([
    ["outside the ICP-Brasil chain", false],
    ["whose chain was never checked (older document or API)", null],
    ["from an API that doesn't say", undefined],
  ])(
    "claims no ICP-Brasil validity for a document signed %s",
    (_, icpBrasil) => {
      const copy = signatureCopy(
        {
          status: "SIGNED",
          profile: "CMS_DETACHED",
          signerName: "TRAJETTO SISTEMAS LTDA",
          signedAt: "2026-10-06T13:00:00.000Z",
          icpBrasil,
        },
        "America/Sao_Paulo",
      );

      expect(copy.signed).toBe(true);
      expect(copy.title).toBe("Assinado digitalmente");
      expect(copy.body).toContain("fora da cadeia ICP-Brasil");
      expect(copy.validator).toBeNull();
      expect(copy.footer).toContain("não afirma validade jurídica");
    },
  );

  it("says who signed and until when, and points at the ITI validator, for a signed one", () => {
    const copy = signatureCopy(
      {
        status: "SIGNED",
        profile: "PADES_AD_RB",
        signerName: "TRAJETTO SISTEMAS LTDA",
        signedAt: "2026-10-06T13:00:00.000Z",
        certNotAfter: "2027-09-30T23:59:59.000Z",
        icpBrasil: true,
      },
      "America/Sao_Paulo",
    );

    expect(copy.signed).toBe(true);
    expect(copy.title).toBe("Assinado digitalmente (ICP-Brasil)");
    expect(copy.body).toBe(
      "Assinado por TRAJETTO SISTEMAS LTDA com certificado ICP-Brasil em 06/10/2026. Certificado válido até 30/09/2027.",
    );
    expect(copy.validator?.url).toBe("https://validar.iti.gov.br");
    // The old, unconditional sentence is gone for a signed document.
    expect(copy.footer).not.toContain("Não possui assinatura digital");
  });

  it("is what the page renders: the footer is no longer a fixed 'não possui assinatura'", async () => {
    const page = readFileSync(
      path.resolve(__dirname, "../../src/app/verificar/[token]/page.tsx"),
      "utf8",
    );

    expect(page).not.toMatch(
      /Não possui assinatura\s+digital ICP-Brasil e não afirma/,
    );
  });
});

/**
 * The real page, rendered for both states. Only the network is replaced:
 * `fetch` answers what the API would, so the page's own reading of the
 * answer (verifyProof, signatureCopy, the card and the footer) is what runs.
 */
describe("the /verificar page", () => {
  const TOKEN = "ab".repeat(32);

  const answer = (signature: unknown) => ({
    data: {
      intact: true,
      storedSha256: "f".repeat(64),
      url: null,
      summary: {
        recipientName: "Supermercado Cabral Ltda",
        city: "Vila Velha",
        uf: "ES",
        invoiceNumber: "45515",
        carrierName: "Multipla Distribuidora",
        deliveredAt: "2026-09-30T16:30:26.000Z",
        receivedBy: null,
        sha256: "f".repeat(64),
        generatedAt: "2026-09-30T16:40:00.000Z",
        version: 1,
        timeZone: "America/Sao_Paulo",
        ...(signature === undefined ? {} : { signature }),
      },
    },
  });

  async function renderPage(signature: unknown): Promise<string> {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(answer(signature)), { status: 200 }),
      ),
    );

    const { default: VerifyProofPage } =
      await import("@/app/verificar/[token]/page");

    return renderHtml(await VerifyProofPage({ params: { token: TOKEN } }));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a signed document as signed, with the ITI validator, and no denial", async () => {
    const html = await renderPage({
      status: "SIGNED",
      profile: "PADES_AD_RB",
      signerName: "TRAJETTO SISTEMAS LTDA",
      signedAt: "2026-10-06T13:00:00.000Z",
      certNotAfter: "2027-09-30T23:59:59.000Z",
      icpBrasil: true,
    });

    expect(html).toContain(
      "Assinatura digital: Assinado digitalmente (ICP-Brasil)",
    );
    expect(html).toContain("Assinado por TRAJETTO SISTEMAS LTDA");
    expect(html).toContain('href="https://validar.iti.gov.br"');
    expect(html).not.toContain("não possui assinatura digital");
    expect(html).not.toContain("Não possui assinatura digital");
  });

  it.each([
    ["an unsigned document", { status: "UNSIGNED" }],
    ["an older API that does not say", undefined],
  ])("shows %s as unsigned, never claiming validity", async (_, signature) => {
    const html = await renderPage(signature);

    expect(html).toContain(signatureCopy({ status: "UNSIGNED" }).body);
    expect(html).toContain(signatureCopy({ status: "UNSIGNED" }).footer);
    expect(html).not.toContain("validar.iti");
    expect(html).not.toContain("Assinado digitalmente");
  });
});
