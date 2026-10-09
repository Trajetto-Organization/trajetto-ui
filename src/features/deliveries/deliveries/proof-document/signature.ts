import type {
  ProofDocumentData,
  ProofUnsignedReason,
} from "@/actions/delivery/get-proof-document";

/**
 * What the delivery detail says about the receipt's digital signature
 * (decision 14.8, design §9.1). Read defensively: an API older than the
 * signature answers without the fields, and such a document was never
 * signed.
 */
type ProofSignatureFacts = Pick<
  ProofDocumentData,
  "layout_version" | "signature" | "signing_available"
>;

interface ProofSignatureBadge {
  signed: boolean;
  label: string;

  /** The tooltip: who signed, or why it is not signed. */
  reason: string;
}

const UNSIGNED_REASONS: Record<ProofUnsignedReason, string> = {
  LEGACY: "Gerado antes do modelo atual",
  NO_CERTIFICATE: "Certificado da plataforma não configurado",
  CERTIFICATE_EXPIRED: "Certificado da plataforma vencido",
  CERTIFICATE_INVALID: "Certificado da plataforma inválido",
  SIGNING_DISABLED: "Assinatura desligada",
};

/** Where legal validity is checked: the ITI validator, on the PDF itself. */
const ITI_VALIDATOR_URL = "https://validar.iti.gov.br";

function proofSignatureBadge(
  document: Partial<ProofSignatureFacts>,
): ProofSignatureBadge {
  const signature = document.signature;

  if (signature?.status === "SIGNED") {
    return {
      signed: true,
      label: "Assinado digitalmente (ICP-Brasil)",
      reason: signature.signer_name
        ? `Assinado por ${signature.signer_name} com certificado ICP-Brasil.`
        : "Assinado com certificado ICP-Brasil.",
    };
  }

  const reason = signature?.unsigned_reason
    ? UNSIGNED_REASONS[signature.unsigned_reason]
    : null;

  return {
    signed: false,
    label: "Sem assinatura digital",
    reason: reason ?? UNSIGNED_REASONS.LEGACY,
  };
}

/**
 * The quiet suggestion to generate the document again, or null. Only when
 * doing so changes something: an older layout, or an unsigned document the
 * server could sign now. It never regenerates on its own (decision 5.11).
 */
function proofRegenerateHint(
  document: Partial<ProofSignatureFacts>,
): string | null {
  const layout = document.layout_version ?? 1;

  if (layout < 2) {
    return "Este comprovante foi gerado no modelo anterior. Use “Gerar novamente” para obter a versão atual.";
  }

  if (
    document.signature?.status === "UNSIGNED" &&
    document.signing_available === true
  ) {
    return "Este comprovante foi gerado sem assinatura digital. Use “Gerar novamente” para obter a versão assinada.";
  }

  return null;
}

export { ITI_VALIDATOR_URL, proofRegenerateHint, proofSignatureBadge };
export type { ProofSignatureBadge };
