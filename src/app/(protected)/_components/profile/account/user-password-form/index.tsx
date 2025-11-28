"use client";

import { useFormStatus, useFormState } from "react-dom";

import {
  UpdatePasswordProps,
  UpdateUserPasswordContainerProps,
  UpdateUserPasswordFormState,
} from "./dto";

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

import { handleUpdateUserPassword } from "@/actions/update-user-password";
import FormInput from "@/components/custom/form-input";

import { MdLockOutline } from "react-icons/md";
import { useUpdatePasswordForm } from "./hooks";

const UpdatePasswordModalContainer = ({
  state,
  error,
}: UpdateUserPasswordContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <FormInput
        data-test="current_password"
        label={"Senha atual"}
        htmlfor={"Senha atual"}
        name="current_password"
        type={"password"}
        placeholder={"Digite a sua senha atual"}
        errorName={state.userPasswordError?.current_password}
        disabled={pending || error}
        className="pr-10"
        autoComplete="current-password"
      />

      <FormInput
        data-test="new_password"
        label={"Nova senha"}
        htmlfor={"Nova senha"}
        name="new_password"
        type={"password"}
        placeholder={"Digite sua nova senha"}
        errorName={state.userPasswordError?.new_password}
        disabled={pending || error}
        className="pr-10"
        autoComplete="new-password"
      />

      <FormInput
        data-test="confirm_new_password"
        label={"Confirmar senha"}
        htmlfor={"Confirmar senha"}
        name="confirm_new_password"
        type={"password"}
        placeholder={"Confirme sua nova senha"}
        errorName={state.userPasswordError?.confirm_new_password}
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
    </>
  );
};

const UserPasswordForm = ({ error }: UpdatePasswordProps): JSX.Element => {
  const defaultState: UpdateUserPasswordFormState = {};
  const [state, dispatch] = useFormState(handleUpdateUserPassword, null);

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
                <MdLockOutline className="mr-1 size-6" />
                <span>Atualizar Senha</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="overflow-hidden p-0 bg-white 
            dark:bg-[#121214] max-w-md rounded-2xl md:border"
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
                className="flex flex-col space-y-6 border-t
                bg-accent/35 px-4 py-8 text-left sm:px-10"
              >
                <UpdatePasswordModalContainer
                  state={state ?? defaultState}
                  error={error}
                />
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedContentSectionColumns>
  );
};

export { UserPasswordForm };
