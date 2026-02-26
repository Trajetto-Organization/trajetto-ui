import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateBranch } from "@/actions/branch/create-branch";
import { CreateBranchFormSubmitProps, CreateBranchFormState } from "./dto";

import { useCreateBranchForm } from "./hooks";
import { useCepValidation } from "../../../hooks";

import { SelectBusinessStep } from "@/app/(protected)/_components/steps/select-business-step";

const CreateBranchFormSubmit = ({
  state,
  isCreateBranchForm,
  onBack,
  initialFormValues,
  onFormValuesChange,
}: CreateBranchFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading, formValues } = useCepValidation({
    isOpen: isCreateBranchForm,
    initialData: initialFormValues,
  });

  // Save form values when going back
  const handleBack = () => {
    onFormValuesChange(formValues);
    onBack();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {updatedFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={
              ((state.createBranchError ?? {}) as Record<string, string[]>)[
                field.name
              ]
            }
            disabled={field.disabled || pending}
          />
        ))}
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={pending || cepLoading}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={pending || cepLoading}>
          <span>Criar Filial</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

const CreateBranchForm = (): JSX.Element => {
  const defaultState: CreateBranchFormState = {};
  const [state, dispatch] = useFormState<CreateBranchFormState, FormData>(
    handleCreateBranch,
    defaultState,
  );

  const {
    isCreateBranchForm,
    getBusinessIdError,
    formRef,
    handleCloseDialog,
    currentStep,
    selectedBusiness,
    handleBack,
    handleUpdateSearchBussinessInputValue,
    handleContinue,
    branchFormValues,
    handleFormValuesChange,
  } = useCreateBranchForm(state);

  const createBranchForm = (branchFormData: FormData) => {
    branchFormData.append("businessId", selectedBusiness.businessId);
    return dispatch(branchFormData);
  };

  return (
    <Dialog open={isCreateBranchForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Filial
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === "select-business"
              ? "Selecionar Empresa"
              : "Criar Nova Filial"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {currentStep === "select-business"
              ? "Selecione a empresa para a qual deseja criar uma filial."
              : "Insira as informações solicitadas abaixo para concluir a criação da filial."}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "select-business" ? (
          <SelectBusinessStep
            commandBusinessInputValue={selectedBusiness}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form ref={formRef} action={createBranchForm}>
            <CreateBranchFormSubmit
              isCreateBranchForm={isCreateBranchForm}
              state={state}
              onBack={handleBack}
              initialFormValues={branchFormValues}
              onFormValuesChange={handleFormValuesChange}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateBranchForm };
