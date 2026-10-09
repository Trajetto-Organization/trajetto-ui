"use client";

import { useState } from "react";
import { useFormStatus, useFormState } from "react-dom";
import type {
  UpdatePasswordProps,
  UpdateUserPasswordFormSubmitProps,
  UpdateUserPasswordFormState,
} from "./user-password-form.types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ProtectedContentSectionColumns } from "../../../layout/protected-content-section-collumns";

import { Loader } from "lucide-react";

import { handleUpdateUserPassword } from "@/actions/user/update-user-password";
import FormInput from "@/components/shared/custom/form-input";

import { Lock } from "lucide-react";
import { useUpdatePasswordForm } from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { validateUserPasswordFormSchema } from "@/schemas/update-user-password";
import { useLiveValidation } from "@/components/shared/live-validation";

const UpdatePasswordFormSubmit = ({
  state,
  error,
}: UpdateUserPasswordFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  // Controlled, so live validation reads them; the dialog mounts this on
  // every open, so each opening starts empty.
  const [current, setCurrent] = useState<string>("");
  const [next, setNext] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");

  // Ids equal the field names: an id with spaces would split
  // aria-describedby into ids that do not exist.
  // Live validation (decision 16.700) with the action's schema. The
  // confirmation is an object refine, which waits for the other fields; as
  // a client rule it follows the new password as soon as it is left.
  const live = useLiveValidation({
    schema: validateUserPasswordFormSchema,
    values: {
      current_password: current,
      new_password: next,
      confirm_new_password: confirm,
    },
    // An empty confirmation is the schema's "Confirme a nova senha.", which
    // wins over this rule; the rule only adds the mismatch.
    rules: (values) => ({
      confirm_new_password:
        values.confirm_new_password !== values.new_password
          ? "As senhas não coincidem."
          : null,
    }),
    fields: ["current_password", "new_password", "confirm_new_password"],
    serverErrors: state.userPasswordError,
  });

  return (
    <div ref={live.ref} className="flex flex-col space-y-6">
      <FormInput
        data-test="current_password"
        label={"Senha atual"}
        htmlfor="current_password"
        name="current_password"
        type={"password"}
        placeholder={"Digite a sua senha atual"}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        errorName={live.errorOf("current_password")}
        disabled={pending || error}
        className="pr-10"
        autoComplete="current-password"
      />

      <FormInput
        data-test="new_password"
        label={"Nova senha"}
        htmlfor="new_password"
        name="new_password"
        type={"password"}
        placeholder={"Digite sua nova senha"}
        value={next}
        onChange={(event) => setNext(event.target.value)}
        errorName={live.errorOf("new_password")}
        disabled={pending || error}
        className="pr-10"
        autoComplete="new-password"
      />

      <FormInput
        data-test="confirm_new_password"
        label={"Confirmar senha"}
        htmlfor="confirm_new_password"
        name="confirm_new_password"
        type={"password"}
        placeholder={"Confirme sua nova senha"}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        errorName={live.errorOf("confirm_new_password")}
        disabled={pending || error}
        className="pr-10"
        autoComplete="new-password"
      />

      <Button type="submit" disabled={pending || error}>
        <span>Atualizar Senha</span>
        {pending && (
          <div className="ml-2 animate-spin">
            <Loader />
          </div>
        )}
      </Button>
    </div>
  );
};

const UserPasswordForm = ({ error }: UpdatePasswordProps): JSX.Element => {
  const defaultState: UpdateUserPasswordFormState = {};
  const [state, dispatch] = useFormState<UpdateUserPasswordFormState, FormData>(
    guardFormAction(handleUpdateUserPassword),
    defaultState,
  );

  const { handleOpenUpdatePasswordModal, isUpdatePasswordModalOpen } =
    useUpdatePasswordForm(state);

  return (
    <ProtectedContentSectionColumns
      title={"Sua Senha"}
      description={
        "Insira uma nova senha que você gostaria de usar para sua conta."
      }
    >
      <div
        className="flex flex-col gap-4 
        rounded-xl border p-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <span className="text-[15px] font-medium">Atualize sua senha</span>
          </div>
          <div className="text-balance text-sm text-muted-foreground">
            Atualize a sua senha para manter sua conta segura.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isUpdatePasswordModalOpen}
            onOpenChange={handleOpenUpdatePasswordModal}
          >
            <DialogTrigger asChild>
              <Button type="submit" variant="outline" disabled={error}>
                <Lock className="mr-1 size-6" />
                <span>Atualizar Senha</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="overflow-hidden p-0 bg-background max-w-md rounded-2xl md:border"
              onInteractOutside={(event) => event.preventDefault()}
            >
              <div
                className="flex flex-col items-center 
                justify-center space-y-3 p-4 pt-8 sm:px-16"
              >
                <DialogTitle className="text-xl font-semibold">
                  Atualizar Senha
                </DialogTitle>

                <DialogDescription
                  className="text-center text-sm 
                  text-muted-foreground"
                >
                  Insira as informações solicitadas abaixo para concluir a
                  atualização com segurança.
                </DialogDescription>
              </div>

              <form
                action={dispatch}
                noValidate
                className="flex flex-col space-y-6 border-t
                bg-accent/35 px-4 py-8 text-left sm:px-10"
              >
                <UpdatePasswordFormSubmit state={state} error={error} />
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedContentSectionColumns>
  );
};

export { UserPasswordForm };
