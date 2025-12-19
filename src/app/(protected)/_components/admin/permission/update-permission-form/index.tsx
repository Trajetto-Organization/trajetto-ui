import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import { PermissionProps } from "../dto";
import {
  UpdatePermissionFormSubmitProps,
  UpdatePermissionFormState,
} from "./dto";

import { handleUpdatePermission } from "@/actions/update-permission";
import { useUpdatePermissionForm } from "./hooks";

import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { UpdatePermission } from "./update-permission";

import { SearchBusiness } from "../../../search-business";
import { SearchProfileAccess } from "../../../search-profile-access";

interface UpdatePermissionProps {
  permissionData: PermissionProps;
  handleOpenUpdatePermission: () => void;
  isUpdatePermission: boolean;
}

const UpdatePermissionFormSubmit = ({
  state,
  handleCloseUpdatePermission,
  handleUpdatePermissionName,
  handleUpdateCanReadPermission,
  handleUpdateCanWritePermission,
  handleUpdateSearchBusinessInputValue,
  handleUpdateSearchProfileAccessInputValue,
  handleUpdatePermissionKeyName,
  isDirty,
  permissionValues: {
    permissionName,
    permissionKeyName,
    canRead,
    canWrite,
    commandBusinessInputValue: { searchBusinessInputValue, businessId },
    commandProfileAccessInputValue: { searchProfileAccessInputValue },
  },
}: UpdatePermissionFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <UpdatePermission
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
          errorBusinessId={state.updatePermissionError?.businessId}
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBusinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
        />

        {searchBusinessInputValue && (
          <SearchProfileAccess
            errorProfileAccessId={state.updatePermissionError?.profileAccessId}
            businessId={businessId}
            handleUpdateSearchProfileAccessInputValue={
              handleUpdateSearchProfileAccessInputValue
            }
            searchProfileAccessInputValue={searchProfileAccessInputValue}
          />
        )}
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

const UpdatePermissionForm = ({
  permissionData,
  handleOpenUpdatePermission,
  isUpdatePermission,
}: UpdatePermissionProps): JSX.Element => {
  const defaultState: UpdatePermissionFormState = {};
  const [state, dispatch] = useFormState<UpdatePermissionFormState, FormData>(
    handleUpdatePermission,
    defaultState,
  );

  const {
    handleUpdatePermissionName,
    handleUpdatePermissionKeyName,
    permissionKey,
    permission,
    canRead,
    canWrite,
    handleUpdateCanReadPermission,
    handleUpdateCanWritePermission,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchProfileAccessInputValue,
    commandBusinessInputValue,
    commandProfileAccessInputValue,
    isDirty,
    formRef,
  } = useUpdatePermissionForm({
    state,
    handleOpenUpdatePermission,
    permissionValues: permissionData,
    isUpdatePermission,
  });

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdatePermission) {
          formRef.current?.reset();

          const resetBusinessInputValue = {
            searchBusinessInputValue: "",
            businessId: "",
          };

          const resetProfileAccessInputValue = {
            searchProfileAccessInputValue: "",
            profileAccessId: "",
          };

          handleUpdateSearchBusinessInputValue(resetBusinessInputValue);
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
      <DialogScrollContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Permissão</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            permissão.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: commandBusinessInputValue.businessId,
              profileAccessId: commandProfileAccessInputValue.profileAccessId,
              permissionId: permissionData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <UpdatePermissionFormSubmit
            state={state}
            handleCloseUpdatePermission={handleOpenUpdatePermission}
            handleUpdatePermissionName={handleUpdatePermissionName}
            handleUpdatePermissionKeyName={handleUpdatePermissionKeyName}
            handleUpdateCanReadPermission={handleUpdateCanReadPermission}
            handleUpdateCanWritePermission={handleUpdateCanWritePermission}
            handleUpdateSearchBusinessInputValue={
              handleUpdateSearchBusinessInputValue
            }
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
              commandBusinessInputValue,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdatePermissionForm };
