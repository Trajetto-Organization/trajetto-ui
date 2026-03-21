"use client";

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
import FormInput from "@/components/shared/custom/form-input";

import type {
  DashboardCreateProfileAccessFormState,
  DashboardCreateProfileAccessFormSubmitProps,
} from "./dashboard-create-profile-access-form.types";
import { handleCreateProfileAccess } from "@/actions/profile-access/create-profile-access";

import { useAuthStore } from "@/store/auth-store";
import { useHasPermission } from "@/lib/user-has-permission";

import { permissions } from "@/lib/permissions";
import { useCreateDashboardProfileAccessForm } from "./hooks";

const DashboardCreateProfileAccessFormSubmit = ({
  state,
  handleOpenCreateProfileAccessForm,
}: DashboardCreateProfileAccessFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-4 mt-2">
        <FormInput
          label={"Nome do perfil *"}
          htmlfor={"name"}
          name="name"
          type="text"
          errorName={state.createProfileAccessError?.name}
          autoComplete="profile-access"
          placeholder={"Nome do perfil, ex: Admin"}
          disabled={pending}
        />
      </div>

      <div className="flex gap-2 mt-6 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateProfileAccessForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          <span>Criar Perfil</span>
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

const DashboardCreateProfileAccessForm = (): JSX.Element => {
  const defaultState: DashboardCreateProfileAccessFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateProfileAccessFormState,
    FormData
  >(handleCreateProfileAccess, defaultState);

  const {
    isCreateCreateProfileAccessForm,
    handleOpenCreateProfileAccessForm,
    formRef,
  } = useCreateDashboardProfileAccessForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.PROFILE_ACCESS_MANAGE,
    "write",
  );

  const createProfileAccessForm = (profileAccessFormData: FormData) => {
    profileAccessFormData.append("businessId", businessId as string);
    return dispatch(profileAccessFormData);
  };

  return (
    <Dialog
      open={isCreateCreateProfileAccessForm}
      onOpenChange={handleOpenCreateProfileAccessForm}
    >
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8">
          Criar Perfil
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Perfil</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            Perfil.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createProfileAccessForm}>
          <DashboardCreateProfileAccessFormSubmit
            handleOpenCreateProfileAccessForm={
              handleOpenCreateProfileAccessForm
            }
            state={state ?? defaultState}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateProfileAccessForm };
