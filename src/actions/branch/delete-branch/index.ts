"use server";

import {
  NEW_DELETION_CODE_MESSAGE,
  errorCodeOf,
  needsNewDeletionCode,
  refusalMessage,
} from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteBranchProps {
  businessId: string;
  branchId: string;
  code: string;
}

interface DeleteBranchResponseProps {
  message?: string;
  code?: string;
}

const handleDeleteBranch = async ({
  branchId,
  businessId,
  code,
}: DeleteBranchProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteBranchError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  if (!code) {
    return {
      deleteBranchError: "Código de confirmação é obrigatório.",
    };
  }

  const deleteBranch = `${process.env.HTTP_REQUEST}/branch/delete-branch/${branchId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteBranch, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const body = (await response.json()) as DeleteBranchResponseProps;
    const { message } = body;

    if (!response.ok) {
      const errorCode = errorCodeOf(body, response.headers);

      // No pending request (409 BRANCH_DELETION_NOT_REQUESTED) or an expired
      // code: retyping cannot work, so the dialog asks for a new code instead
      // of reading it as a generic conflict.
      if (needsNewDeletionCode(errorCode)) {
        return {
          deleteBranchError: message || NEW_DELETION_CODE_MESSAGE,
          errorCode,
          requestNewCode: true,
        };
      }

      return {
        deleteBranchError: message || refusalMessage(response.status),
        errorCode,
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("branch/delete-branch", error);
    return {
      deleteBranchError:
        "Ocorreu um erro inesperado ao tentar deletar a filial.",
    };
  }
};

export { handleDeleteBranch };
