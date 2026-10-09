import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import type {
  UpdateBusinessFormSubmitProps,
  UpdateBusinessFormState,
} from "./update-business-form.types";
import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";

import { handleUpdateBusiness } from "@/actions/business/update-business";
import { useCepValidation } from "@/app/(protected)/_components/hooks";

import { useUpdateBusinessForm } from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { BusinessTimeZoneField } from "../timezone-field";
import { DEFAULT_BUSINESS_TIMEZONE } from "../timezone-field/timezones";

interface UpdateBusinessProps {
  businessData: BusinessProps;
  handleCloseUpdateBusiness: () => void;
  isUpdateBusinessOpen: boolean;
}

const UpdateBusinessFormSubmit = ({
  state,
  handleCloseUpdateBusiness,
  businessData,
  isUpdateBusinessOpen,
}: UpdateBusinessFormSubmitProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { updatedFields, isDirty, cepLoading, formValues } = useCepValidation({
    initialData: businessData,
    isOpen: isUpdateBusinessOpen,
  });

  // The zone is outside the address hook: its change counts as a change too
  // (decision 2.5 — Salvar only once something changed).
  const initialTimezone =
    (businessData as { timezone?: string | null }).timezone ||
    DEFAULT_BUSINESS_TIMEZONE;
  const [timezone, setTimezone] = useState<string>(initialTimezone);
  const changed = isDirty || timezone !== initialTimezone;

  // Live validation (decision 16.700): the action's schema over the values
  // the form posts (masked, as the schema's preprocess expects them).
  const live = useLiveValidation({
    schema: createUpdateBusinessFormSchema,
    values: { ...formValues, timezone },
    serverErrors: state.updateBusinessError,
    resetKey: isUpdateBusinessOpen,
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
          onClick={handleCloseUpdateBusiness}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            cepLoading ||
            !canSubmitForm({ isEdit: true, isDirty: changed })
          }
        >
          <span>Salvar Alterações</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

const UpdateBusinessForm = ({
  businessData,
  handleCloseUpdateBusiness,
  isUpdateBusinessOpen,
}: UpdateBusinessProps): JSX.Element => {
  const defaultState: UpdateBusinessFormState = {};
  const [state, dispatch] = useFormState<UpdateBusinessFormState, FormData>(
    guardFormAction(handleUpdateBusiness),
    defaultState,
  );

  const { formRef } = useUpdateBusinessForm({
    state,
    handleCloseUpdateBusiness,
  });

  const updateBusinessForm = (businessFormData: FormData) => {
    businessFormData.append("businessId", businessData.id);
    return dispatch(businessFormData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isUpdateBusinessOpen) {
          formRef.current?.reset();
        }

        handleCloseUpdateBusiness();
      }}
      open={isUpdateBusinessOpen}
    >
      <DialogScrollContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Empresa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a edição da
            empresa.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={updateBusinessForm}
          noValidate
          data-business-form
        >
          <UpdateBusinessFormSubmit
            state={state}
            handleCloseUpdateBusiness={handleCloseUpdateBusiness}
            businessData={businessData}
            isUpdateBusinessOpen={isUpdateBusinessOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateBusinessForm };
