import { useFormState, useFormStatus } from "react-dom";

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

import { Loader, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useDeleteUserForm } from "./hooks";
import { handleRevokeUserAccess } from "@/actions/revoke-user-access";

interface RevokeUserFormContainerProps {
  access_revoked: boolean;
}

interface RevokeUserAccessProps {
  access_revoked: boolean;
  userId: string;
}

const RevokeUserFormContainer = ({
  access_revoked,
}: RevokeUserFormContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {access_revoked ? "Habilitar Acesso" : "Revogar Acesso"}
        </AlertDialogTitle>

        <AlertDialogDescription asChild>
          <div>
            {access_revoked ? (
              <div>
                <span className="block mb-2">
                  Ao habilitar o acesso, o usuário voltará a conseguir se
                  autenticar e utilizar as funcionalidades da plataforma.
                </span>
                <span className="block font-medium text-foreground">
                  Consequências imediatas:
                </span>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>O usuário poderá fazer login normalmente.</li>
                  <li>Todos os tokens ativos voltam a valer.</li>
                  <li>Ele recupera permissão na plataforma.</li>
                </ul>
              </div>
            ) : (
              <div>
                <span className="block mb-2">
                  Ao revogar o acesso, o usuário não conseguirá mais se
                  autenticar até que um administrador habilite novamente.
                </span>
                <span className="block font-medium text-foreground">
                  Consequências imediatas:
                </span>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Todas as sessões e tokens de acesso serão invalidados</li>
                  <li>
                    Ordens de serviço em que ele seja responsável permanecerão
                    no sistema
                  </li>
                  <li>
                    Contas a pagar registradas por este usuário permanecerão no
                    sistema
                  </li>
                  <li>O usuário perderá acesso total à plataforma</li>
                  <li>
                    Esta ação não pode ser desfeita sem intervenção de admin
                  </li>
                </ul>
              </div>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter className="mt-5">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>

        <Button
          type="submit"
          disabled={pending}
          variant={"secondary"}
          className={
            access_revoked
              ? "bg-green-600/10 dark:bg-green-600/10 dark:text-green-500 text-green-600"
              : "bg-red-600/10 dark:bg-red-500/10 dark:text-red-500 text-red-600"
          }
        >
          {access_revoked ? (
            <>
              <ShieldCheck className="mr-1 size-5" />
              <span>Habilitar Acesso</span>
            </>
          ) : (
            <>
              <ShieldAlert className="mr-1 size-5" />
              <span>Revogar Acesso</span>
            </>
          )}

          {pending && (
            <div className="animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

const RevokeUserAccessForm = ({
  access_revoked,
  userId,
}: RevokeUserAccessProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    async () => await handleRevokeUserAccess(userId),
    null,
  );

  const { isOpenRevokeUserAccessForm, handleRevokeUserAccessForm } =
    useDeleteUserForm(state);

  return (
    <AlertDialog
      open={isOpenRevokeUserAccessForm}
      onOpenChange={handleRevokeUserAccessForm}
    >
      <AlertDialogTrigger asChild>
        <Button
          onClick={handleRevokeUserAccessForm}
          className={`
            w-full text-sm rounded-sm px-2 ${
              access_revoked
                ? "dark:text-green-500 text-green-600"
                : "dark:text-red-500 text-red-600"
            }
            h-8 font-normal flex justify-between`}
          variant={"ghost"}
        >
          {access_revoked ? (
            <>
              Habilitar Acesso
              <ShieldCheck size={17} />
            </>
          ) : (
            <>
              Revogar Acesso
              <ShieldAlert size={17} />
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-[#121214]">
        <form action={dispatch}>
          <RevokeUserFormContainer access_revoked={access_revoked} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { RevokeUserAccessForm };
