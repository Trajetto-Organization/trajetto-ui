import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import FormInput from "@/components/shared/custom/form-input";

import type {
  CreateMasterUserFormSubmitProps,
  CreateMasterUserFormState,
} from "./create-master-user-form.types";

import { handleCreateMasterUser } from "@/actions/user/create-master-user";
import { useCreateMasterUserForm, useGenerateRandomPassword } from "./hooks";

const CreateMasterUserFormSubmit = ({
  state,
  handleOpenCreateMasterUserForm,
}: CreateMasterUserFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { handleGeneratePassword, handleChangePassword, password } =
    useGenerateRandomPassword();

  return (
    <>
      <div
        className="grid grid-cols-1
        md:grid-cols-2 gap-4 mt-3"
      >
        <FormInput
          label={"Email *"}
          htmlfor={"email"}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          errorName={state?.createMasterUserError?.email}
          placeholder={"E-mail"}
          disabled={pending}
        />

        <FormInput
          label={"Nome *"}
          htmlfor={"name"}
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          errorName={state?.createMasterUserError?.name}
          placeholder={"Nome"}
          disabled={pending}
        />

        <div className="flex items-end gap-2 w-full md:col-span-2">
          <div className="w-full -mt-1">
            <FormInput
              label="Senha *"
              htmlfor="password"
              name="password"
              id="password"
              type="password"
              autoComplete="new-password"
              errorName={state?.createMasterUserError?.password}
              placeholder="Senha"
              value={password}
              onChange={(e) => handleChangePassword(e.target.value)}
              disabled={pending}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleGeneratePassword}
            disabled={pending}
          >
            Gerar
          </Button>
        </div>
      </div>

      <div className="flex justify-end mt-8 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateMasterUserForm}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <span>Criar Usuário Master</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </>
  );
};

const CreateMasterUserForm = (): JSX.Element => {
  const defaultState: CreateMasterUserFormState = {};
  const [state, dispatch] = useFormState<CreateMasterUserFormState, FormData>(
    handleCreateMasterUser,
    defaultState,
  );

  const { isCreateMasterUserForm, handleOpenCreateMasterUserForm, formRef } =
    useCreateMasterUserForm(state);

  return (
    <Dialog
      open={isCreateMasterUserForm}
      onOpenChange={handleOpenCreateMasterUserForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 w-full">
          Criar Usuário Master
        </Button>
      </DialogTrigger>

      <DialogScrollContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            Criar Novo Usuário Master
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            usuário Master.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={dispatch}>
          <CreateMasterUserFormSubmit
            state={state}
            handleOpenCreateMasterUserForm={handleOpenCreateMasterUserForm}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateMasterUserForm };
