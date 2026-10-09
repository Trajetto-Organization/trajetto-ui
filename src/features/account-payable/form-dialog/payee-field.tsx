"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import FormInput from "@/components/shared/custom/form-input";
import { FieldShell } from "@/components/shared/custom/field-shell";

import {
  NO_ACCESS_HINTS,
  type AccountPayableFormValues,
  type BillFormAccess,
} from "../lib/form-values";
import type { AccountPayableRow } from "../lib/server-table";

import { SupplierPicker } from "./pickers";

interface PayeeFieldProps {
  businessId: string;
  bill?: AccountPayableRow;
  values: Pick<
    AccountPayableFormValues,
    "payeeKind" | "supplierId" | "payee_name"
  >;
  set: <K extends "payeeKind" | "supplierId" | "payee_name">(
    key: K,
    value: AccountPayableFormValues[K],
  ) => void;
  errors: Record<string, string[] | undefined>;
  /** The form is submitting. */
  pending: boolean;
  access: BillFormAccess;
  /** False only when editing a legacy bill that never had a payee. */
  payeeRequired: boolean;
}

/**
 * Who is paid (decision 8.4): a registered supplier or a free-text name.
 *
 * The choice is a field like any other (decisions 3.3 and 3.4): "Favorecido
 * *" with the red star and `aria-required`, or "(opcional)" for a bill from
 * before the column. It was a bare <Label> with a typed "*". A radio group
 * is not labelable by <label for>, so the group is named by aria-label.
 * Without supplier_manage the supplier option is off, with the reason, and
 * the name is the way in.
 */
const PayeeField = ({
  businessId,
  bill,
  values,
  set,
  errors,
  pending,
  access,
  payeeRequired,
}: PayeeFieldProps): JSX.Element => (
  <div className="md:col-span-2 space-y-3 rounded-md border p-3">
    <FieldShell
      label={payeeRequired ? "Favorecido *" : "Favorecido (opcional)"}
      htmlFor="payee-kind"
      labelTargetsControl={false}
      hint={access.suppliers ? undefined : NO_ACCESS_HINTS.suppliers}
    >
      {(control) => (
        <RadioGroup
          {...control}
          aria-label="Favorecido"
          className="flex flex-wrap gap-4"
          value={values.payeeKind}
          onValueChange={(value) =>
            set("payeeKind", value === "name" ? "name" : "supplier")
          }
          disabled={pending}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="supplier"
              id="payee-kind-supplier"
              disabled={!access.suppliers}
            />
            <Label htmlFor="payee-kind-supplier" className="font-normal">
              Fornecedor cadastrado
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="name" id="payee-kind-name" />
            <Label htmlFor="payee-kind-name" className="font-normal">
              Outro favorecido (pedágio, prestador avulso)
            </Label>
          </div>
        </RadioGroup>
      )}
    </FieldShell>

    {values.payeeKind === "supplier" ? (
      <SupplierPicker
        businessId={businessId}
        value={values.supplierId}
        onChange={(id) => set("supplierId", id)}
        fallbackLabel={bill?.supplier?.name}
        errorName={errors.supplierId ?? errors.payee_name}
        disabled={pending}
        readable={access.suppliers}
        required={payeeRequired}
      />
    ) : (
      <FormInput
        label={
          payeeRequired
            ? "Nome do favorecido *"
            : "Nome do favorecido (opcional)"
        }
        htmlfor="payee_name"
        name="payee_name"
        type="text"
        maxLength={120}
        errorName={errors.payee_name}
        value={values.payee_name}
        onChange={(event) => set("payee_name", event.target.value)}
        placeholder="A quem a conta é paga"
        disabled={pending}
      />
    )}
  </div>
);

export { PayeeField };
