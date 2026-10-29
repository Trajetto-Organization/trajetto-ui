"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface RequestBranchDeletionProps {
  businessId: string;
  branchId: string;
}

interface RequestBranchDeletionResponseProps {
  message: string;
}

const handleRequestBranchDeletion = async ({
  branchId,
  businessId,
}: RequestBranchDeletionProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      requestBranchDeletionError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const requestBranchDeletion = `${process.env.HTTP_REQUEST}/branch/request-branch-deletion/${branchId}/business/${businessId}`;

  try {
    const response = await apiFetch(requestBranchDeletion, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as RequestBranchDeletionResponseProps;

    if (!response.ok) {
      return {
        requestBranchDeletionError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("branch/request-branch-deletion", error);
    return {
      requestBranchDeletionError:
        "Ocorreu um erro inesperado ao tentar solicitar a exclusão da filial.",
    };
  }
};

export { handleRequestBranchDeletion };
