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
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { handleCreateMasterUser } from "@/actions/user/create-master-user";
import { handleUpdateMasterUser } from "@/actions/user/update-master-user";
import { createMasterUserSchema } from "@/schemas/create-master-user-schema";
import { updateMasterUserSchema } from "@/schemas/update-master-user-schema";

import { guardFormAction } from "@/lib/action-result";

import {
  changedMasterFields,
  masterFormValuesOf,
  type MasterFormValues,
} from "../lib/user-rules";
import { refreshAfterUserWrite } from "../lib/after-write";
import type { UserRow } from "../types";

type FieldErrors = Partial<Record<keyof MasterFormValues, string[]>>;

interface MasterFormState {
  createMasterUserError?: FieldErrors & {
    createMasterUserErrorMessage?: string;
  };
  updateMasterUserError?: FieldErrors & {
    updateMasterUserErrorMessage?: string;
  };
  successMessage?: string;
}

interface MasterUserFormDialogProps {
  /** Present when editing. */
  master?: UserRow;
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
        <span>{isEdit ? "Salvar Alterações" : "Criar Usuário Master"}</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </DialogFormFooter>
  );
};

/**
 * Creating and editing a MASTER. No password field (decision 4.9): the old
 * dialog asked for one and mailed it in clear text; a new master now gets a
 * link to set theirs, and a reset sends a new single-use link. Save stays
 * disabled until something changed (decision 2.5).
 */
const MasterUserFormDialog = ({
  master,
  isOpen,
  onClose,
}: MasterUserFormDialogProps): JSX.Element => {
  const isEdit = Boolean(master);

  const [state, dispatch] = useFormState<MasterFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateMasterUser : handleCreateMasterUser),
    {},
  );

  const original = useMemo(() => masterFormValuesOf(master), [master]);

  const [email, setEmail] = useState<string>(original.email);
  const [name, setName] = useState<string>(original.name);
  const [sendLink, setSendLink] = useState<boolean>(false);

  const changed = changedMasterFields(original, { email, name });
  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: changed.length > 0 || sendLink,
  });

  const handledState = useRef<MasterFormState | null>(null);

  const errors = isEdit
    ? state.updateMasterUserError
    : state.createMasterUserError;

  // Live validation (decision 16.700), with the schema the action parses.
  const live = useLiveValidation({
    schema: isEdit ? updateMasterUserSchema : createMasterUserSchema,
    values: { email, name },
    fields: ["email", "name"],
    controlIds: { email: "master-email", name: "master-name" },
    serverErrors: errors,
  });
  const errorMessage =
    state.createMasterUserError?.createMasterUserErrorMessage ??
    state.updateMasterUserError?.updateMasterUserErrorMessage;

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterUserWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
  }, [state, errorMessage, isEdit, onClose]);

  const submit = (formData: FormData) => {
    formData.set("email", email);
    formData.set("name", name);

    if (master) {
      formData.set("masterUserId", master.id);
      formData.set("sendPasswordSetupLink", sendLink ? "true" : "false");
    }

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
            {isEdit ? "Editar Usuário Master" : "Criar Novo Usuário Master"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome ou o e-mail. Só o que você mudar é salvo."
              : "O novo master recebe por e-mail um link para definir a própria senha (válido por 72 horas)."}
          </DialogDescription>
        </DialogHeader>

        <form ref={live.ref} action={submit} noValidate className="space-y-4">
          <FormInput
            label="E-mail *"
            htmlfor="master-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail de acesso"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            errorName={live.errorOf("email")}
          />

          <FormInput
            label="Nome *"
            htmlfor="master-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Nome completo"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            errorName={live.errorOf("name")}
          />

          {isEdit && (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                id="master-send-password-link"
                checked={sendLink}
                onCheckedChange={(checked) => setSendLink(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="master-send-password-link"
                  className="text-sm font-medium"
                >
                  Enviar link de redefinição de senha
                </Label>
                <p className="text-xs text-muted-foreground">
                  O master recebe por e-mail um link de uso único, válido por 24
                  horas, para definir uma nova senha. A senha atual continua
                  valendo até ele usar o link. Nenhuma senha é enviada por
                  e-mail.
                </p>
              </div>
            </div>
          )}

          <SubmitRow isEdit={isEdit} canSubmit={canSubmit} onCancel={onClose} />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { MasterUserFormDialog };
