import { useFormState, useFormStatus } from "react-dom";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";

import { Loader, X } from "lucide-react";
import { ProfileAccessProps } from "../dto";

import {
  UpdateProfileAccessContainerProps,
  UpdateProfileAccessFormState,
} from "./dto";

import FormInput from "@/components/custom/form-input";

import { handleUpdateProfileAccess } from "@/actions/update-profile-access";
import { useUpdateProfileAccessForm } from "./hooks";

import { cn } from "@/lib/utils";
import { appendExtraDataToForm } from "@/lib/append-extra-data-form";

import { SearchBusiness } from "../../../search-business";

interface UpdateProfileAccessProps {
  profileAccessData: ProfileAccessProps;
  handleCloseUpdateProfileAccess: () => void;
  isUpdateProfileAccess: boolean;
}

const UpdateProfileAccessFormContainer = ({
  state,
  handleCloseUpdateProfileAccess,
  profileAccessName,
  handleUpdateProfileAccessName,
  handleUpdateSearchBussinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue },
  isDirty,
}: UpdateProfileAccessContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-4 mt-2">
        <FormInput
          label={"Nome do perfil"}
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

        {searchBusinessInputValue && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-dashed truncate h-8 text-center max-w-96 block leading-4",
              )}
            >
              {searchBusinessInputValue}
            </div>
            <Button
              className="h-8 w-4"
              variant="ghost"
              onClick={() =>
                handleUpdateSearchBussinessInputValue({
                  businessId: "",
                  searchBusinessInputValue: "",
                })
              }
            >
              <X />
            </Button>
          </div>
        )}

        <SearchBusiness
          handleUpdateSearchBussinessInputValue={
            handleUpdateSearchBussinessInputValue
          }
          searchBusinessInputValue={searchBusinessInputValue}
          errorBusinessId={state.updateProfileAccessError?.businessId}
        />
      </div>

      <div className="flex justify-end mt-6 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseUpdateProfileAccess}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <span>Editar Empresa</span>
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

const UpdateProfileAccessForm = ({
  profileAccessData,
  handleCloseUpdateProfileAccess,
  isUpdateProfileAccess,
}: UpdateProfileAccessProps): JSX.Element => {
  const defaultState: UpdateProfileAccessFormState = {};
  const [state, dispatch] = useFormState(handleUpdateProfileAccess, null);

  const {
    commandBusinnessInputValue,
    handleUpdateSearchBussinessInputValue,
    handleUpdateProfileAccessName,
    profileAccessName,
    setProfileAccessName,
    isDirty,
    formRef,
  } = useUpdateProfileAccessForm({
    state,
    handleCloseUpdateProfileAccess,
    profileName: profileAccessData.name,
    profileBusiness: {
      searchBusinessInputValue: profileAccessData.corporate_reason as string,
      businessId: profileAccessData.businessId as string,
    },
    isUpdateProfileAccess,
  });

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateProfileAccess) {
          formRef.current?.reset();

          const resetCommandInputValue = {
            searchBusinessInputValue: "",
            businessId: "",
          };

          handleUpdateSearchBussinessInputValue(resetCommandInputValue);
          setProfileAccessName("");
        }

        handleCloseUpdateProfileAccess();
      }}
      open={isUpdateProfileAccess}
    >
      <DialogScrollContent className="max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Perfil</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição do
            perfil de acesso.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            const extraData = {
              businessId: commandBusinnessInputValue.businessId,
              profileAccessId: profileAccessData.id,
            };

            appendExtraDataToForm(formData, extraData);
            return dispatch(formData);
          }}
        >
          <UpdateProfileAccessFormContainer
            state={state ?? defaultState}
            handleCloseUpdateProfileAccess={handleCloseUpdateProfileAccess}
            profileAccessName={profileAccessName}
            handleUpdateProfileAccessName={handleUpdateProfileAccessName}
            commandBusinnessInputValue={commandBusinnessInputValue}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            isDirty={isDirty}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateProfileAccessForm };
