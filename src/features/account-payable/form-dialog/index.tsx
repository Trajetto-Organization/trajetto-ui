"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import FormInput from "@/components/shared/custom/form-input";
import { TextareaField } from "@/components/shared/custom/textarea-field";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { handleCreateAccountPayable } from "@/actions/account-payable/create-account-payable";
import { handleUpdateAccountPayable } from "@/actions/account-payable/update-account-payable";

import { ACCOUNT_PAYABLE_CATEGORY_OPTIONS } from "@/lib/account-payable-category";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { guardFormAction } from "@/lib/action-result";
import {
  accountPayableFormObject,
  accountPayableLiveIssues,
} from "@/schemas/create-update-account-payable-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";
import { permissions } from "@/lib/permissions";
import { useHasPermission } from "@/lib/user-has-permission";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";

import { refreshAfterAccountPayableWrite } from "../lib/after-write";
import {
  initialFormValues,
  isFormDirty,
  isPayeeRequired,
  toSubmission,
  type AccountPayableFormValues,
  type BillFormAccess,
} from "../lib/form-values";
import type { AccountPayableRow } from "../lib/server-table";
import { payeeLabel } from "../lib/stats-data";

import {
  BranchPicker,
  ResponsiblePicker,
  ServiceOrderPicker,
  VehiclePicker,
} from "./pickers";
import { PayeeField } from "./payee-field";

type FieldErrors = Record<string, string[] | undefined>;

/** What the actions answer: field errors, or one sentence for a toast. */
type ActionErrors = Record<string, string[] | string | undefined>;

interface AccountPayableFormState {
  createAccountPayableError?: ActionErrors & {
    createAccountPayableErrorMessage?: string;
  };
  updateAccountPayableError?: ActionErrors & {
    updateAccountPayableErrorMessage?: string;
  };
  successMessage?: string;
  warnings?: string[];
}

/** Only the per-field lists; the toast sentence is not a field error. */
function fieldErrorsOf(errors: ActionErrors | undefined): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors ?? {}).filter(([, value]) => Array.isArray(value)),
  ) as FieldErrors;
}

/** What a submit checks, in the form's order. */
const CHECKED_FIELDS = [
  "category",
  "category_description",
  "payee_name",
  "supplierId",
  "branchId",
  "registrationUserId",
  "vehicleId",
  "serviceOrderId",
  "due_date",
  "payment_date",
  "amount",
  "amount_paid",
  "document_number",
  "description",
];

/** Picks (selects, pickers, calendars) are complete answers: judged at once. */
const PICKED_FIELDS: ReadonlySet<string> = new Set([
  "category",
  "branchId",
  "registrationUserId",
  "vehicleId",
  "serviceOrderId",
  "due_date",
  "payment_date",
]);

/** Money typed freely, formatted as reais when the field is left. */
function moneyOnBlur(value: string): string {
  if (!value || value === "," || value === ".") return "";

  return formatToBrazilianCurrency(formatCurrencyToNumber(value));
}

interface BillFieldsProps {
  businessId: string;
  bill?: AccountPayableRow;
  values: AccountPayableFormValues;
  set: <K extends keyof AccountPayableFormValues>(
    key: K,
    value: AccountPayableFormValues[K],
  ) => void;
  errors: FieldErrors;
  canSubmit: boolean;
  submitLabel: string;
  /** Which optional pickers the profile may read. */
  access: BillFormAccess;
  /** False only when editing a legacy bill that never had a payee. */
  payeeRequired: boolean;
}

/** Inside the <form>, so useFormStatus sees the submit. */
const BillFields = ({
  businessId,
  bill,
  values,
  set,
  errors,
  canSubmit,
  submitLabel,
  access,
  payeeRequired,
}: BillFieldsProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          label="Categoria *"
          htmlfor="category"
          name="category"
          value={values.category}
          errorName={errors.category}
          disabled={pending}
          placeholder="Selecione a categoria da conta"
          options={ACCOUNT_PAYABLE_CATEGORY_OPTIONS}
          onChange={(value) => set("category", value)}
        />

        {values.category === "OTHER" ? (
          <FormInput
            label="Descrição da categoria *"
            htmlfor="category_description"
            name="category_description"
            type="text"
            maxLength={120}
            errorName={errors.category_description}
            value={values.category_description}
            onChange={(event) =>
              set("category_description", event.target.value)
            }
            placeholder="Ex.: taxa de licenciamento"
            disabled={pending}
          />
        ) : (
          <FormInput
            label="Nº do documento (opcional)"
            htmlfor="document_number"
            name="document_number"
            type="text"
            maxLength={60}
            errorName={errors.document_number}
            value={values.document_number}
            onChange={(event) => set("document_number", event.target.value)}
            placeholder="Nota fiscal, boleto ou fatura"
            disabled={pending}
          />
        )}

        {/* Decision 8.4: who is paid — a registered supplier or a name. */}
        <PayeeField
          businessId={businessId}
          bill={bill}
          values={values}
          set={set}
          errors={errors}
          pending={pending}
          access={access}
          payeeRequired={payeeRequired}
        />

        <BranchPicker
          businessId={businessId}
          value={values.branchId}
          onChange={(id) => set("branchId", id)}
          fallbackLabel={
            bill?.branch?.fantasy_name ?? bill?.branch?.corporate_reason
          }
          errorName={errors.branchId}
          disabled={pending}
        />

        <ResponsiblePicker
          businessId={businessId}
          value={values.registrationUserId}
          onChange={(id) => set("registrationUserId", id)}
          fallbackLabel={bill?.registrationUser?.name}
          errorName={errors.registrationUserId}
          disabled={pending}
        />

        <VehiclePicker
          businessId={businessId}
          value={values.vehicleId}
          onChange={(id) => set("vehicleId", id)}
          fallbackLabel={bill?.vehicle?.license_plate}
          errorName={errors.vehicleId}
          disabled={pending}
          readable={access.vehicles}
        />

        <ServiceOrderPicker
          businessId={businessId}
          value={values.serviceOrderId}
          onChange={(id) => set("serviceOrderId", id)}
          fallbackLabel={
            bill?.serviceOrder
              ? `OS #${bill.serviceOrder.id.slice(-12)}`
              : undefined
          }
          errorName={errors.serviceOrderId}
          disabled={pending}
          readable={access.serviceOrders}
        />

        <DatePickerField
          label="Data de vencimento *"
          htmlfor="due_date"
          name="due_date"
          value={values.due_date}
          onChange={(value) => set("due_date", value)}
          errorName={errors.due_date}
          allowFutureDates
          dateOnly
          disabled={pending}
        />

        <DatePickerField
          label="Data de pagamento (opcional)"
          htmlfor="payment_date"
          name="payment_date"
          value={values.payment_date}
          onChange={(value) => set("payment_date", value)}
          errorName={errors.payment_date}
          dateOnly
          disabled={pending}
        />

        <FormInput
          label="Valor total *"
          htmlfor="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          errorName={errors.amount}
          value={values.amount}
          onChange={(event) =>
            set("amount", event.target.value.replace(/[^\d,.R$\s]/g, ""))
          }
          onBlur={() => set("amount", moneyOnBlur(values.amount))}
          placeholder="R$ 0,00"
          disabled={pending}
        />

        <FormInput
          label="Valor pago (opcional)"
          htmlfor="amount_paid"
          name="amount_paid"
          type="text"
          inputMode="decimal"
          errorName={errors.amount_paid}
          value={values.amount_paid}
          onChange={(event) =>
            set("amount_paid", event.target.value.replace(/[^\d,.R$\s]/g, ""))
          }
          onBlur={() => set("amount_paid", moneyOnBlur(values.amount_paid))}
          placeholder="R$ 0,00"
          disabled={pending}
        />

        {values.category === "OTHER" && (
          <FormInput
            label="Nº do documento (opcional)"
            htmlfor="document_number"
            name="document_number"
            type="text"
            maxLength={60}
            errorName={errors.document_number}
            value={values.document_number}
            onChange={(event) => set("document_number", event.target.value)}
            placeholder="Nota fiscal, boleto ou fatura"
            disabled={pending}
          />
        )}

        <div className="md:col-span-2">
          <TextareaField
            label="Descrição (opcional)"
            htmlfor="description"
            name="description"
            maxLength={500}
            rows={3}
            errorName={errors.description}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Do que se trata a conta"
            disabled={pending}
          />
        </div>
      </div>

      {/* A wide modal: the buttons go to the right (decision 3.2). */}
      <DialogFormFooter className="mt-6">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending || !canSubmit}>
          <span>{submitLabel}</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

interface AccountPayableFormDialogProps {
  /** The company of the bill: the page's, or the row's. */
  businessId: string;
  /** Absent to create; the row to edit. */
  bill?: AccountPayableRow;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create and edit a bill: one dialog for /admin and /dashboard (decision
 * 8.7), in ONE step.
 *
 * The admin copy walked through four steps (company and branch, service
 * order, responsible, values) and the dashboard copy three; the company is
 * no longer a field (the page's, or the row's), and the links are compact
 * pickers that search on the server. New in decision 8.4: the payee, the
 * vehicle as cost centre, the document number and a description. Salvar on
 * an edit waits for a change (2.5); a warning the API sends (bills above
 * their service order's total) is shown without undoing the save.
 */
const AccountPayableFormDialog = ({
  businessId,
  bill,
  isOpen,
  onClose,
}: AccountPayableFormDialogProps): JSX.Element => {
  const isEdit = Boolean(bill);

  // The optional pickers read other sections; without their permission a
  // picker is disabled with the reason instead of answering 403. Vehicles
  // are also listed to dispatchers (decision 4.7).
  const canReadSuppliers = useHasPermission(
    permissions.SUPPLIER_MANAGE,
    "read",
  );
  const canReadVehicles = useHasPermission(permissions.VEHICLE_MANAGE, "read");
  const canDispatch = useHasPermission(permissions.DELIVERY_MANAGE, "write");
  const canReadServiceOrders = useHasPermission(
    permissions.SERVICE_ORDER_MANAGE,
    "read",
  );

  const access: BillFormAccess = {
    suppliers: canReadSuppliers,
    vehicles: canReadVehicles || canDispatch,
    serviceOrders: canReadServiceOrders,
  };

  const payeeRequired = isPayeeRequired(bill);

  // Computed once per dialog: the permissions are loaded by then (the
  // button that opens it checks them).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => initialFormValues(bill, access), [bill]);
  const [values, setValues] = useState<AccountPayableFormValues>(initial);

  const set = <K extends keyof AccountPayableFormValues>(
    key: K,
    value: AccountPayableFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));

    if (PICKED_FIELDS.has(key)) live.touch(key);
    // The payee rule's message sits on the name: a supplier picked answers it.
    if (key === "supplierId") live.touch("payee_name");
  };

  const [state, dispatch] = useFormState<AccountPayableFormState, FormData>(
    guardFormAction(
      isEdit ? handleUpdateAccountPayable : handleCreateAccountPayable,
    ),
    {},
  );

  // Saving the same form again is the same bill (IDEMP-14).
  const idempotencyKeyFor = useIdempotencyKey(state);

  const handledRef = useRef<AccountPayableFormState | null>(null);

  // Stable per action answer: the live primitive snapshots the values when
  // this reference changes, so a new object each render would never clear.
  const serverErrors = useMemo(
    () =>
      fieldErrorsOf(
        isEdit
          ? state.updateAccountPayableError
          : state.createAccountPayableError,
      ),
    [isEdit, state],
  );

  // Live validation (decision 16.700): the action's field rules, and the
  // rules between fields (payment pair, "Outros", payee) without waiting
  // for the whole form to be valid.
  const live = useLiveValidation({
    schema: accountPayableFormObject,
    values: toSubmission(values),
    rules: (submission) => ({
      ...accountPayableLiveIssues(submission, { requirePayee: payeeRequired }),
    }),
    fields: CHECKED_FIELDS,
    serverErrors,
    controlIds: {
      // With the picker on screen, the payee's message is the picker's.
      payee_name:
        values.payeeKind === "supplier"
          ? "account-payable-supplier"
          : "payee_name",
      supplierId: "account-payable-supplier-id",
      branchId: "account-payable-branch",
      registrationUserId: "account-payable-responsible",
      vehicleId: "account-payable-vehicle",
      serviceOrderId: "account-payable-service-order",
    },
  });

  const errors: FieldErrors = Object.fromEntries(
    CHECKED_FIELDS.map((field) => [field, live.errorOf(field)]),
  );

  useEffect(() => {
    if (!state || handledRef.current === state) return;

    handledRef.current = state;

    const message = isEdit
      ? state.updateAccountPayableError?.updateAccountPayableErrorMessage
      : state.createAccountPayableError?.createAccountPayableErrorMessage;

    if (message) {
      toast.error(message);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);

      for (const warning of state.warnings ?? []) {
        toast.warning(warning, { duration: 10000 });
      }

      void refreshAfterAccountPayableWrite().catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );

      onClose();
    }
    // One result, answered once; onClose is the parent's setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const submit = () => {
    if (!live.isValid()) return;

    const data = new FormData();

    for (const [key, value] of Object.entries(toSubmission(values))) {
      data.set(key, value);
    }

    data.set("businessId", businessId);

    if (bill) {
      data.set("accountPayableId", bill.id);
      data.set("payee_required", String(payeeRequired));
    } else {
      data.set("idempotency_key", idempotencyKeyFor(data));
    }

    return dispatch(data);
  };

  const canSubmit = canSubmitForm({
    isEdit,
    isDirty: isFormDirty(values, initial),
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogScrollContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? "Editar Conta a Pagar" : "Criar Conta a Pagar"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Altere os dados da conta${bill && payeeLabel(bill) ? ` de ${payeeLabel(bill)}` : ""} e salve.`
              : "Registre a conta: a quem se paga, do que se trata, o veículo que carrega o custo, as datas e os valores. O responsável é avisado."}
          </DialogDescription>
        </DialogHeader>

        <form ref={live.ref} action={submit} noValidate>
          <BillFields
            businessId={businessId}
            bill={bill}
            values={values}
            set={set}
            errors={errors}
            canSubmit={canSubmit}
            submitLabel={isEdit ? "Salvar Alterações" : "Criar Conta a Pagar"}
            access={access}
            payeeRequired={payeeRequired}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { AccountPayableFormDialog };
