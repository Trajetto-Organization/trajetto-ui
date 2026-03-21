import { useFormState, useFormStatus } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

import FormInput from "@/components/shared/custom/form-input";

import type { MasterUserProps } from "../master-user.types";
import type {
  UpdateMasterUserFormSubmitProps,
  UpdateMasterUserFormState,
} from "./update-master-user-form.types";

import { appendDataToForm } from "@/lib/append-data-form";
import { handleUpdateMasterUser } from "@/actions/user/update-master-user";

import {
  useUpdateMasterUserForm,
  useUpdateMasterUserGenerateRandomPassword,
} from "./hooks";

interface UpdateMasterUserProps {
  masterUserData: MasterUserProps;
  handleOpenUpdateMasterUser: () => void;
  isUpdateMasterUser: boolean;
}

const UpdateMasterUserFormSubmit = ({
  state,
  handleUpdateMasterUserEmail,
  handleUpdateMasterUserName,
  handleOpenUpdateMasterUser,
  isDirty,
  masterUserValues: { masterUserEmail, masterUserName },
}: UpdateMasterUserFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { handleGeneratePassword, handleChangePassword, password } =
    useUpdateMasterUserGenerateRandomPassword();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <FormInput
          label={"Email *"}
          htmlfor={"email"}
          name="email"
          type="email"
          autoComplete="email"
          onChange={(event) =>
            handleUpdateMasterUserEmail(event.currentTarget.value)
          }
          errorName={state?.updateMasterUserError?.email}
          placeholder={"E-mail"}
          disabled={pending}
          value={masterUserEmail}
        />

        <FormInput
          label={"Nome *"}
          htmlfor={"name"}
          name="name"
          type="text"
          autoComplete="name"
          onChange={(event) =>
            handleUpdateMasterUserName(event.currentTarget.value)
          }
          errorName={state?.updateMasterUserError?.name}
          placeholder={"Nome"}
          disabled={pending}
          value={masterUserName}
        />

        <div className="flex items-end gap-2 w-full md:col-span-2">
          <div className="w-full -mt-1">
            <FormInput
              label="Senha (opcional)"
              htmlfor="password"
              name="password"
              type="password"
              autoComplete="new-password"
              errorName={state?.updateMasterUserError?.password}
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
          onClick={handleOpenUpdateMasterUser}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || (!isDirty && !password)}>
          <span>Editar Usuário Master</span>
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

const UpdateMasterUserForm = ({
  masterUserData,
  handleOpenUpdateMasterUser,
  isUpdateMasterUser,
}: UpdateMasterUserProps): JSX.Element => {
  const defaultState: UpdateMasterUserFormState = {};
  const [state, dispatch] = useFormState<UpdateMasterUserFormState, FormData>(
    handleUpdateMasterUser,
    defaultState,
  );

  const {
    formRef,
    handleUpdateMasterUserEmail,
    handleUpdateMasterUserName,
    masterUserEmail,
    masterUserName,
    isDirty,
  } = useUpdateMasterUserForm({
    state,
    handleOpenUpdateMasterUser,
    masterUserValues: masterUserData,
    isUpdateMasterUser,
  });

  const updateMasterUserForm = (masterUserFormData: FormData) => {
    const updateMasterUserData = {
      masterUserId: masterUserData.id,
    };

    appendDataToForm(masterUserFormData, updateMasterUserData);
    return dispatch(masterUserFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateMasterUser) {
          formRef.current?.reset();
        }

        handleOpenUpdateMasterUser();
      }}
      open={isUpdateMasterUser}
    >
      <DialogScrollContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Usuário Master</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            usuário Master.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateMasterUserForm}>
          <UpdateMasterUserFormSubmit
            state={state}
            handleOpenUpdateMasterUser={handleOpenUpdateMasterUser}
            handleUpdateMasterUserEmail={handleUpdateMasterUserEmail}
            handleUpdateMasterUserName={handleUpdateMasterUserName}
            isDirty={isDirty}
            masterUserValues={{
              masterUserEmail,
              masterUserName,
            }}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateMasterUserForm };
