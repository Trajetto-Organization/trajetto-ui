"use server";

import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

type ProofAuditStatus = "PENDING" | "APPROVED" | "REJECTED";

type CriterionVerdict = "yes" | "no" | "unknown";

interface ProofAuditSuggestion {
  reading: {
    legible: CriterionVerdict;
    hasSignature: CriterionVerdict;
    dateVisible: CriterionVerdict;
    documentMatches: CriterionVerdict;

    photoQuality: number;
    confidence: number;

    observation: string;
  };

  assessment: {
    suggestion: "looks_good" | "needs_review" | "looks_wrong";
    failed: string[];
    uncertain: string[];
    reviewPriority: number;
  };
}

interface ProofAuditCard {
  id: string;

  deliveryId: string;
  status: ProofAuditStatus;

  /** Null until the model answers — and a null is why the card still shows. */
  ai_suggestion: ProofAuditSuggestion | null;
  ai_confidence: number | null;
  ai_analyzed_at: string | null;

  reviewedById: string | null;
  reviewerName: string | null;
  reviewed_at: string | null;

  rejection_reason: string | null;

  created_at: string;

  delivery: {
    id: string;
    recipient_name: string;
    city: string;
    uf: string;
    invoice_number: string | null;
    code: string | null;
    delivered_at: string | null;
    received_by: string | null;
    driverName: string | null;
  };

  /** Signed and short-lived. */
  photoUrl: string | null;
  signatureUrl: string | null;
}

interface ProofAuditMeta {
  pending: number;
  approved: number;
  rejected: number;

  /**
   * How often the machine and the person said the same thing.
   *
   * Null before anything was reviewed — which is a different fact from zero,
   * and a zero would read as "the machine is always wrong".
   */
  agreementRate: number | null;
}

interface ProofAuditListData {
  data: ProofAuditCard[];
  total: number;
  currentPage: number;
  pageSize: number;
  meta?: ProofAuditMeta;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const listProofAudits = async (
  businessId: string,
  status: ProofAuditStatus,
  page: number,
  pageSize: number,
): Promise<ActionResponse<ProofAuditListData>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams({
      businessId,
      status,
      page: String(page),
      pageSize: String(pageSize),
    });

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/proof-audits?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const result = await response.json();

      return {
        success: false,
        message: result.message || "Houve um erro ao carregar a fila.",
      };
    }

    // The list routes stream NDJSON (meta first, then one card per line).
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Fila obtida com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        meta: meta?.searchMeta,
      } as ProofAuditListData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar a fila.",
    };
  }
};

/**
 * A person's verdict.
 *
 * The API refuses a rejection with no reason and answers 409 when somebody
 * reviewed the card first; both arrive here as plain sentences and the screen
 * shows them verbatim, rather than keeping its own copy of the rules.
 */
const reviewProofAudit = async (
  businessId: string,
  auditId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/proof-audit/${auditId}/business/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(rejectionReason && { rejection_reason: rejectionReason }),
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao revisar o comprovante.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao revisar o comprovante.",
    };
  }
};

export { listProofAudits, reviewProofAudit };
export type {
  CriterionVerdict,
  ProofAuditCard,
  ProofAuditListData,
  ProofAuditMeta,
  ProofAuditStatus,
  ProofAuditSuggestion,
};
