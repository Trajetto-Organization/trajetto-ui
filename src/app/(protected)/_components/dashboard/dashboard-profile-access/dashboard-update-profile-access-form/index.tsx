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
import { DashboardProfileAccessProps } from "../dto";

import {
  DashboardUpdateProfileAccessFormSubmitProps,
  DashboardUpdateProfileAccessFormState,
} from "./dto";

import FormInput from "@/components/custom/form-input";

import { handleUpdateProfileAccess } from "@/actions/profile-access/update-profile-access";
import { useDashboardUpdateProfileAccessForm } from "./hooks";

import { appendDataToForm } from "@/lib/append-data-form";
import { useAuthStore } from "@/store/auth-store";

interface DashboardUpdateProfileAccessProps {
  profileAccessData: DashboardProfileAccessProps;
  handleCloseUpdateProfileAccess: () => void;
  isUpdateProfileAccess: boolean;
}

const DashboardUpdateProfileAccessFormSubmit = ({
  state,
  handleCloseUpdateProfileAccess,
  profileAccessName,
  handleUpdateProfileAccessName,
  isDirty,
}: DashboardUpdateProfileAccessFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-4 mt-2">
        <FormInput
          label={"Nome do perfil *"}
          htmlfor={"name"}
          name="name"
          onChange={(event) =>
            handleUpdateProfileAccessName(event.currentTarget.value)
          }
          type="text"
          errorName={state.updateProfileAccessError?.name}
          autoComplete="profile-access"
          placeholder={"Nome do perfil, ex: Admin"}
          disabled={pending}
          value={profileAccessName}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateProfileAccess}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty} className="flex-1">
          <span>Editar Perfil</span>
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

const DashboardUpdateProfileAccessForm = ({
  profileAccessData,
  handleCloseUpdateProfileAccess,
  isUpdateProfileAccess,
}: DashboardUpdateProfileAccessProps): JSX.Element => {
  const defaultState: DashboardUpdateProfileAccessFormState = {};
  const [state, dispatch] = useFormState<
    DashboardUpdateProfileAccessFormState,
    FormData
  >(handleUpdateProfileAccess, defaultState);

  const {
    handleUpdateProfileAccessName,
    profileAccessName,
    setProfileAccessName,
    isDirty,
    formRef,
  } = useDashboardUpdateProfileAccessForm({
    state,
    handleCloseUpdateProfileAccess,
    profileName: profileAccessData.name,
    isUpdateProfileAccess,
  });

  const { businessId } = useAuthStore();

  const updateProfileAccessForm = (profileAccessFormData: FormData) => {
    const updateProfileAccessData = {
      businessId: businessId as string,
      profileAccessId: profileAccessData.id,
    };

    appendDataToForm(profileAccessFormData, updateProfileAccessData);
    return dispatch(profileAccessFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateProfileAccess) {
          formRef.current?.reset();
          setProfileAccessName("");
        }

        handleCloseUpdateProfileAccess();
      }}
      open={isUpdateProfileAccess}
    >
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Perfil</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            perfil de acesso.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={updateProfileAccessForm}>
          <DashboardUpdateProfileAccessFormSubmit
            state={state}
            handleCloseUpdateProfileAccess={handleCloseUpdateProfileAccess}
            profileAccessName={profileAccessName}
            handleUpdateProfileAccessName={handleUpdateProfileAccessName}
            isDirty={isDirty}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardUpdateProfileAccessForm };
