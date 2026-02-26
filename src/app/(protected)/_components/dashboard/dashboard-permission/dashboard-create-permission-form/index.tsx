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
  DashboardCreatePermissionFormSubmitProps,
  DashboardCreatePermissionFormState,
} from "./dto";

import { handleCreatePermission } from "@/actions/permission/create-permission";
import { useDashboardCreatePermissionForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { DashboardCreatePermission } from "./dashboard-create-permission";

import { SearchProfileAccess } from "../../../search-profile-access";
import { useAuthStore } from "@/store/auth-store";

import { permissions } from "@/lib/permissions";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

const DashboardCreatePermissionFormSubmit = ({
  state,
  handleOpenCreatePermissionForm,
  handleUpdateSearchProfileAccessInputValue,
  commandProfileAccessInputValue: { searchProfileAccessInputValue },
}: DashboardCreatePermissionFormSubmitProps) => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

  return (
    <div className="space-y-6 mt-2">
      <DashboardCreatePermission state={state} />

      {searchProfileAccessInputValue && (
        <div className="grid grid-cols-1 gap-4 w-full">
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

      <div className="grid grid-cols-1 gap-4">
        <SearchProfileAccess
          errorProfileAccessId={state.createPermissionError?.profileAccessId}
          searchProfileAccessInputValue={searchProfileAccessInputValue}
          businessId={businessId as string}
          handleUpdateSearchProfileAccessInputValue={
            handleUpdateSearchProfileAccessInputValue
          }
        />
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

const DashboardCreatePermissionForm = (): JSX.Element => {
  const defaultState: DashboardCreatePermissionFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreatePermissionFormState,
    FormData
  >(handleCreatePermission, defaultState);

  const {
    isCreatePermissionForm,
    handleOpenCreatePermissionForm,
    commandProfileAccessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    formRef,
  } = useDashboardCreatePermissionForm(state);

  const { businessId } = useAuthStore();
  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.USER_PERMISSION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.USER_PERMISSION_MANAGE),
    },
    {
      key: permissions.PROFILE_ACCESS_MANAGE,
      action: "read",
      label: getPermissionName(permissions.PROFILE_ACCESS_MANAGE),
    },
  ]);

  const createPermissionForm = (permissionFormData: FormData) => {
    const permissionData = {
      businessId: businessId as string,
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
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger
                asChild
                disabled={!permissionsRequired.hasAllPermissions}
                data-tutorial="create-button"
              >
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={!permissionsRequired.hasAllPermissions}
                >
                  Criar Permissão
                </Button>
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {!permissionsRequired.hasAllPermissions && (
            <TooltipContent className="max-w-sm">
              <p>{permissionsRequired.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

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
          <DashboardCreatePermissionFormSubmit
            state={state}
            handleOpenCreatePermissionForm={handleOpenCreatePermissionForm}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            commandProfileAccessInputValue={commandProfileAccessInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreatePermissionForm };
