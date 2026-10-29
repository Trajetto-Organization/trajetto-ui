"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import {
  permissions as PERMISSIONS,
  permissionLabels,
} from "@/lib/permissions";

import { handleBulkConfigurePermissions } from "@/actions/profile-access/bulk-configure-permissions";
import { useBulkConfigurePermissionsDialog } from "./hooks";

import type {
  BulkConfigurePermissionsDialogProps,
  BulkConfigurePermissionsFormState,
} from "./bulk-configure-permissions-dialog.types";
import type { PermissionConfigMap } from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { permissionKeysInPlan } from "@/lib/route-access";
import { useAuthStore } from "@/store/auth-store";

const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS) as string[];

interface BulkConfigurePermissionsFormSubmitProps {
  state: BulkConfigurePermissionsFormState;
  config: PermissionConfigMap;
  setConfig: React.Dispatch<React.SetStateAction<PermissionConfigMap>>;
  isLoadingPermissions: boolean;
  isDirty: boolean;
  handleClose: () => void;
}

const BulkConfigurePermissionsFormSubmit = ({
  config,
  setConfig,
  isLoadingPermissions,
  isDirty,
  handleClose,
}: BulkConfigurePermissionsFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  // Rows of a module the company did not hire are not offered. A hidden key
  // keeps its loaded level in `config`, so the replace-all save never wipes it.
  const visibleKeys = permissionKeysInPlan(ALL_PERMISSION_KEYS, {
    role,
    enabledModules,
  });

  return (
    <>
      {/* Column headers — visible only on sm+ */}
      <div
        className="flex items-center justify-between 
        gap-4 px-2 py-2 border-b mb-1"
      >
        <span
          className="text-xs font-semibold tracking-wide
          text-muted-foreground flex-1 uppercase"
        >
          Permissão
        </span>
        <div
          className="hidden sm:flex items-center shrink-0 tracking-wide
          text-xs font-semibold text-muted-foreground uppercase"
        >
          <span className="w-[82px] text-center">Sem acesso</span>
          <span className="w-[72px] text-center">Leitura</span>
          <span className="w-[96px] text-center">Leit. e Escrita</span>
        </div>
      </div>

      {/* Permission rows */}
      {isLoadingPermissions ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {visibleKeys.map((key, index) => (
            <div key={key}>
              <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between 
                gap-2 px-2 py-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {permissionLabels[key as keyof typeof permissionLabels]}
                  </span>
                </div>

                <RadioGroup
                  value={config[key]}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      [key]: value as "none" | "read" | "write",
                    }))
                  }
                  className="flex items-center gap-4 sm:gap-0 shrink-0 pl-5 sm:pl-0"
                  disabled={pending}
                >
                  <div
                    className="flex items-center gap-1.5 
                    sm:w-[82px] sm:justify-center"
                  >
                    <RadioGroupItem value="none" id={`${key}-none`} />
                    <Label
                      htmlFor={`${key}-none`}
                      className="text-xs cursor-pointer 
                      text-muted-foreground sm:hidden"
                    >
                      Sem acesso
                    </Label>
                  </div>
                  <div
                    className="flex items-center gap-1.5 
                    sm:w-[72px] sm:justify-center"
                  >
                    <RadioGroupItem value="read" id={`${key}-read`} />
                    <Label
                      htmlFor={`${key}-read`}
                      className="text-xs cursor-pointer sm:hidden"
                    >
                      Leitura
                    </Label>
                  </div>
                  <div
                    className="flex items-center gap-1.5 
                    sm:w-[96px] sm:justify-center"
                  >
                    <RadioGroupItem value="write" id={`${key}-write`} />
                    <Label
                      htmlFor={`${key}-write`}
                      className="text-xs cursor-pointer sm:hidden"
                    >
                      Leit. e Escrita
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {index < visibleKeys.length - 1 && (
                <Separator className="opacity-40" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Responsive footer */}
      <div
        className="flex flex-col-reverse gap-2 
        pt-4 mt-2 border-t sm:flex-row sm:justify-end"
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || isLoadingPermissions || !isDirty}
          className="w-full sm:w-auto"
        >
          {pending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar configuração"
          )}
        </Button>
      </div>
    </>
  );
};

const BulkConfigurePermissionsDialog = ({
  profileAccessId,
  businessId,
  profileName,
  isOpen,
  onClose,
}: BulkConfigurePermissionsDialogProps): JSX.Element => {
  const defaultState: BulkConfigurePermissionsFormState = {};
  const [state, dispatch] = useFormState<
    BulkConfigurePermissionsFormState,
    FormData
  >(guardFormAction(handleBulkConfigurePermissions), defaultState);

  const {
    formRef,
    config,
    setConfig,
    isLoadingPermissions,
    isDirty,
    handleClose,
  } = useBulkConfigurePermissionsDialog(
    state,
    isOpen,
    onClose,
    profileAccessId,
    businessId,
  );

  const handleFormAction = (formData: FormData) => {
    const permissionsToSend = Object.entries(config)
      .filter(([_, level]) => level !== "none")
      .map(([key, level]) => ({
        permissionKey: key,
        canRead: true,
        canWrite: level === "write",
      }));

    formData.append("businessId", businessId);

    formData.append("profileAccessId", profileAccessId);
    formData.append("permissions", JSON.stringify(permissionsToSend));

    return dispatch(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogScrollContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Configurar Permissões</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Defina as permissões de acesso para o perfil{" "}
            <strong>{profileName}</strong>. As alterações substituem todas as
            permissões existentes.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleFormAction} className="mt-2">
          <BulkConfigurePermissionsFormSubmit
            state={state}
            config={config}
            setConfig={setConfig}
            isLoadingPermissions={isLoadingPermissions}
            isDirty={isDirty}
            handleClose={handleClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { BulkConfigurePermissionsDialog };
