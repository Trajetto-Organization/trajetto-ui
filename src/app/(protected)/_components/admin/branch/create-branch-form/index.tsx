import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateBranch } from "@/actions/create-branch";
import {
  CreateBranchContainerProps,
  CreateBranchFormState,
  SelectBusinessByStepProps,
} from "./dto";

import { useCreateBusinessForm } from "./hooks";

import { SearchBusiness } from "../../../search-business";
import { useCepValidation } from "../../../hooks";

import { cn } from "@/lib/utils";

const SelectBusinessStep = ({
  searchBusinessInputValue,
  handleUpdateSearchBussinessInputValue,
  onContinue,
  errorBusinessId,
}: SelectBusinessByStepProps) => {
  return (
    <div className="space-y-6">
      {searchBusinessInputValue && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-dashed truncate h-8 text-center max-w-96 block leading-4",
            )}
          >
            {searchBusinessInputValue}
          </div>
          <Button
            className="h-8 w-4"
            variant="ghost"
            onClick={() =>
              handleUpdateSearchBussinessInputValue({
                businessId: "",
                searchBusinessInputValue: "",
              })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <SearchBusiness
        errorBusinessId={errorBusinessId}
        searchBusinessInputValue={searchBusinessInputValue}
        handleUpdateSearchBussinessInputValue={
          handleUpdateSearchBussinessInputValue
        }
      />

      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!searchBusinessInputValue}
        >
          Prosseguir
        </Button>
      </div>
    </div>
  );
};

const CreateBranchFormContainer = ({
  state,
  isCreateBranchForm,
  onBack,
}: CreateBranchContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading } = useCepValidation({
    isOpen: isCreateBranchForm,
  });

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
        <Button type="button" variant="outline" onClick={onBack}>
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
  const [state, dispatch] = useFormState(handleCreateBranch, null);

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
  } = useCreateBusinessForm(state);

  return (
    <Dialog open={isCreateBranchForm} onOpenChange={handleCloseDialog}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Filial
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            searchBusinessInputValue={selectedBusiness.searchBusinessInputValue}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            onContinue={handleContinue}
            errorBusinessId={getBusinessIdError()}
          />
        ) : (
          <form
            ref={formRef}
            action={(formData) => {
              formData.append("businessId", selectedBusiness.businessId);
              return dispatch(formData);
            }}
          >
            <CreateBranchFormContainer
              isCreateBranchForm={isCreateBranchForm}
              state={state ?? defaultState}
              onBack={handleBack}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateBranchForm };
