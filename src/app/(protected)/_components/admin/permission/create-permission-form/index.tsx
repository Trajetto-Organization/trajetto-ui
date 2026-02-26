"use client";

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
import {
  CreatePermissionFormSubmitProps,
  CreatePermissionFormState,
} from "./dto";

import { handleCreatePermission } from "@/actions/permission/create-permission";
import { useCreatePermissionForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { SearchBusiness } from "../../../search-business";

import { CreatePermission } from "./create-permission";
import { SearchProfileAccess } from "../../../search-profile-access";

import { cn } from "@/lib/utils";

const CreatePermissionFormSubmit = ({
  state,
  handleOpenCreatePermissionForm,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchProfileAccessInputValue,
  commandBusinessInputValue: { searchBusinessInputValue, businessId },
  commandProfileAccessInputValue: { searchProfileAccessInputValue },
}: CreatePermissionFormSubmitProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <CreatePermission state={state} />

      {(searchProfileAccessInputValue || searchBusinessInputValue) && (
        <div className="grid grid-cols-2 gap-4 w-full">
          {searchBusinessInputValue && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Empresa:</span>
                <span className="w-full truncate">
                  {searchBusinessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchBusinessInputValue({
                    businessId: "",
                    searchBusinessInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}

          {searchProfileAccessInputValue && (
            <div className="flex items-center gap-2 w-full ml-auto">
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-dashed truncate h-8 text-left",
                )}
              >
                <span>Perfil:</span>
                <span className="w-full truncate">
                  {searchProfileAccessInputValue}
                </span>
              </div>

              <Button
                className="h-8 w-4"
                variant="ghost"
                onClick={() =>
                  handleUpdateSearchProfileAccessInputValue({
                    profileAccessId: "",
                    searchProfileAccessInputValue: "",
                  })
                }
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={`grid ${
          searchBusinessInputValue
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        } gap-4`}
      >
        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.createPermissionError?.businessId}
        />

        {searchBusinessInputValue && (
          <SearchProfileAccess
            errorProfileAccessId={state.createPermissionError?.profileAccessId}
            searchProfileAccessInputValue={searchProfileAccessInputValue}
            businessId={businessId}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
          />
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreatePermissionForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Permissão
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

const CreatePermissionForm = (): JSX.Element => {
  const defaultState: CreatePermissionFormState = {};
  const [state, dispatch] = useFormState<CreatePermissionFormState, FormData>(
    handleCreatePermission,
    defaultState,
  );

  const {
    isCreatePermissionForm,
    handleOpenCreatePermissionForm,
    commandBusinessInputValue,
    commandProfileAccessInputValue,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    formRef,
  } = useCreatePermissionForm(state);

  const createPermissionForm = (permissionFormData: FormData) => {
    const permissionData = {
      businessId: commandBusinessInputValue.businessId,
      profileAccessId: commandProfileAccessInputValue.profileAccessId,
    };

    appendDataToForm(permissionFormData, permissionData);
    return dispatch(permissionFormData);
  };

  return (
    <Dialog
      open={isCreatePermissionForm}
      onOpenChange={handleOpenCreatePermissionForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Permissão
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Nova Permissão</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação da
            Permissão.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={createPermissionForm}>
          <CreatePermissionFormSubmit
            state={state}
            handleOpenCreatePermissionForm={handleOpenCreatePermissionForm}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            commandBusinessInputValue={commandBusinessInputValue}
            commandProfileAccessInputValue={commandProfileAccessInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreatePermissionForm };
