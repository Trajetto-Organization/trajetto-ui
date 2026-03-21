import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import type { DashboardPermissionProps } from "../dashboard-permission.types";
import type {
  DashboardUpdatePermissionFormSubmitProps,
  DashboardUpdatePermissionFormState,
} from "./dashboard-update-permission-form.types";

import { handleUpdatePermission } from "@/actions/permission/update-permission";
import { useUpdatePermissionForm } from "./hooks";

import { Button, buttonVariants } from "@/components/ui/button";
import { appendDataToForm } from "@/lib/append-data-form";

import { DashboardUpdatePermission } from "./dashboard-update-permission";
import { SearchProfileAccess } from "@/app/(protected)/_components/shared/searches/search-profile-access";

import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

interface DashboardUpdatePermissionProps {
  permissionData: DashboardPermissionProps;
  handleOpenUpdatePermission: () => void;
  isUpdatePermission: boolean;
}

const DashboardUpdatePermissionFormSubmit = ({
  state,
  handleCloseUpdatePermission,
  handleUpdatePermissionName,
  handleUpdateCanReadPermission,
  handleUpdateCanWritePermission,
  handleUpdateSearchProfileAccessInputValue,
  handleUpdatePermissionKeyName,
  isDirty,
  permissionValues: {
    permissionName,
    permissionKeyName,
    canRead,
    canWrite,
    commandProfileAccessInputValue: { searchProfileAccessInputValue },
  },
}: DashboardUpdatePermissionFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { businessId } = useAuthStore();

  return (
    <div className="space-y-6 mt-2">
      <DashboardUpdatePermission
        canRead={canRead}
        canWrite={canWrite}
        permissionName={permissionName}
        permissionKeyName={permissionKeyName}
        handleUpdateCanReadPermission={handleUpdateCanReadPermission}
        handleUpdateCanWritePermission={handleUpdateCanWritePermission}
        handleUpdatePermissionName={handleUpdatePermissionName}
        handleUpdatePermissionKeyName={handleUpdatePermissionKeyName}
        state={state}
      />

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
          errorProfileAccessId={state.updatePermissionError?.profileAccessId}
          businessId={businessId as string}
          handleUpdateSearchProfileAccessInputValue={
            handleUpdateSearchProfileAccessInputValue
          }
          searchProfileAccessInputValue={searchProfileAccessInputValue}
        />
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleCloseUpdatePermission}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty} className="flex-1">
          Editar Permissão
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

const DashboardUpdatePermissionForm = ({
  permissionData,
  handleOpenUpdatePermission,
  isUpdatePermission,
}: DashboardUpdatePermissionProps): JSX.Element => {
  const defaultState: DashboardUpdatePermissionFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdatePermissionFormState,
    FormData
  >(handleUpdatePermission, defaultState);

  const {
    handleUpdatePermissionName,
    handleUpdatePermissionKeyName,
    permissionKey,
    permission,
    canRead,
    canWrite,
    handleUpdateCanReadPermission,
    handleUpdateCanWritePermission,
    handleUpdateSearchProfileAccessInputValue,
    commandProfileAccessInputValue,
    isDirty,
    formRef,
  } = useUpdatePermissionForm({
    state,
    handleOpenUpdatePermission,
    permissionValues: permissionData,
    isUpdatePermission,
  });

  const { businessId } = useAuthStore();

  const updatePermissionForm = (permissionFormData: FormData) => {
    const updatePermissionData = {
      businessId: businessId as string,
      profileAccessId: commandProfileAccessInputValue.profileAccessId,
      permissionId: permissionData.id,
    };

    appendDataToForm(permissionFormData, updatePermissionData);
    return dispatch(permissionFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdatePermission) {
          formRef.current?.reset();

          const resetProfileAccessInputValue = {
            searchProfileAccessInputValue: "",
            profileAccessId: "",
          };

          handleUpdateSearchProfileAccessInputValue(
            resetProfileAccessInputValue,
          );

          handleUpdatePermissionName("");
          handleUpdatePermissionKeyName("");

          handleUpdateCanReadPermission(false);
          handleUpdateCanWritePermission(false);
        }

        handleOpenUpdatePermission();
      }}
      open={isUpdatePermission}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Permissão</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            permissão.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updatePermissionForm}>
          <DashboardUpdatePermissionFormSubmit
            state={state}
            handleCloseUpdatePermission={handleOpenUpdatePermission}
            handleUpdatePermissionName={handleUpdatePermissionName}
            handleUpdatePermissionKeyName={handleUpdatePermissionKeyName}
            handleUpdateCanReadPermission={handleUpdateCanReadPermission}
            handleUpdateCanWritePermission={handleUpdateCanWritePermission}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            isDirty={isDirty}
            permissionValues={{
              canRead,
              canWrite,
              permissionName: permission,
              permissionKeyName: permissionKey,
              commandProfileAccessInputValue,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdatePermissionForm };
