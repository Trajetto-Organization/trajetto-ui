import { describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * The public pages a proof PDF leads to, rendered (DLVB-10 and the review of
 * DLVP-PROOF-4).
 *
 * - /verificar/[token] printed every moment in a fixed São Paulo clock and
 *   said "Horários de Brasília", while the PDF prints the carrier's own zone:
 *   for a carrier in Manaus the paper and the page disagreed by an hour.
 * - /verificar told people to type "the code printed under the QR"; the PDF
 *   prints it beside the QR.
 *
 * The API answer is stubbed: what is proven is what the page does with it.
 */
const TOKEN =
  "9f1c2a4e6b8d0f3a5c7e9b1d3f5a7c9e9f1c2a4e6b8d0f3a5c7e9b1d3f5a7c9e";

const answer = vi.hoisted(() => ({
  timeZone: undefined as string | undefined,
  intact: true,
  storedSha256: "a".repeat(64) as string | null,
}));

vi.mock("@/lib/public-api", () => ({
  isDenial: (result: { status: number }) =>
    result.status === 404 || result.status === 400,
  verifyProof: async () => ({
    ok: true,
    status: 200,
    data: {
      intact: answer.intact,
      storedSha256: answer.storedSha256,
      summary: {
        recipientName: "Padaria Central Ltda",
        city: "Manaus",
        uf: "AM",
        invoiceNumber: "12345",
        carrierName: "Silva Log",
        // 23:30 of the 16th in Manaus, 00:30 of the 17th in São Paulo.
        deliveredAt: "2026-09-17T03:30:00.000Z",
        receivedBy: "Maria Souza",
        sha256: "a".repeat(64),
        generatedAt: "2026-09-17T03:40:00.000Z",
        version: 1,
        ...(answer.timeZone ? { timeZone: answer.timeZone } : {}),
      },
      url: "https://signed.example/doc.pdf",
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect ${path}`);
  },
}));

import VerifyProofPage from "@/app/verificar/[token]/page";
import VerifyEntryPage from "@/app/verificar/page";

/** The page's text, with the narrow no-break space ICU puts in times. */
async function verificationPage(
  timeZone?: string,
  file: { intact: boolean; storedSha256: string | null } = {
    intact: true,
    storedSha256: "a".repeat(64),
  },
): Promise<string> {
  answer.timeZone = timeZone;
  answer.intact = file.intact;
  answer.storedSha256 = file.storedSha256;

  const element = await VerifyProofPage({ params: { token: TOKEN } });

  return renderHtml(element).replace(/[  ]/g, " ");
}

describe("the verification page of a receipt", () => {
  it("prints the moments on the carrier's clock and names it, like the PDF", async () => {
    const html = await verificationPage("America/Manaus");

    expect(html).toContain("16/09/2026, 23:30");
    expect(html).toContain("16/09/2026, 23:40");
    expect(html).toContain("Horários de Manaus (UTC-4).");
    expect(html).not.toContain("Brasília");
  });

  it("falls back to Brasília when the answer has no zone, as the PDF does", async () => {
    const html = await verificationPage(undefined);

    expect(html).toContain("17/09/2026, 00:30");
    expect(html).toContain("Horários de Brasília (UTC-3).");
  });

  it("falls back to Brasília for a zone it does not know", async () => {
    const html = await verificationPage("Not/A_Zone");

    expect(html).toContain("17/09/2026, 00:30");
    expect(html).toContain("Horários de Brasília (UTC-3).");
  });
});

describe("what the page says about the stored file", () => {
  /**
   * The hash is recorded when the PDF is first generated, which is lazy and
   * can be days after the delivery. The tampered message said "registro
   * feito no momento da entrega", which the wave-1 note had already fixed in
   * its intact sibling.
   */
  it("dates the record of a file that no longer matches to its generation", async () => {
    const html = await verificationPage("America/Sao_Paulo", {
      intact: false,
      storedSha256: "b".repeat(64),
    });

    expect(html).toContain("Não foi possível confirmar a integridade");
    expect(html).toContain(
      "O arquivo guardado não corresponde mais ao registro feito quando o comprovante foi gerado. Procure a transportadora antes de usar este documento.",
    );
    expect(html).not.toContain("registro feito no momento da entrega");
  });

  it("tells a missing file apart from a tampered one", async () => {
    const html = await verificationPage("America/Sao_Paulo", {
      intact: false,
      storedSha256: null,
    });

    expect(html).toContain("Arquivo indisponível");
    expect(html).toContain("Isso não indica adulteração");
    expect(html).not.toContain("não corresponde mais ao registro");
  });

  it("says an intact file is exactly the one generated", async () => {
    const html = await verificationPage("America/Sao_Paulo");

    expect(html).toContain("Documento íntegro");
    expect(html).toContain(
      "O arquivo guardado é exatamente o que foi gerado para esta entrega.",
    );
  });
});

describe("the page to type a code", () => {
  it("says where the code is printed on the PDF: beside the QR", () => {
    const html = renderHtml(VerifyEntryPage({ searchParams: {} }));

    expect(html).toContain("impresso ao lado do QR");
    expect(html).not.toContain("abaixo do QR");

    // A plain GET form: it works without JavaScript.
    expect(html).toMatch(/<form[^>]*action="\/verificar"[^>]*method="get"/);
  });

  it("keeps a bad code on the form with the reason under the field", () => {
    const html = renderHtml(
      VerifyEntryPage({ searchParams: { codigo: "abc" } }),
    );

    expect(html).toContain("Código inválido");
    expect(html).toContain('value="abc"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("sends a good code, pasted with the next line of the PDF, to its page", () => {
    expect(() =>
      VerifyEntryPage({
        searchParams: {
          codigo: `https://app.trajetto.com.br/verificar/${TOKEN}\nEste documento reúne`,
        },
      }),
    ).toThrow(`redirect /verificar/${TOKEN}`);
  });
});
