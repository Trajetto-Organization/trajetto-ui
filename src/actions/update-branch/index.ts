"use server";

import { createUpdateBranchSchema } from "@/schemas/create-update-branch-schema";
import { getCookies } from "../cookies";

interface UpdateBranchProps {
  message: string;
}

const handleUpdateBranch = async (state: any, updateBranchValues: FormData) => {
  if (updateBranchValues.type === "RESET") {
    return {};
  }

  const businessId = updateBranchValues.get("businessId");
  const branchId = updateBranchValues.get("branchId");

  const updateBranch = `${process.env.HTTP_REQUEST}/branch/update-branch/${branchId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(updateBranch, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(branchData),
    });

    const { message } = (await response.json()) as UpdateBranchProps;

    if (!response.ok && message) {
      return {
        updateBranchError: { updateBranchErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateBranchError: {
        updateBranchErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a filial.",
      },
    };
  }
};

export { handleUpdateBranch };
