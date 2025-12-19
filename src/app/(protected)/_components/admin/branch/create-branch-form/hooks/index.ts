import { useEffect, useRef, useState } from "react";

import { CommandBusinessInputValue } from "@/app/(protected)/_components/dto";
import { CreateBranchFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

function useCreateBusinessForm(state: CreateBranchFormState | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  const [isCreateBranchForm, setIsCreateBranchForm] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<
    "select-business" | "create-branch"
  >("select-business");

  const [businessNotSelected, setBusinessNotSelected] = useState<
    string[] | undefined
  >(undefined);

  const [selectedBusiness, setSelectedBusiness] =
    useState<CommandBusinessInputValue>({
      businessId: "",
      searchBusinessInputValue: "",
    });

  useEffect(() => {
    if (!isCreateBranchForm) {
      toast.dismiss();
    }
  }, [isCreateBranchForm]);

  const handleOpenCreateBranchForm = () => {
    if (isCreateBranchForm) {
      formRef.current?.reset();
      setSelectedBusiness({
        businessId: "",
        searchBusinessInputValue: "",
      });
      setBusinessNotSelected(undefined);
    }

    setIsCreateBranchForm(!isCreateBranchForm);
  };

  const handleUpdateSearchBussinessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const { businessId, searchBusinessInputValue } = data;
    const updateSelectedBusiness =
      selectedBusiness.businessId === businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : { businessId, searchBusinessInputValue };

    setSelectedBusiness(updateSelectedBusiness);
    if (updateSelectedBusiness.businessId) {
      setBusinessNotSelected(undefined);
    }
  };

  const handleContinue = () => {
    if (!selectedBusiness.businessId) {
      setBusinessNotSelected(["Selecione uma empresa para continuar."]);
      return;
    }

    setCurrentStep("create-branch");
    setBusinessNotSelected(undefined);
  };

  const handleBack = () => {
    setCurrentStep("select-business");
  };

  const handleCloseDialog = () => {
    handleOpenCreateBranchForm();
    setCurrentStep("select-business");

    setSelectedBusiness({
      businessId: "",
      searchBusinessInputValue: "",
    });
    setBusinessNotSelected(undefined);
  };

  useEffect(() => {
    // Handle error case first
    if (state?.createBranchError?.createBranchErrorMessage) {
      toast.error(state.createBranchError.createBranchErrorMessage);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await Promise.all([
            revalidateTagName("create-branch"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                const isMatch =
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "branch";

                return isMatch;
              },
            }),
          ]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      performRevalidation();
      handleOpenCreateBranchForm();
    }

    return () => {
      toastShownRef.current = false;
    };
  }, [state]);

  const getBusinessIdError = () => {
    return state?.createBranchError?.businessId || businessNotSelected;
  };

  return {
    isCreateBranchForm,
    handleUpdateSearchBussinessInputValue,
    getBusinessIdError,
    handleContinue,
    handleCloseDialog,
    currentStep,
    selectedBusiness,
    handleBack,
    formRef,
  };
}

export { useCreateBusinessForm };
