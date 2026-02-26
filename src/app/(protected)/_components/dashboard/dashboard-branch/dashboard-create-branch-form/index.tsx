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
import {
  DashboardCreateBranchFormSubmitProps,
  DashboardCreateBranchFormState,
} from "./dto";

import { useDashboardCreateBusinessForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";
import { useCepValidation } from "../../../hooks";

import { permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

const DashboardCreateBranchFormSubmit = ({
  state,
  isCreateBranchForm,
  handleOpenCreateBranchForm,
}: DashboardCreateBranchFormSubmitProps): JSX.Element => {
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
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateBranchForm}
        >
          Cancelar
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

const DashboardCreateBranchForm = (): JSX.Element => {
  const defaultState: DashboardCreateBranchFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateBranchFormState,
    FormData
  >(handleCreateBranch, defaultState);

  const { isCreateBranchForm, formRef, handleOpenCreateBranchForm } =
    useDashboardCreateBusinessForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.BRANCH_MANAGE,
    "write",
  );

  const createBranchForm = (branchFormData: FormData) => {
    branchFormData.append("businessId", businessId as string);
    return dispatch(branchFormData);
  };

  return (
    <Dialog open={isCreateBranchForm} onOpenChange={handleOpenCreateBranchForm}>
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8 w-full">
          Criar Filial
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Nova Filial</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação da
            filial.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createBranchForm}>
          <DashboardCreateBranchFormSubmit
            isCreateBranchForm={isCreateBranchForm}
            state={state}
            handleOpenCreateBranchForm={handleOpenCreateBranchForm}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateBranchForm };
