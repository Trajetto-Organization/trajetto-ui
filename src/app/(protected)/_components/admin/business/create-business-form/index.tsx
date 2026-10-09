import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { handleCreateBusiness } from "@/actions/business/create-business";

import { useCreateBusinessForm } from "./hooks";
import { useCepValidation } from "@/app/(protected)/_components/hooks";

import type {
  CreateBusinessSubmitProps,
  CreateBusinessFormState,
} from "./create-business-form.types";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";

import { BusinessTimeZoneField } from "../timezone-field";
import { DEFAULT_BUSINESS_TIMEZONE } from "../timezone-field/timezones";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

const CreateBusinessFormSubmit = ({
  state,
  handleOpenCreateBusinessForm,
  isCreateBusinessForm,
}: CreateBusinessSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, cepLoading, formValues } = useCepValidation({
    isOpen: isCreateBusinessForm,
  });

  // Where the company operates decides its "today" (decision 1.1).
  const [timezone, setTimezone] = useState<string>(DEFAULT_BUSINESS_TIMEZONE);

  // Live validation (decision 16.700): the action's schema over the values
  // the form posts (masked, as the schema's preprocess expects them).
  const live = useLiveValidation({
    schema: createUpdateBusinessFormSchema,
    values: { ...formValues, timezone },
    serverErrors: state.createBusinessError,
    resetKey: isCreateBusinessForm,
  });

  return (
    <>
      <div
        ref={live.ref}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
      >
        {updatedFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={live.errorOf(field.name)}
            disabled={field.disabled || pending}
          />
        ))}

        <div className="md:col-span-2">
          <BusinessTimeZoneField
            value={timezone}
            onChange={setTimezone}
            error={live.errorOf("timezone")}
            disabled={pending}
          />
        </div>
      </div>

      {/* A wide modal: the buttons go to the right (decision 3.2). */}
      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenCreateBusinessForm}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || cepLoading}>
          <span>Criar Empresa</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

const CreateBusinessForm = (): JSX.Element => {
  const defaultState: CreateBusinessFormState = {};
  const [state, dispatch] = useFormState<CreateBusinessFormState, FormData>(
    guardFormAction(handleCreateBusiness),
    defaultState,
  );

  const { isCreateBusinessForm, handleOpenCreateBusinessForm, formRef } =
    useCreateBusinessForm(state);

  // The action line's height and a full-width button on a phone (3.6).
  const buttonClassName = usePageActionClassName();

  return (
    <Dialog
      open={isCreateBusinessForm}
      onOpenChange={handleOpenCreateBusinessForm}
    >
      <DialogTrigger asChild>
        <Button size="sm" className={buttonClassName}>
          <CreateButtonLabel>Criar Empresa</CreateButtonLabel>
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Nova Empresa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação da
            empresa.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={dispatch} noValidate data-business-form>
          <CreateBusinessFormSubmit
            handleOpenCreateBusinessForm={handleOpenCreateBusinessForm}
            isCreateBusinessForm={isCreateBusinessForm}
            state={state}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { CreateBusinessForm };
