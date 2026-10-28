"use server";

import { logActionError } from "@/lib/log-action-error";
import { createUpdateBranchSchema } from "@/schemas/create-update-branch-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateBranchProps {
  message: string;
}

const handleUpdateBranch = async (state: any, updateBranchValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateBranchError: {
        updateBranchErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateBranchValues.type === "RESET") {
    return {};
  }

  const businessId = updateBranchValues.get("businessId");
  const branchId = updateBranchValues.get("branchId");

  const updateBranch = `${process.env.HTTP_REQUEST}/branch/update-branch/${branchId}/business/${businessId}`;

  const branchValues = Object.fromEntries(updateBranchValues.entries());
  const updateBranchValidation =
    createUpdateBranchSchema.safeParse(branchValues);

  if (updateBranchValidation.error) {
    const formatError = updateBranchValidation.error.flatten();

    return {
      updateBranchError: formatError.fieldErrors,
    };
  }

  const branchData = updateBranchValidation.data;

  try {
    const response = await apiFetch(updateBranch, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(branchData),
    });

    const { message } = (await response
      .json()
      .catch(() => ({}))) as Partial<UpdateBranchProps>;

    // A refusal is a refusal with or without a message: without one it
    // used to fall through as `{ successMessage: undefined }`, and the form
    // neither closed nor said anything.
    if (!response.ok) {
      return {
        updateBranchError: {
          updateBranchErrorMessage:
            message || "Não foi possível atualizar a filial. Tente novamente.",
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-branch");

    return { successMessage: message };
  } catch (error) {
    logActionError("branch/update-branch", error);
    return {
      updateBranchError: {
        updateBranchErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a filial.",
      },
    };
  }
};

export { handleUpdateBranch };
