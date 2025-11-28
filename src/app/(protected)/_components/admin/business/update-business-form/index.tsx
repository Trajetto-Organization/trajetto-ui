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

import { UpdateBusinessContainerProps, UpdateBusinessFormState } from "./dto";
import { handleUpdateBusiness } from "@/actions/update-business";

import { BusinessProps } from "../../../dto";

import { useCepValidation } from "../../../hooks";
import { useUpdateBusinessForm } from "./hooks";

interface UpdateBusinessProps {
  businessData: BusinessProps;
  handleCloseUpdateBusiness: () => void;
  isUpdateBusinessOpen: boolean;
}

const UpdateBusinessFormContainer = ({
  state,
  handleCloseUpdateBusiness,
  businessData,
  isUpdateBusinessOpen,
}: UpdateBusinessContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, isDirty, cepLoading } = useCepValidation({
    initialData: businessData,
    isOpen: isUpdateBusinessOpen,
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {updatedFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={
              ((state.updateBusinessError ?? {}) as Record<string, string[]>)[
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
          onClick={handleCloseUpdateBusiness}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading || !isDirty}>
          <span>Editar Empresa</span>
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

const UpdateBusinessForm = ({
  businessData,
  handleCloseUpdateBusiness,
  isUpdateBusinessOpen,
}: UpdateBusinessProps): JSX.Element => {
  const defaultState: UpdateBusinessFormState = {};
  const [state, dispatch] = useFormState(handleUpdateBusiness, null);

  const { formRef } = useUpdateBusinessForm({
    state,
    handleCloseUpdateBusiness,
  });

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateBusinessOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateBusiness();
      }}
      open={isUpdateBusinessOpen}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Empresa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            empresa.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            formData.append("businessId", businessData.id);
            return dispatch(formData);
          }}
        >
          <UpdateBusinessFormContainer
            state={state ?? defaultState}
            handleCloseUpdateBusiness={handleCloseUpdateBusiness}
            businessData={businessData}
            isUpdateBusinessOpen={isUpdateBusinessOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateBusinessForm };
