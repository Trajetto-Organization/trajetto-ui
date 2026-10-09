import { describe, expect, it } from "vitest";

import {
  proofRegenerateHint,
  proofSignatureBadge,
} from "@/features/deliveries/deliveries/proof-document/signature";

/**
 * The receipt section of the delivery detail (decision 14.8, design §9.1):
 * what it says about the ICP-Brasil signature, and when it suggests
 * generating the document again. It never claims a signature the API did
 * not record.
 */
const signed = {
  layout_version: 2,
  signing_available: true,
  signature: {
    status: "SIGNED" as const,
    profile: "PADES_AD_RB" as const,
    signer_name: "TRAJETTO TECNOLOGIA LTDA",
    signer_cnpj: "00000000000000",
    cert_not_after: "2027-09-30T23:59:59.000Z",
    signed_at: "2026-10-06T13:00:00.000Z",
    unsigned_reason: null,
  },
};

function unsigned(
  reason:
    | "LEGACY"
    | "NO_CERTIFICATE"
    | "CERTIFICATE_EXPIRED"
    | "CERTIFICATE_INVALID"
    | "SIGNING_DISABLED"
    | null,
  patch: Partial<{ layout_version: number; signing_available: boolean }> = {},
) {
  return {
    layout_version: 2,
    signing_available: false,
    ...patch,
    signature: {
      status: "UNSIGNED" as const,
      profile: null,
      signer_name: null,
      signer_cnpj: null,
      cert_not_after: null,
      signed_at: null,
      unsigned_reason: reason,
    },
  };
}

describe("the receipt's signature badge", () => {
  it("says signed only when the API recorded a signature", () => {
    const badge = proofSignatureBadge(signed);

    expect(badge.signed).toBe(true);
    expect(badge.label).toBe("Assinado digitalmente (ICP-Brasil)");
    expect(badge.reason).toContain("TRAJETTO TECNOLOGIA LTDA");
  });

  it("gives the reason of an unsigned document", () => {
    expect(proofSignatureBadge(unsigned("NO_CERTIFICATE"))).toMatchObject({
      signed: false,
      label: "Sem assinatura digital",
      reason: "Certificado da plataforma não configurado",
    });
    expect(proofSignatureBadge(unsigned("CERTIFICATE_EXPIRED")).reason).toBe(
      "Certificado da plataforma vencido",
    );
    expect(proofSignatureBadge(unsigned("CERTIFICATE_INVALID")).reason).toBe(
      "Certificado da plataforma inválido",
    );
    expect(proofSignatureBadge(unsigned("SIGNING_DISABLED")).reason).toBe(
      "Assinatura desligada",
    );
    expect(proofSignatureBadge(unsigned("LEGACY")).reason).toBe(
      "Gerado antes do modelo atual",
    );
  });

  it("reads an API older than the signature as unsigned", () => {
    const badge = proofSignatureBadge({});

    expect(badge.signed).toBe(false);
    expect(badge.label).toBe("Sem assinatura digital");
  });
});

describe("the 'Gerar novamente' hint", () => {
  it("is shown for a document in the previous layout", () => {
    expect(
      proofRegenerateHint(unsigned("LEGACY", { layout_version: 1 })),
    ).not.toBeNull();
    expect(proofRegenerateHint({})).not.toBeNull();
  });

  it("is shown for an unsigned document the server could sign now", () => {
    expect(
      proofRegenerateHint(
        unsigned("NO_CERTIFICATE", { signing_available: true }),
      ),
    ).toContain("Gerar novamente");
  });

  it("is not shown when generating again would change nothing", () => {
    expect(proofRegenerateHint(signed)).toBeNull();
    expect(proofRegenerateHint(unsigned("NO_CERTIFICATE"))).toBeNull();
  });
});
