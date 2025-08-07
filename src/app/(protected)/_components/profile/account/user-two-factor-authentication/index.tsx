"use client";

import { useFormStatus, useFormState } from "react-dom";
import { Loader, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";

import { ProtectedContentSectionColumns } from "../../../layout/protected-content-section-collumns";
import { handleUpdateTwoFactorAuthentication } from "@/actions/update-two-factor-authentication";

import { useTwoFactorAuthenticationForm } from "./hooks";

interface UserTwoFactorAuthenticationFormProps {
  error: boolean;
  isTwoFactorEnabled: boolean;
}

const UserTwoFactorAuthenticationContainer = ({
  error,
  isTwoFactorEnabled,
}: UserTwoFactorAuthenticationFormProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {isTwoFactorEnabled
            ? "Você tem certeza?"
            : "Autenticação de Dois Fatores (2FA)"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {isTwoFactorEnabled
            ? "Desativar a autenticação de dois fatores tornará sua conta menos segura. Você precisará apenas do seu e-mail e senha para fazer login."
            : "Uma vez ativada, você receberá um código de verificação por e-mail toda vez que tentar fazer login."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>

        <Button
          type="submit"
          disabled={pending || error}
          variant={"secondary"}
          className={
            isTwoFactorEnabled
              ? "bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
              : "bg-green-600/10 dark:bg-green-600/10 dark:text-green-500 text-green-600"
          }
        >
          {isTwoFactorEnabled ? (
            <ShieldAlert className="mr-1 size-5" />
          ) : (
            <ShieldCheck className="mr-1 size-5" />
          )}

          <span>
            {isTwoFactorEnabled ? "Desabilitar 2FA" : "Habilitar 2FA"}
          </span>

          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const UserTwoFactorAuthentication = ({
  error,
  isTwoFactorEnabled,
}: UserTwoFactorAuthenticationFormProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    handleUpdateTwoFactorAuthentication,
    null,
  );

  const { handleTwoFactorAuthentication, isOpenTwoFactorModal } =
    useTwoFactorAuthenticationForm(state);

  return (
    <ProtectedContentSectionColumns
      title={"Autenticação de Dois Fatores"}
      description={
        "Adicione proteção extra à sua conta com autenticação de dois fatores."
      }
    >
      <div
        className="flex flex-col gap-4 
        rounded-xl border p-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium">
              Autenticação de Dois Fatores (2FA)
            </span>

            <div
              className={`flex items-center gap-1 rounded-md 
                ${
                  isTwoFactorEnabled
                    ? "bg-green-600/10 dark:bg-green-600/10 dark:text-green-500 text-green-600"
                    : "bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
                } p-1 pr-2 text-xs font-medium 
              `}
            >
              <div className="rounded-full p-[3px]">
                {isTwoFactorEnabled ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <ShieldAlert className="size-4" />
                )}
              </div>
              2FA
              {error
                ? null
                : isTwoFactorEnabled
                  ? "/ Habilitado"
                  : "/ Desabilitado"}
            </div>
          </div>
          <div className="text-balance text-sm text-muted-foreground">
            Fortaleça a segurança da sua conta com uma camada adicional de
            proteção.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog
            open={isOpenTwoFactorModal}
            onOpenChange={handleTwoFactorAuthentication}
          >
            <AlertDialogTrigger asChild>
              <Button
                onClick={handleTwoFactorAuthentication}
                variant="outline"
                disabled={error}
              >
                {isTwoFactorEnabled ? (
                  <ShieldAlert className="mr-1 size-5" />
                ) : (
                  <ShieldCheck className="mr-1 size-5" />
                )}
                <span>
                  {isTwoFactorEnabled ? "Desabilitar" : "Habilitar"} 2FA
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white dark:bg-[#121214]">
              <form action={dispatch}>
                <UserTwoFactorAuthenticationContainer
                  error={error}
                  isTwoFactorEnabled={isTwoFactorEnabled}
                />
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </ProtectedContentSectionColumns>
  );
};

export { UserTwoFactorAuthentication };
