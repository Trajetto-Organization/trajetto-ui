import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import { handleCreateBusiness } from "@/actions/business/create-business";

import { useCreateBusinessForm } from "./hooks";
import { useCepValidation } from "../../../hooks";

import { CreateBusinessSubmitProps, CreateBusinessFormState } from "./dto";

const CreateBusinessFormSubmit = ({
  state,
  handleOpenCreateBusinessForm,
  isCreateBusinessForm,
}: CreateBusinessSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading } = useCepValidation({
    isOpen: isCreateBusinessForm,
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {updatedFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={
              ((state.createBusinessError ?? {}) as Record<string, string[]>)[
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
          onClick={handleOpenCreateBusinessForm}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading}>
          <span>Criar Empresa</span>
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

const CreateBusinessForm = (): JSX.Element => {
  const defaultState: CreateBusinessFormState = {};
  const [state, dispatch] = useFormState<CreateBusinessFormState, FormData>(
    handleCreateBusiness,
    defaultState,
  );

  const { isCreateBusinessForm, handleOpenCreateBusinessForm, formRef } =
    useCreateBusinessForm(state);

  return (
    <Dialog
      open={isCreateBusinessForm}
      onOpenChange={handleOpenCreateBusinessForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Empresa
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Nova Empresa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação da
            empresa.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={dispatch}>
          <CreateBusinessFormSubmit
            handleOpenCreateBusinessForm={handleOpenCreateBusinessForm}
            isCreateBusinessForm={isCreateBusinessForm}
            state={state}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateBusinessForm };
