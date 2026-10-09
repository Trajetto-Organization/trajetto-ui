"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";
import { SearchBranch } from "@/app/(protected)/_components/shared/searches/search-branch";
import { useCepValidation } from "@/app/(protected)/_components/hooks";

import { handleCreateDriver } from "@/actions/driver/create-driver";
import { handleUpdateDriver } from "@/actions/driver/update-driver";

import { createUpdateDriverSchema } from "@/schemas/create-update-driver-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { guardFormAction } from "@/lib/action-result";
import { cn } from "@/lib/utils";

import {
  CNH_CATEGORY_OPTIONS,
  changedDriverFields,
  driverFormValuesOf,
  type DriverFormValues,
} from "../lib/driver-rules";
import { refreshAfterDriverWrite } from "../lib/after-write";
import type { DriverRow } from "../types";

type FieldErrors = Partial<
  Record<keyof DriverFormValues | "businessId", string[]>
>;

interface DriverFormState {
  createDriverError?: FieldErrors & { createDriverErrorMessage?: string };
  updateDriverError?: FieldErrors & { updateDriverErrorMessage?: string };
  successMessage?: string;
}

interface DriverFormDialogProps {
  /** The company the driver belongs to: the page's selector on /admin, the session's on /dashboard. */
  businessId: string;
  /** Present when editing. */
  driver?: DriverRow;
  isOpen: boolean;
  onClose: () => void;
}

const ADDRESS_FIELDS = [
  "cep",
  "city",
  "uf",
  "street",
  "address_number",
  "complement",
];

/** What a submit checks, in the form's order (the branch is the step before). */
const CHECKED_FIELDS = [
  "name",
  "birth_date",
  "cpf",
  "rg",
  "cnh",
  "cnh_category",
  "cnh_expires_at",
  "status",
  "contract_type",
  ...ADDRESS_FIELDS,
];

const EMPTY_VALUES: DriverFormValues = {
  name: "",
  birth_date: "",
  cpf: "",
  rg: "",
  cnh: "",
  cnh_category: "",
  cnh_expires_at: "",
  status: "",
  contract_type: "",
  cep: "",
  city: "",
  uf: "",
  street: "",
  address_number: "",
  complement: "",
  branchId: "",
};

interface DriverFieldsProps {
  isOpen: boolean;
  initialValues: DriverFormValues;
  errors: FieldErrors | undefined;
  onValuesChange: (values: Record<string, string>) => void;
  onBusyChange: (busy: boolean) => void;
}

/**
 * The driver's own fields. Its values live in useCepValidation (the address
 * lookup fills city, UF and street); the parent only reads them back, to
 * decide whether Save is enabled. The live validation lives here, with the
 * values (decision 16.700); its ref on the grid reads the form's submit.
 */
const DriverFields = ({
  isOpen,
  initialValues,
  errors,
  onValuesChange,
  onBusyChange,
}: DriverFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  const { updatedFields, cepLoading, formValues, handleFieldChange } =
    useCepValidation({
      isOpen,
      initialData: initialValues as never,
      originalData: initialValues as never,
    });

  useEffect(() => {
    onValuesChange(formValues);
  }, [formValues, onValuesChange]);

  useEffect(() => {
    onBusyChange(cepLoading);
  }, [cepLoading, onBusyChange]);

  const live = useLiveValidation({
    schema: createUpdateDriverSchema,
    values: formValues,
    fields: CHECKED_FIELDS,
    serverErrors: errors,
  });

  const error = (field: keyof DriverFormValues) => live.errorOf(field);
  // A pick (select, calendar) is a complete answer: judged without a blur.
  const set = (field: keyof DriverFormValues) => (value: string) => {
    handleFieldChange(field, value);
    live.touch(field);
  };

  const addressFields = updatedFields.filter((field) =>
    ADDRESS_FIELDS.includes(field.name),
  );

  return (
    <div ref={live.ref} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormInput
        label="Nome do motorista *"
        htmlfor="name"
        name="name"
        type="text"
        placeholder="Nome completo do motorista"
        value={formValues.name ?? ""}
        onChange={(event) => handleFieldChange("name", event.target.value)}
        errorName={error("name")}
        disabled={pending}
        autoComplete="name"
      />

      {/* A civil day (decision 1.3): sent as YYYY-MM-DD, read back in UTC. */}
      <DatePickerField
        label="Data de nascimento *"
        htmlfor="birth_date"
        name="birth_date"
        value={formValues.birth_date ?? ""}
        onChange={set("birth_date")}
        errorName={error("birth_date")}
        disabled={pending}
        dateOnly
      />

      <FormInput
        label="CPF *"
        htmlfor="cpf"
        name="cpf"
        type="text"
        placeholder="000.000.000-00"
        mask="999.999.999-99"
        value={formValues.cpf ?? ""}
        onChange={(event) => handleFieldChange("cpf", event.target.value)}
        errorName={error("cpf")}
        disabled={pending}
      />

      <FormInput
        label="RG *"
        htmlfor="rg"
        name="rg"
        type="text"
        placeholder="00.000.000-0"
        mask="99.999.999-9"
        value={formValues.rg ?? ""}
        onChange={(event) => handleFieldChange("rg", event.target.value)}
        errorName={error("rg")}
        disabled={pending}
      />

      <FormInput
        label="CNH *"
        htmlfor="cnh"
        name="cnh"
        type="text"
        placeholder="00000000000"
        mask="99999999999"
        value={formValues.cnh ?? ""}
        onChange={(event) => handleFieldChange("cnh", event.target.value)}
        errorName={error("cnh")}
        disabled={pending}
      />

      <SelectField
        label="Categoria da CNH (opcional)"
        htmlfor="cnh_category"
        name="cnh_category"
        value={formValues.cnh_category ?? ""}
        onChange={set("cnh_category")}
        errorName={error("cnh_category")}
        placeholder="Selecione a categoria"
        options={CNH_CATEGORY_OPTIONS}
        disabled={pending}
        hint="Aparece na lista e pode ser usada nos filtros."
      />

      <DatePickerField
        label="Validade da CNH (opcional)"
        htmlfor="cnh_expires_at"
        name="cnh_expires_at"
        value={formValues.cnh_expires_at ?? ""}
        onChange={set("cnh_expires_at")}
        errorName={error("cnh_expires_at")}
        disabled={pending}
        dateOnly
        allowFutureDates
        hint="Vencida ou a vencer em 30 dias aparece destacada na lista."
      />

      <SelectField
        label="Status *"
        htmlfor="status"
        name="status"
        value={formValues.status ?? ""}
        onChange={set("status")}
        errorName={error("status")}
        placeholder="Selecione o status do motorista"
        options={[
          { value: "ACTIVE", label: "Ativo" },
          { value: "INACTIVE", label: "Inativo" },
        ]}
        disabled={pending}
      />

      <SelectField
        label="Tipo de contrato *"
        htmlfor="contract_type"
        name="contract_type"
        value={formValues.contract_type ?? ""}
        onChange={set("contract_type")}
        errorName={error("contract_type")}
        placeholder="Selecione o tipo de contrato"
        options={[
          { value: "OWNED", label: "Próprio" },
          { value: "THIRD_PARTY", label: "Terceirizado" },
        ]}
        disabled={pending}
      />

      {addressFields.map((field) => (
        <FormInput
          key={field.name}
          {...field}
          value={formValues[field.name] ?? ""}
          errorName={error(field.name as keyof DriverFormValues)}
          disabled={field.disabled || pending}
        />
      ))}
    </div>
  );
};

interface SubmitRowProps {
  isEdit: boolean;
  canSubmit: boolean;
  busy: boolean;
  onBack: () => void;
}

const SubmitRow = ({ isEdit, canSubmit, busy, onBack }: SubmitRowProps) => {
  const { pending } = useFormStatus();

  return (
    <DialogFormFooter className="mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={pending}
        {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
      >
        Voltar
      </Button>

      <Button type="submit" disabled={pending || busy || !canSubmit}>
        <span>{isEdit ? "Salvar Alterações" : "Criar Motorista"}</span>
        {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
    </DialogFormFooter>
  );
};

/**
 * Creating and editing a driver, one dialog for /admin and /dashboard
 * (decision 8.7): first the branch (optional), then the driver.
 *
 * The /admin copy asked for a company inside the dialog, apart from the one
 * the page was showing, and let an edit "move" a driver to another company —
 * which the API refused as not found. The company is now the page's.
 */
const DriverFormDialog = ({
  businessId,
  driver,
  isOpen,
  onClose,
}: DriverFormDialogProps): JSX.Element => {
  const isEdit = Boolean(driver);

  const [state, dispatch] = useFormState<DriverFormState, FormData>(
    guardFormAction(isEdit ? handleUpdateDriver : handleCreateDriver),
    {},
  );

  const original = useMemo<DriverFormValues>(
    () => (driver ? driverFormValuesOf(driver) : EMPTY_VALUES),
    [driver],
  );

  const [step, setStep] = useState<"branch" | "driver">("branch");
  const [branch, setBranch] = useState({
    branchId: original.branchId,
    searchBranchInputValue: driver?.branch?.corporate_reason ?? "",
  });

  const [values, setValues] = useState<Record<string, string>>({ ...original });
  const [cepBusy, setCepBusy] = useState<boolean>(false);

  const handledState = useRef<DriverFormState | null>(null);

  const errors = isEdit ? state.updateDriverError : state.createDriverError;
  const errorMessage =
    state.createDriverError?.createDriverErrorMessage ??
    state.updateDriverError?.updateDriverErrorMessage;

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      void refreshAfterDriverWrite(
        isEdit ? "update-driver" : "create-driver",
      ).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
  }, [state, errorMessage, isEdit, onClose]);

  // Decision 2.5: an edit that changes nothing cannot be saved.
  const changed = changedDriverFields(original, {
    ...values,
    branchId: branch.branchId,
  });
  const canSubmit = canSubmitForm({ isEdit, isDirty: changed.length > 0 });

  const submit = (formData: FormData) => {
    formData.set("businessId", businessId);
    formData.set("branchId", branch.branchId);

    if (driver) formData.set("driverId", driver.id);

    return dispatch(formData);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "branch"
              ? "Selecionar Filial (opcional)"
              : isEdit
                ? "Editar Motorista"
                : "Criar Novo Motorista"}
          </DialogTitle>
          <DialogDescription>
            {step === "branch"
              ? "Vincule o motorista a uma filial da empresa, se quiser. Você pode prosseguir sem filial."
              : isEdit
                ? "Atualize as informações do motorista. Inativar um motorista com rota planejada, liberada ou em andamento é recusado."
                : "Preencha os dados do motorista. Categoria e validade da CNH são opcionais; a validade vencida ou a vencer em 30 dias aparece destacada na lista."}
          </DialogDescription>
        </DialogHeader>

        {/* Both steps stay mounted, so going back keeps what was typed. */}
        <div className={cn(step !== "branch" && "hidden")}>
          <div className="space-y-4">
            {branch.searchBranchInputValue && (
              <div className="flex w-full min-w-0 items-center gap-2">
                <div
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 min-w-0 flex-1 justify-start gap-1 border-dashed",
                  )}
                >
                  <span>Filial:</span>
                  <span className="truncate">
                    {branch.searchBranchInputValue}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Remover a filial"
                  onClick={() =>
                    setBranch({ branchId: "", searchBranchInputValue: "" })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <SearchBranch
              businessId={businessId}
              searchBranchInputValue={branch.searchBranchInputValue}
              errorBranchId={errors?.branchId}
              isOptional
              handleUpdateSearchBranchInputValue={(picked) =>
                setBranch((current) =>
                  current.branchId === picked.branchId
                    ? { branchId: "", searchBranchInputValue: "" }
                    : picked,
                )
              }
            />
          </div>

          <DialogFormFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => setStep("driver")}>
              Prosseguir
            </Button>
          </DialogFormFooter>
        </div>

        <form
          action={submit}
          noValidate
          className={cn(step !== "driver" && "hidden")}
        >
          <DriverFields
            isOpen={isOpen}
            initialValues={original}
            errors={errors}
            onValuesChange={setValues}
            onBusyChange={setCepBusy}
          />

          <SubmitRow
            isEdit={isEdit}
            canSubmit={canSubmit}
            busy={cepBusy}
            onBack={() => setStep("branch")}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DriverFormDialog };
