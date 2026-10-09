"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { createUpdateBranchSchema } from "@/schemas/create-update-branch-schema";
import { apiFetch } from "@/lib/api-fetch";

interface CreateBranchProps {
  message: string;
}

const handleCreateBranch = async (state: any, createBranchValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createBranchError: {
        createBranchErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createBranchValues.type === "RESET") {
    return {};
  }

  const businessId = createBranchValues.get("businessId");

  if (!businessId) {
    return {
      createBranchError: {
        businessId: ["Selecione uma empresa para continuar"],
      },
    };
  }

  const createBranch = `${process.env.HTTP_REQUEST}/branch/create-branch/${businessId}`;

  const branchValues = Object.fromEntries(createBranchValues.entries());
  const createBranchValidation =
    createUpdateBranchSchema.safeParse(branchValues);

  if (createBranchValidation.error) {
    const formatError = createBranchValidation.error.flatten();

    return {
      createBranchError: formatError.fieldErrors,
    };
  }

  const branchData = createBranchValidation.data;

  try {
    const response = await apiFetch(createBranch, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(branchData),
    });

    const { message } = (await response
      .json()
      .catch(() => ({}))) as Partial<CreateBranchProps>;

    // A refusal is a refusal with or without a message: without one it
    // used to fall through as `{ successMessage: undefined }`, and the form
    // neither closed nor said anything.
    if (!response.ok) {
      return {
        createBranchError: {
          createBranchErrorMessage:
            message || "Não foi possível criar a filial. Tente novamente.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("branch/create-branch", error);
    return {
      createBranchError: {
        createBranchErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a filial.",
      },
    };
  }
};

export { handleCreateBranch };
