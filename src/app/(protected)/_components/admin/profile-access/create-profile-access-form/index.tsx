"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/custom/form-input";

import {
  CreateProfileAccessFormState,
  CreateProfileAccessContainerProps,
} from "./dto";

import { handleCreateProfileAccess } from "@/actions/create-profile-access";

import { useCreateProfileAccessForm } from "./hooks";

import { cn } from "@/lib/utils";
import { SearchBusiness } from "../../../search-business";

const CreateProfileAccessFormContainer = ({
  state,
  handleOpenCreateProfileAccessForm,
  handleUpdateSearchBussinessInputValue,
  commandBusinnessInputValue: { searchBusinessInputValue },
}: CreateProfileAccessContainerProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-4 mt-2">
        <FormInput
          label={"Nome do perfil"}
          htmlfor={"name"}
          name="name"
          type="text"
          errorName={state.createProfileAccessError?.name}
          placeholder={"Nome do perfil, ex: Admin"}
          disabled={pending}
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
          errorBusinessId={state.createProfileAccessError?.businessId}
        />
      </div>

      <div className="flex gap-2 mt-6 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateProfileAccessForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          <span>Criar Perfil</span>
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

const CreateProfileAccessForm = (): JSX.Element => {
  const defaultState: CreateProfileAccessFormState = {};
  const [state, dispatch] = useFormState(handleCreateProfileAccess, null);

  const {
    isCreateCreateProfileAccessForm,
    handleOpenCreateProfileAccessForm,
    handleUpdateSearchBussinessInputValue,
    commandBusinnessInputValue,
    formRef,
  } = useCreateProfileAccessForm(state);

  return (
    <Dialog
      open={isCreateCreateProfileAccessForm}
      onOpenChange={handleOpenCreateProfileAccessForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          Criar Perfil
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Perfil</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            Perfil.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            formData.append(
              "businessId",
              commandBusinnessInputValue.businessId,
            );

            return dispatch(formData);
          }}
        >
          <CreateProfileAccessFormContainer
            handleOpenCreateProfileAccessForm={
              handleOpenCreateProfileAccessForm
            }
            state={state ?? defaultState}
            handleUpdateSearchBussinessInputValue={
              handleUpdateSearchBussinessInputValue
            }
            commandBusinnessInputValue={commandBusinnessInputValue}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateProfileAccessForm };
