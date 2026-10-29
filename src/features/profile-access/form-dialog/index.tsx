"use client";

import { useEffect, useRef, useState } from "react";
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
import FormInput from "@/components/shared/custom/form-input";

import { handleCreateProfileAccess } from "@/actions/profile-access/create-profile-access";
import { handleUpdateProfileAccess } from "@/actions/profile-access/update-profile-access";

import { createUpdateProfileAccessSchema } from "@/schemas/create-update-profile-access-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { guardFormAction } from "@/lib/action-result";

import { profileNameChanged } from "../lib/profile-access-rules";
import { refreshAfterProfileWrite } from "../lib/after-write";
import type { ProfileAccessRow } from "../types";

interface ProfileFormState {
  createProfileAccessError?: {
    name?: string[];
    businessId?: string[];
    createProfileAccessErrorMessage?: string;
  };
  updateProfileAccessError?: {
    name?: string[];
    businessId?: string[];
    updateProfileAccessErrorMessage?: string;
  };
  successMessage?: string;
}

interface ProfileAccessFormDialogProps {
  /** The page's company: the selector's on /admin, the session's on /dashboard. */
  businessId: string;
  /** Present when editing. */
  profile?: ProfileAccessRow;
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
        <span>{isEdit ? "Salvar Alterações" : "Criar Perfil"}</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </DialogFormFooter>
  );
};

/**
 * Creating and renaming an access profile, one dialog for /admin and
 * /dashboard (decision 8.7). The company is the page's: the /admin copy asked
 * for one inside the dialog and could "move" a profile — with all its users —
 * to another company, which the API now refuses (a person changes company
 * through their own record, where sessions and inbox are handled).
 */
const ProfileAccessFormDialog = ({
  businessId,
  profile,
  isOpen,
  onClose,
}: ProfileAccessFormDialogProps): JSX.Element => {
  const isEdit = Boolean(profile);

  const [state, dispatch] = useFormState<ProfileFormState, FormData>(
    guardFormAction(
      isEdit ? handleUpdateProfileAccess : handleCreateProfileAccess,
    ),
    {},
  );

  const [name, setName] = useState<string>(profile?.name ?? "");
  const handledState = useRef<ProfileFormState | null>(null);

  const errors = isEdit
    ? state.updateProfileAccessError
    : state.createProfileAccessError;
  const errorMessage =
    state.createProfileAccessError?.createProfileAccessErrorMessage ??
    state.updateProfileAccessError?.updateProfileAccessErrorMessage;

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterProfileWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
  }, [state, errorMessage, isEdit, onClose]);

  // Decision 2.5: an edit that changes nothing cannot be saved; Criar is
  // always enabled (decision 16.701).
  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: profileNameChanged(profile?.name ?? "", name),
  });

  // Live validation (decision 16.700) with the action's own schema.
  const live = useLiveValidation({
    schema: createUpdateProfileAccessSchema,
    values: { name, businessId },
    fields: ["name"],
    serverErrors: errors,
    controlIds: { name: "profile-name" },
  });

  const submit = (formData: FormData) => {
    // The submit listener already stopped an invalid form; this guards a
    // programmatic submit that bypassed it.
    if (!live.isValid()) return;

    formData.set("name", name);
    formData.set("businessId", businessId);

    if (profile) formData.set("profileAccessId", profile.id);

    return dispatch(formData);
  };

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
            {isEdit ? "Editar Perfil de Acesso" : "Criar Novo Perfil de Acesso"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renomeie o perfil. As permissões são configuradas pelo menu da linha."
              : "Dê um nome claro ao perfil (ex.: Supervisor de Operação). Depois, configure as permissões dele pelo menu da linha."}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={live.ref}
          action={submit}
          noValidate
          data-profile-access-form
        >
          <FormInput
            label="Nome do perfil *"
            htmlfor="profile-name"
            name="name"
            type="text"
            placeholder="Ex.: Analista Operacional"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            errorName={live.errorOf("name")}
          />

          <SubmitRow isEdit={isEdit} canSubmit={canSubmit} onCancel={onClose} />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ProfileAccessFormDialog };
