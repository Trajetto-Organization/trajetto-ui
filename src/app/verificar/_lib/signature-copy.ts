/**
 * What the public /verificar page says about the document's digital
 * signature (decision 14.8).
 *
 * The page used to say, for every document, that it "não possui assinatura
 * digital ICP-Brasil". With signed documents that sentence became false for
 * them, and the opposite mistake — claiming validity for an unsigned one —
 * is worse. So the wording is decided here from what the API recorded, and
 * neither state claims more than that: legal validity is checked by the
 * ITI validator, on the PDF itself.
 */
const ITI_VALIDATOR_URL = "https://validar.iti.gov.br";

interface ProofSignatureSummary {
  status: "SIGNED" | "UNSIGNED";
  profile?: "PADES_AD_RB" | "CMS_DETACHED" | null;
  signerName?: string | null;
  certNotAfter?: string | null;
  signedAt?: string | null;
}

interface SignatureCopy {
  signed: boolean;
  title: string;
  body: string;
  /** Shown only when signed: where and how to check the legal validity. */
  validator: { url: string; label: string; hint: string } | null;
  footer: string;
}

const dateFormatter = (timeZone?: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: timeZone || "America/Sao_Paulo",
  });

function formatDate(
  value: string | null | undefined,
  timeZone?: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : dateFormatter(timeZone).format(date);
}

/**
 * The copy for `signature` — read defensively: an API from before decision
 * 14.8 answers without the field, and such a document was never signed.
 */
function signatureCopy(
  signature: ProofSignatureSummary | null | undefined,
  timeZone?: string,
): SignatureCopy {
  if (signature?.status !== "SIGNED") {
    return {
      signed: false,
      title: "Sem assinatura digital",
      body: "Este comprovante não possui assinatura digital ICP-Brasil. A integridade do arquivo pode ser conferida nesta página.",
      validator: null,
      footer:
        "Este documento reúne informações registradas no momento da entrega e permite conferir a integridade do arquivo. Não possui assinatura digital ICP-Brasil e não afirma validade jurídica própria.",
    };
  }

  const signedAt = formatDate(signature.signedAt, timeZone);
  const notAfter = formatDate(signature.certNotAfter, timeZone);
  const signer = signature.signerName?.trim() || "a plataforma Trajetto";

  return {
    signed: true,
    title: "Assinado digitalmente (ICP-Brasil)",
    body:
      `Assinado por ${signer} com certificado ICP-Brasil` +
      (signedAt ? ` em ${signedAt}` : "") +
      "." +
      (notAfter ? ` Certificado válido até ${notAfter}.` : ""),
    validator: {
      url: ITI_VALIDATOR_URL,
      label: "Validar no ITI",
      hint: "Para conferir a validade jurídica, baixe o PDF abaixo e envie o arquivo no validador do ITI.",
    },
    footer:
      "Este documento reúne informações registradas no momento da entrega e foi assinado digitalmente com certificado ICP-Brasil. A validade da assinatura é conferida no validador do ITI, com o próprio arquivo PDF.",
  };
}

export { ITI_VALIDATOR_URL, signatureCopy };
export type { ProofSignatureSummary, SignatureCopy };
