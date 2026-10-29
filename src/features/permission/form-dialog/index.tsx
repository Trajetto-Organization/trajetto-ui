"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import FormInput from "@/components/shared/custom/form-input";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { PickedField } from "@/app/(protected)/_components/shared/custom/picked-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";
import { SearchProfileAccess } from "@/app/(protected)/_components/shared/searches/search-profile-access";

import { handleCreatePermission } from "@/actions/permission/create-permission";
import { handleUpdatePermission } from "@/actions/permission/update-permission";

import { createUpdatePermissionSchema } from "@/schemas/create-update-permission-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { guardFormAction } from "@/lib/action-result";
import { useAuthStore } from "@/store/auth-store";

import {
  changedPermissionFields,
  permissionFormValuesOf,
  resourceOptions,
  withReadRule,
  type PermissionFormValues,
} from "../lib/permission-rules";
import { refreshAfterPermissionWrite } from "../lib/after-write";
import type { PermissionRow } from "../types";

type FieldErrors = Partial<
  Record<keyof PermissionFormValues | "businessId", string[]>
>;

interface PermissionFormState {
  createPermissionError?: FieldErrors & {
    createPermissionErrorMessage?: string;
  };
  updatePermissionError?: FieldErrors & {
    updatePermissionErrorMessage?: string;
  };
  successMessage?: string;
}

interface PermissionFormDialogProps {
  /** The page's company: the selector's on /admin, the session's on /dashboard. */
  businessId: string;
  /** Present when editing. */
  permission?: PermissionRow;
  isOpen: boolean;
  onClose: () => void;
}

const SubmitRow = ({
  isEdit,
  canSubmit,
  onCancel,
}: {
  isEdit: boolean;
  canSubmit: boolean;
  onCancel: () => void;
}) => {
  const { pending } = useFormStatus();

  return (
    <DialogFormFooter className="mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={pending}
        {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
      >
        Cancelar
      </Button>

      <Button type="submit" disabled={pending || !canSubmit}>
        <span>{isEdit ? "Salvar Alterações" : "Criar Permissão"}</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </DialogFormFooter>
  );
};

/**
 * Creating and editing a permission, one dialog for /admin and /dashboard
 * (decision 8.7). The company is the page's: the /admin copy asked for one
 * inside the dialog and could point a permission at another company's
 * profile, which the API refuses. Read is mandatory (write needs it), and
 * Save stays disabled until something changed (decision 2.5).
 */
const PermissionFormDialog = ({
  businessId,
  permission,
  isOpen,
  onClose,
}: PermissionFormDialogProps): JSX.Element => {
  const isEdit = Boolean(permission);
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);

  const [state, dispatch] = useFormState<PermissionFormState, FormData>(
    guardFormAction(isEdit ? handleUpdatePermission : handleCreatePermission),
    {},
  );

  const original = useMemo(
    () => permissionFormValuesOf(permission),
    [permission],
  );

  const [action, setAction] = useState<string>(original.action);
  const [permissionKey, setPermissionKey] = useState<string>(
    original.permissionKey,
  );
  const [profile, setProfile] = useState<{ id: string; name: string }>({
    id: permission?.profileAccessId ?? "",
    name: permission?.profileAccess.name ?? "",
  });
  const [canRead, setCanRead] = useState<boolean>(original.canRead);
  const [canWrite, setCanWrite] = useState<boolean>(original.canWrite);

  const current = withReadRule({
    action,
    permissionKey,
    profileAccessId: profile.id,
    canRead,
    canWrite,
  });

  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: changedPermissionFields(original, current).length > 0,
  });

  const handledState = useRef<PermissionFormState | null>(null);

  const errors = isEdit
    ? state.updatePermissionError
    : state.createPermissionError;
  const errorMessage =
    state.createPermissionError?.createPermissionErrorMessage ??
    state.updatePermissionError?.updatePermissionErrorMessage;

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterPermissionWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
  }, [state, errorMessage, isEdit, onClose]);

  // Live validation (decision 16.700): the action's schema, fed the
  // checkboxes the way a browser posts them.
  const live = useLiveValidation({
    schema: createUpdatePermissionSchema,
    values: {
      ...current,
      businessId,
      canRead: current.canRead ? "on" : undefined,
      canWrite: current.canWrite ? "on" : undefined,
    },
    // The read rule is an object refine, which waits for every other field
    // to be valid; as a client rule it shows as soon as the box is left.
    rules: () => ({
      canRead: current.canRead
        ? null
        : "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    }),
    fields: ["action", "permissionKey", "canRead", "profileAccessId"],
    serverErrors: errors,
    controlIds: {
      action: "permission-action",
      permissionKey: "permission-key",
      canRead: "permission-read",
    },
  });

  const submit = (formData: FormData) => {
    // The submit listener already stopped an invalid form; this guards a
    // programmatic submit that bypassed it.
    if (!live.isValid()) return;

    formData.set("action", current.action);
    formData.set("permissionKey", current.permissionKey);
    formData.set("profileAccessId", current.profileAccessId);
    formData.set("businessId", businessId);

    // The action's schema reads checkboxes the way a browser posts them.
    formData.delete("canRead");
    formData.delete("canWrite");
    if (current.canRead) formData.set("canRead", "on");
    if (current.canWrite) formData.set("canWrite", "on");

    if (permission) formData.set("permissionId", permission.id);

    return dispatch(formData);
  };

  const accessError = live.errorOf("canRead") ?? live.errorOf("canWrite");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogScrollContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Permissão" : "Criar Nova Permissão"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere o recurso, o tipo de acesso ou o perfil. Quem usa o perfil vê a mudança na hora."
              : "Escolha o recurso do sistema, se ele só é consultado ou também alterado, e o perfil que recebe a permissão."}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={live.ref}
          action={submit}
          noValidate
          className="space-y-4"
          data-permission-form
        >
          <FormInput
            label="Nome da permissão *"
            htmlfor="permission-action"
            name="action"
            type="text"
            placeholder="Ex.: Consultar veículos"
            value={action}
            onChange={(event) => setAction(event.currentTarget.value)}
            errorName={live.errorOf("action")}
          />

          <SelectField
            label="Recurso *"
            htmlfor="permission-key"
            name="permissionKey"
            placeholder="Selecione o recurso do sistema"
            value={permissionKey}
            onChange={setPermissionKey}
            errorName={live.errorOf("permissionKey")}
            options={resourceOptions(
              { role, enabledModules },
              permission?.permissionKey,
            )}
          />

          <FieldShell
            label="Tipo de acesso *"
            htmlFor="permission-read"
            error={accessError}
            hint="Escrita inclui a leitura: sem leitura o perfil não acessa o recurso."
          >
            {(control) => (
              // Both boxes are one answer: moving from Leitura to Escrita
              // is not leaving the field.
              <div
                data-live-field="canRead"
                className="flex items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    {...control}
                    checked={canRead}
                    onCheckedChange={(checked) => {
                      setCanRead(checked === true);
                      if (checked !== true) setCanWrite(false);
                    }}
                  />
                  <Label htmlFor={control.id}>Leitura</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="permission-write"
                    checked={canWrite}
                    disabled={!canRead}
                    onCheckedChange={(checked) => setCanWrite(checked === true)}
                  />
                  <Label htmlFor="permission-write">Escrita</Label>
                </div>
              </div>
            )}
          </FieldShell>

          {/* The profile last (owner's request, 08/10/2026): what the
              permission is and what it allows come first, then who gets it. */}
          {profile.id ? (
            <PickedField
              label="Perfil de acesso *"
              htmlFor="permission-profile-picked"
              value={profile.name}
              clearLabel="Remover perfil"
              onClear={() => setProfile({ id: "", name: "" })}
            />
          ) : (
            // The wrapper names the field: the search's input id is generated.
            <div data-live-field="profileAccessId">
              <SearchProfileAccess
                businessId={businessId}
                // The API refuses a user's own profile here; it is not offered.
                editableOnly
                searchProfileAccessInputValue={profile.name}
                errorProfileAccessId={live.errorOf("profileAccessId")}
                handleUpdateSearchProfileAccessInputValue={(picked) =>
                  setProfile({
                    id: picked.profileAccessId,
                    name: picked.searchProfileAccessInputValue,
                  })
                }
              />
            </div>
          )}

          <SubmitRow isEdit={isEdit} canSubmit={canSubmit} onCancel={onClose} />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { PermissionFormDialog };
