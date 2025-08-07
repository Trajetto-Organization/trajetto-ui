import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleUpdateBranch } from "@/actions/update-branch";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { UpdateBranchContainerProps, UpdateBranchFormState } from "./dto";
import { BranchProps } from "../dto";

import { useCepValidation } from "../../../hooks";
import { useUpdateBranchForm } from "./hooks";

interface UpdateBranchProps {
  branchData: BranchProps;
  handleCloseUpdateBranch: () => void;
  isUpdateBranchOpen: boolean;
}

const UpdateBranchFormContainer = ({
  state,
  handleCloseUpdateBranch,
  branchData,
  isUpdateBranchOpen,
}: UpdateBranchContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, isDirty, cepLoading } = useCepValidation({
    initialData: branchData,
    isOpen: isUpdateBranchOpen,
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {updatedFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={
              ((state.updateBranchError ?? {}) as Record<string, string[]>)[
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
          onClick={handleCloseUpdateBranch}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading || !isDirty}>
          <span>Editar Filial</span>
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

const UpdateBranchForm = ({
  branchData,
  handleCloseUpdateBranch,
  isUpdateBranchOpen,
}: UpdateBranchProps): JSX.Element => {
  const defaultState: UpdateBranchFormState = {};
  const [state, dispatch] = useFormState(handleUpdateBranch, null);

  const { formRef } = useUpdateBranchForm({
    state,
    handleCloseUpdateBranch,
  });

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateBranchOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateBranch();
      }}
      open={isUpdateBranchOpen}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Filial</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            filial.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: branchData.businessId,
              branchId: branchData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <UpdateBranchFormContainer
            state={state ?? defaultState}
            handleCloseUpdateBranch={handleCloseUpdateBranch}
            branchData={branchData}
            isUpdateBranchOpen={isUpdateBranchOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateBranchForm };
