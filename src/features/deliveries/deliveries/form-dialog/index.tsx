"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, Lock, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import FormInput from "@/components/shared/custom/form-input";
import { applyMask } from "@/lib/format-values";
import { useFormDirty } from "@/hooks/use-form-dirty";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The NF-e access key is exactly 44 digits. Masking it keeps letters, spaces
 * and a 45th character out of the field entirely, which is a better answer
 * than validating them away afterwards.
 */
const INVOICE_KEY_MASK = "9".repeat(44);

/**
 * Defaults and the dirty comparison must speak the exact string the masked
 * input renders, so both go through applyMask with the input's own mask.
 * (formatTelephone prepends "+55 ", which the mask would re-parse as if 55
 * were the area code.)
 */
const TELEPHONE_MASK = "(99) 99999-9999";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import { useCepValidation } from "@/app/(protected)/_components/hooks";
import { handleCreateDelivery } from "@/actions/delivery/create-delivery";
import { handleUpdateDelivery } from "@/actions/delivery/update-delivery";

import type { DeliveryDetail } from "@/actions/delivery/get-delivery";

import { ShipperSelector } from "../shipper-selector";
import {
  DEFAULT_DELIVERY_KIND,
  DELIVERY_KIND_LABELS,
  WRITABLE_DELIVERY_KINDS,
  deliveryKindOf,
  type WritableDeliveryKind,
} from "../../lib/kind";

import { useDeliveryForm, type DeliveryFormState } from "./hooks";
import { guardFormAction } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import {
  createUpdateDeliverySchema,
  deliveryItemSchema,
} from "@/schemas/create-update-delivery-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

interface DeliveryFormDialogProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Present when editing; absent creates a new delivery. */
  delivery?: DeliveryDetail | null;
}

interface ItemRow {
  key: number;
  description: string;
  /** Kept as typed text ("2,5"); the schema converts on submit. */
  quantity: string;
  unit_value: string;
}

const emptyItem = (key: number): ItemRow => ({
  key,
  description: "",
  quantity: "1",
  unit_value: "",
});

/** The stored items as editable rows (the API sends decimals as strings). */
const itemsOf = (delivery?: DeliveryDetail | null): ItemRow[] =>
  (delivery?.items ?? []).map((item, index) => ({
    key: index + 1,
    description: item.description,
    quantity: String(item.quantity).replace(".", ","),
    unit_value:
      item.unit_value == null ? "" : String(item.unit_value).replace(".", ","),
  }));

/** Order-sensitive comparison of item lists, for dirty state and the patch. */
const itemsFingerprint = (rows: ItemRow[]): string =>
  JSON.stringify(
    rows.map((row) => [
      row.description.trim(),
      Number(row.quantity.replace(",", ".")) || 0,
      row.unit_value.trim() === ""
        ? null
        : Number(row.unit_value.replace(",", ".")),
    ]),
  );

/** Digits with a single comma — the Brazilian decimal, no letters, no signs. */
const sanitizeDecimal = (value: string, decimals: number): string => {
  let cleaned = value.replace(/[^\d,.]/g, "").replace(".", ",");

  const parts = cleaned.split(",");

  if (parts.length > 2) {
    cleaned = `${parts[0]},${parts.slice(1).join("")}`;
  }

  const [whole, fraction] = cleaned.split(",");

  if (fraction !== undefined && fraction.length > decimals) {
    return `${whole},${fraction.substring(0, decimals)}`;
  }

  return cleaned;
};

/**
 * The shared address fields (fed by the CEP lookup) plus the ones that only
 * a delivery has. Everything else in businessFieldsData belongs to a company
 * registration, not to a drop-off point.
 */
const ADDRESS_FIELDS = [
  "cep",
  "city",
  "uf",
  "street",
  "address_number",
  "complement",
];

/** The plain text fields, controlled so live validation can read them. */
type DeliveryTextFields = Record<
  | "recipient_name"
  | "recipient_email"
  | "code"
  | "neighborhood"
  | "invoice_key"
  | "notes",
  string
>;

const textFieldsOf = (
  delivery?: DeliveryDetail | null,
): DeliveryTextFields => ({
  recipient_name: delivery?.recipient_name ?? "",
  recipient_email: delivery?.recipient_email ?? "",
  code: delivery?.code ?? "",
  neighborhood: delivery?.neighborhood ?? "",
  invoice_key: "",
  notes: delivery?.notes ?? "",
});

type ItemCell = "description" | "quantity" | "value";

const ITEM_CELLS: readonly ItemCell[] = ["description", "quantity", "value"];

/** The live-validation field of one item cell: its control's id. */
const itemFieldId = (key: number, cell: ItemCell): string =>
  `item-${key}-${cell}`;

/** The submit sends a row when any cell has text (submitDeliveryForm). */
const isItemSent = (item: ItemRow): boolean =>
  item.description.trim() !== "" ||
  item.unit_value.trim() !== "" ||
  item.quantity.trim() !== "";

/**
 * The type the form opens on: the delivery's own, or Entrega for a new one.
 * A Coleta is the spreadsheet's (only it creates one): shown, not offered.
 */
const kindOf = (delivery?: DeliveryDetail | null): WritableDeliveryKind => {
  const kind = delivery ? deliveryKindOf(delivery) : DEFAULT_DELIVERY_KIND;

  return kind === "PICKUP" ? DEFAULT_DELIVERY_KIND : kind;
};

const firstIssue = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => (result.success ? null : (result.error?.issues[0]?.message ?? null));

/**
 * Each sent row checked cell by cell with the action's own item schema, so a
 * bad row is named under its cells instead of as "Item 2: …" after a round
 * trip.
 */
const itemRules = (items: ItemRow[]): Record<string, string | null> => {
  const result: Record<string, string | null> = {};
  const shape = deliveryItemSchema.shape;

  for (const item of items) {
    if (!isItemSent(item)) continue;

    result[itemFieldId(item.key, "description")] = firstIssue(
      shape.description.safeParse(item.description),
    );
    result[itemFieldId(item.key, "quantity")] = firstIssue(
      shape.quantity.safeParse(item.quantity),
    );
    result[itemFieldId(item.key, "value")] =
      item.unit_value.trim() === ""
        ? null
        : firstIssue(shape.unit_value.safeParse(item.unit_value));
  }

  return result;
};

const DeliveryFormDialogSubmit = ({
  state,
  isOpen,
  items,
  setItems,
  kind,
  setKind,
  shipperId,
  setShipperId,
  scheduledDate,
  setScheduledDate,
  onClose,
  businessId,
  delivery,
  formRef,
}: {
  state: DeliveryFormState;
  isOpen: boolean;
  items: ItemRow[];
  setItems: (updater: (prev: ItemRow[]) => ItemRow[]) => void;
  kind: WritableDeliveryKind;
  setKind: (value: WritableDeliveryKind) => void;
  shipperId: string;
  setShipperId: (value: string) => void;
  scheduledDate: string;
  setScheduledDate: (value: string) => void;
  onClose: () => void;
  businessId: string;
  delivery?: DeliveryDetail | null;
  formRef: React.RefObject<HTMLFormElement>;
}): JSX.Element => {
  const isEditing = delivery != null;
  const { pending } = useFormStatus();

  // Decision 5.2: the key is set once (editable while empty), and the items
  // are the dispatcher's on a typed delivery but the note's on an XML one.
  const keyLocked = isEditing && Boolean(delivery.invoice_key);
  const itemsLocked = isEditing && delivery.import?.source === "NFE_XML";

  // A Coleta came from the spreadsheet and keeps its type: the form only
  // writes Entrega or Ordem de serviço (meeting of 14/10/2026).
  const kindLocked = isEditing && deliveryKindOf(delivery) === "PICKUP";

  // react-input-mask only behaves predictably when controlled: left
  // uncontrolled, deleting through the mask's literals resurrects digits.
  const [recipientTelephone, setRecipientTelephone] = useState<string>(() =>
    applyMask(delivery?.recipient_telephone ?? "", TELEPHONE_MASK),
  );

  // Controlled (live validation reads values, not the DOM); reseeded when
  // the dialog opens on another delivery.
  const [textFields, setTextFields] = useState<DeliveryTextFields>(() =>
    textFieldsOf(delivery),
  );
  const setTextField = (name: keyof DeliveryTextFields, value: string) =>
    setTextFields((prev) => ({ ...prev, [name]: value }));

  useEffect(() => {
    if (!isOpen) return;
    setTextFields(textFieldsOf(delivery));
    setRecipientTelephone(
      applyMask(delivery?.recipient_telephone ?? "", TELEPHONE_MASK),
    );
  }, [isOpen, delivery]);

  // Same hook the branch/company/supplier forms use: fills city, UF and
  // street from the CEP and warns when the CEP does not exist.
  // Memoised because useCepValidation resets its form values whenever this
  // object's identity changes. Rebuilding it on every render made that effect
  // fire, set state, re-render, rebuild — the "Maximum update depth exceeded"
  // that appeared when the shipper popover forced a render.
  //
  // The hook models an absent address as undefined; a delivery stores it as
  // null, so the nulls are dropped rather than handed over as "no opinion".
  const addressInitialData = useMemo(() => {
    if (!delivery) return undefined;

    return Object.fromEntries(
      Object.entries({
        cep: delivery.cep,
        city: delivery.city,
        uf: delivery.uf,
        street: delivery.street,
        address_number: delivery.address_number,
        complement: delivery.complement,
      }).filter(([, value]) => value != null),
    );
  }, [delivery]);

  const {
    updatedFields,
    cepLoading,
    isDirty: isAddressDirty,
    formValues: addressValues,
  } = useCepValidation({
    isOpen,
    ...(addressInitialData && { initialData: addressInitialData }),
  });

  // The address block is owned by useCepValidation, which tracks its own
  // dirtiness; everything else is plain inputs plus two controlled pickers.
  const initialValues = useMemo(
    () => ({
      ...(isEditing && !delivery?.invoice_key && { invoice_key: "" }),
      recipient_name: delivery?.recipient_name ?? "",
      recipient_telephone: applyMask(
        delivery?.recipient_telephone ?? "",
        TELEPHONE_MASK,
      ),
      recipient_email: delivery?.recipient_email ?? "",
      code: delivery?.code ?? "",
      neighborhood: delivery?.neighborhood ?? "",
      notes: delivery?.notes ?? "",
    }),
    [delivery, isEditing],
  );

  const isFieldsDirty = useFormDirty({
    formRef,
    initialValues,
    isOpen,
    extraValues: [
      [kind, kindOf(delivery)],
      [shipperId, delivery?.shipper?.id ?? ""],
      [scheduledDate, delivery?.scheduled_date?.slice(0, 10) ?? ""],
      [itemsFingerprint(items), itemsFingerprint(itemsOf(delivery))],
    ],
  });

  const isDirty = isAddressDirty || isFieldsDirty;

  // The shared address fields label the number as required (a company's
  // registration needs it); a drop-off point may have none, and the
  // delivery schema takes it as optional — the label says so.
  const addressFields = updatedFields
    .filter((field) => ADDRESS_FIELDS.includes(field.name))
    .map((field) =>
      field.name === "address_number"
        ? { ...field, label: "Número (opcional)" }
        : field,
    );

  const fieldErrors = (
    isEditing
      ? (state.updateDeliveryError ?? {})
      : (state.createDeliveryError ?? {})
  ) as Record<string, string[]>;

  // Live validation (decision 16.700): the action's schema, plus each item
  // row by the item schema the action applies to the JSON block.
  const itemFields = itemsLocked
    ? []
    : items.flatMap((item) =>
        ITEM_CELLS.map((cell) => itemFieldId(item.key, cell)),
      );

  const live = useLiveValidation({
    schema: createUpdateDeliverySchema,
    values: {
      ...Object.fromEntries(
        ADDRESS_FIELDS.map((name) => [name, addressValues[name] ?? ""]),
      ),
      ...textFields,
      ...(kindLocked ? {} : { kind }),
      shipperId,
      recipient_telephone: recipientTelephone,
      scheduled_date: scheduledDate,
    },
    rules: () => (itemsLocked ? {} : itemRules(items)),
    fields: [
      ...(kindLocked ? [] : ["kind"]),
      "shipperId",
      "recipient_name",
      "recipient_telephone",
      "recipient_email",
      "code",
      ...ADDRESS_FIELDS,
      "neighborhood",
      ...(keyLocked ? [] : ["invoice_key"]),
      "scheduled_date",
      ...itemFields,
      "notes",
    ],
    serverErrors: fieldErrors,
    controlIds: { shipperId: "shipper-selector", kind: "delivery-kind" },
    resetKey: isOpen,
  });

  const itemError = (key: number, cell: ItemCell) =>
    live.messageOf(itemFieldId(key, cell));

  /** The red border and the described-by of one item cell. */
  const itemCellProps = (
    key: number,
    cell: ItemCell,
    extraDescribedBy?: string,
  ) => {
    const invalid = Boolean(itemError(key, cell));
    const describedBy = [invalid && `item-${key}-errors`, extraDescribedBy]
      .filter(Boolean)
      .join(" ");

    return {
      "aria-invalid": invalid || undefined,
      "aria-describedby": describedBy || undefined,
      className: cn(invalid && "border-red-600 dark:border-red-500"),
    };
  };

  const updateItem = (key: number, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  return (
    <>
      {/* The fields' scope for live validation; the footer stays outside so
          a press on Cancelar is never read as leaving a field. */}
      <div ref={live.ref}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* What the record is (meeting of 14/10/2026): an Entrega or an
              Ordem de serviço — a stop to perform a service at the address,
              like collecting returnable baskets. Same route, driver and
              proof; the type labels it and filters the list. */}
          <FieldShell
            label="Tipo *"
            htmlFor="delivery-kind"
            error={kindLocked ? null : live.errorOf("kind")}
            hint={
              kindLocked
                ? "Coleta importada pela planilha: o tipo não muda por aqui."
                : undefined
            }
          >
            {(control) => (
              <>
                <Select
                  value={kindLocked ? "PICKUP" : kind}
                  onValueChange={(value) =>
                    setKind(value as WritableDeliveryKind)
                  }
                  disabled={pending || kindLocked}
                >
                  <SelectTrigger
                    {...control}
                    className={cn(
                      "w-full",
                      control["aria-invalid"] &&
                        "border-red-600 dark:border-red-500",
                    )}
                    data-delivery-kind-trigger
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kindLocked && (
                      <SelectItem value="PICKUP">
                        {DELIVERY_KIND_LABELS.PICKUP}
                      </SelectItem>
                    )}
                    {WRITABLE_DELIVERY_KINDS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {DELIVERY_KIND_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* A Radix Select is not a form control: the value travels
                    in a hidden input. Absent on a Coleta, so the edit keeps
                    its type. */}
                {!kindLocked && (
                  <input type="hidden" name="kind" value={kind} />
                )}
              </>
            )}
          </FieldShell>

          <ShipperSelector
            businessId={businessId}
            value={shipperId}
            onChange={setShipperId}
            fallbackLabel={
              shipperId === delivery?.shipper?.id
                ? delivery?.shipper?.name
                : null
            }
            errorName={live.errorOf("shipperId")}
            disabled={pending}
          />

          <FormInput
            label="Destinatário *"
            htmlfor="recipient_name"
            name="recipient_name"
            type="text"
            value={textFields.recipient_name}
            onChange={(e) => setTextField("recipient_name", e.target.value)}
            placeholder="Quem recebe a mercadoria"
            errorName={live.errorOf("recipient_name")}
            disabled={pending}
          />

          <FormInput
            label="Telefone do destinatário (opcional)"
            htmlfor="recipient_telephone"
            name="recipient_telephone"
            type="text"
            mask={TELEPHONE_MASK}
            autoComplete="tel"
            value={recipientTelephone}
            onChange={(e) => setRecipientTelephone(e.target.value)}
            placeholder="(00) 00000-0000"
            errorName={live.errorOf("recipient_telephone")}
            disabled={pending}
          />

          <FormInput
            label="E-mail do destinatário (opcional)"
            htmlfor="recipient_email"
            name="recipient_email"
            type="text"
            autoComplete="email"
            value={textFields.recipient_email}
            onChange={(e) => setTextField("recipient_email", e.target.value)}
            placeholder="Para avisar sobre a entrega"
            errorName={live.errorOf("recipient_email")}
            disabled={pending}
          />

          <FormInput
            label="Código do pedido (opcional)"
            htmlfor="code"
            name="code"
            type="text"
            value={textFields.code}
            onChange={(e) => setTextField("code", e.target.value)}
            placeholder="Referência interna ou do ERP"
            errorName={live.errorOf("code")}
            disabled={pending}
          />

          {addressFields.map((field, index) => (
            <FormInput
              key={index}
              {...field}
              errorName={live.errorOf(field.name)}
              disabled={field.disabled || pending}
            />
          ))}

          <FormInput
            label="Bairro (opcional)"
            htmlfor="neighborhood"
            name="neighborhood"
            type="text"
            value={textFields.neighborhood}
            onChange={(e) => setTextField("neighborhood", e.target.value)}
            placeholder="Bairro"
            errorName={live.errorOf("neighborhood")}
            disabled={pending}
          />

          {/* Masked instead of validated after the fact: the key is 44 digits
        and nothing else, so letters, spaces and a 45th character simply never
        enter the field. What is left for zod to catch is a key typed short.

        Set once (decision 5.2): editable while the delivery has none — the
        order is often typed before the note is issued — and read-only after,
        because it identifies the delivery and anchors the XML dedupe. */}
          {keyLocked ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <FormInput
                      label="Chave da NF-e"
                      htmlfor="invoice_key_locked"
                      name="invoice_key_locked"
                      type="text"
                      inputMode="numeric"
                      mask={INVOICE_KEY_MASK}
                      maskChar={null}
                      defaultValue={delivery?.invoice_key ?? ""}
                      icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                      readOnly
                      disabled
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>
                    A chave é definida uma vez: identifica a entrega e ancora a
                    deduplicação do XML. Se a nota estiver errada, cancele esta
                    entrega e crie outra.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <FormInput
              label="Chave da NF-e (opcional)"
              htmlfor="invoice_key"
              name="invoice_key"
              type="text"
              inputMode="numeric"
              mask={INVOICE_KEY_MASK}
              maskChar={null}
              placeholder="44 dígitos"
              value={textFields.invoice_key}
              onChange={(e) => setTextField("invoice_key", e.target.value)}
              errorName={live.errorOf("invoice_key")}
              disabled={pending}
            />
          )}

          {/* The expected date is a DAY (decisions 1.3 and 1.5): the picker
        emits "YYYY-MM-DD" and reads the stored UTC midnight as that day. */}

          <DatePickerField
            label="Data prevista de entrega (opcional)"
            htmlfor="scheduled_date"
            name="scheduled_date"
            value={scheduledDate}
            onChange={setScheduledDate}
            errorName={live.errorOf("scheduled_date")}
            disabled={pending}
            allowFutureDates
            dateOnly
          />
        </div>

        {/* An NF-e XML delivery's cargo is what the note declared, so its items
      are shown locked; a typed delivery's are edited like on create
      (decision 5.2). */}
        {itemsLocked && delivery ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Itens da carga</Label>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {delivery.items.length === 0 ? (
                    <p
                      className="rounded-lg border border-dashed p-3 text-xs
                    text-muted-foreground"
                    >
                      Esta entrega foi registrada sem itens.
                    </p>
                  ) : (
                    <div className="space-y-2 opacity-70">
                      {delivery.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-lg border p-3
                        sm:flex-row sm:items-end"
                        >
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input value={item.description} readOnly disabled />
                          </div>

                          <div className="w-full space-y-1 sm:w-24">
                            <Label className="text-xs">Qtd.</Label>
                            <Input value={item.quantity} readOnly disabled />
                          </div>

                          <div className="w-full space-y-1 sm:w-32">
                            <Label className="text-xs">Valor un. (R$)</Label>
                            <Input
                              value={item.unit_value ?? "—"}
                              readOnly
                              disabled
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  Os itens desta entrega vieram do XML da NF-e e não são
                  editáveis. Para corrigir a nota, cancele esta entrega e crie
                  outra.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <Label>Itens da carga (opcional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() =>
                  setItems((prev) => [...prev, emptyItem(Date.now())])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar item
              </Button>
            </div>

            {fieldErrors.items && (
              <ul id="delivery-items-errors" className="space-y-1" role="alert">
                {fieldErrors.items.map((message, index) => (
                  <li key={index} className="text-xs text-destructive">
                    {message}
                  </li>
                ))}
              </ul>
            )}

            {items.map((item, index) => (
              <div key={item.key} className="space-y-1">
                {/* Phones: description on its own line, then Qtd., Valor and the
              trash button side by side so the button stays with its row. */}
                <div
                  data-item-row
                  className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-end gap-2
            sm:flex"
                >
                  <div className="col-span-3 min-w-0 flex-1 space-y-1">
                    <Label
                      htmlFor={`item-${item.key}-description`}
                      className="text-xs"
                    >
                      Descrição{" "}
                      <span className="text-red-600 dark:text-red-400">*</span>
                    </Label>
                    <Input
                      id={`item-${item.key}-description`}
                      aria-required
                      aria-label={`Descrição do item ${index + 1}`}
                      {...itemCellProps(
                        item.key,
                        "description",
                        fieldErrors.items ? "delivery-items-errors" : undefined,
                      )}
                      value={item.description}
                      disabled={pending}
                      onChange={(e) =>
                        updateItem(item.key, { description: e.target.value })
                      }
                      placeholder="Produto ou volume"
                    />
                  </div>
                  <div className="w-full space-y-1 sm:w-24">
                    <Label
                      htmlFor={`item-${item.key}-quantity`}
                      className="text-xs"
                    >
                      Qtd.{" "}
                      <span className="text-red-600 dark:text-red-400">*</span>
                    </Label>
                    <Input
                      id={`item-${item.key}-quantity`}
                      aria-required
                      {...itemCellProps(item.key, "quantity")}
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      disabled={pending}
                      // Not a bare "1": an emptied cell would look filled next to
                      // "A quantidade é obrigatória.".
                      placeholder="Ex.: 1"
                      onChange={(e) =>
                        updateItem(item.key, {
                          quantity: sanitizeDecimal(e.target.value, 3),
                        })
                      }
                    />
                  </div>
                  <div className="w-full space-y-1 sm:w-44">
                    <Label
                      htmlFor={`item-${item.key}-value`}
                      className="block text-xs leading-4"
                    >
                      Valor un. em R$ (opcional)
                    </Label>
                    <Input
                      id={`item-${item.key}-value`}
                      {...itemCellProps(item.key, "value")}
                      type="text"
                      inputMode="decimal"
                      value={item.unit_value}
                      disabled={pending}
                      placeholder="0,00"
                      onChange={(e) =>
                        updateItem(item.key, {
                          unit_value: sanitizeDecimal(e.target.value, 2),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    aria-label="Remover item"
                    disabled={pending}
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.key !== item.key))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* The row's messages under it, one per cell: on a phone the
              cells are narrow and a message under each would break the row. */}
                {ITEM_CELLS.some((cell) => itemError(item.key, cell)) && (
                  <ul id={`item-${item.key}-errors`} className="space-y-0.5">
                    {ITEM_CELLS.map((cell) => {
                      const message = itemError(item.key, cell);
                      return message ? (
                        <li
                          key={cell}
                          className="text-xs text-red-600 dark:text-red-500"
                        >
                          {message}
                        </li>
                      ) : null;
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <FieldShell
          label="Observações (opcional)"
          htmlFor="notes"
          error={live.errorOf("notes")}
          className="mt-4"
        >
          {(control) => (
            <Textarea
              {...control}
              name="notes"
              value={textFields.notes}
              onChange={(e) => setTextField("notes", e.target.value)}
              maxLength={500}
              disabled={pending}
              placeholder="Instruções de entrega, restrições de horário etc."
            />
          )}
        </FieldShell>

        {/* The shared footer (decision 3.2): a wide modal gets its buttons on
      the right at natural width, Cancelar first. */}
      </div>

      <DialogFormFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            cepLoading ||
            !canSubmitForm({ isEdit: isEditing, isDirty })
          }
        >
          <span>{isEditing ? "Salvar Entrega" : "Criar Entrega"}</span>
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </DialogFormFooter>
    </>
  );
};

const DeliveryFormDialog = ({
  businessId,
  isOpen,
  onClose,
  delivery = null,
}: DeliveryFormDialogProps): JSX.Element => {
  const defaultState: DeliveryFormState = {};
  const isEditing = delivery != null;

  const [state, dispatch] = useFormState<DeliveryFormState, FormData>(
    guardFormAction(isEditing ? handleUpdateDelivery : handleCreateDelivery),
    defaultState,
  );

  const { formRef } = useDeliveryForm({ state, onClose });

  // Saving the same new delivery again is the same delivery (IDEMP-14).
  const idempotencyKeyFor = useIdempotencyKey(state);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [kind, setKind] = useState<WritableDeliveryKind>(DEFAULT_DELIVERY_KIND);
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const [shipperId, setShipperId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    // Controlled fields do not take defaultValue, so they are seeded here.
    setItems(itemsOf(delivery));
    setKind(kindOf(delivery));
    setScheduledDate(delivery?.scheduled_date?.slice(0, 10) ?? "");

    setShipperId(delivery?.shipper?.id ?? "");
  }, [isOpen, delivery]);

  const submitDeliveryForm = (deliveryFormData: FormData) => {
    deliveryFormData.append("businessId", businessId);

    // Items are a repeatable block, not a flat field — they travel as JSON
    // and the action parses them back.
    const filledItems = items
      .filter(
        (item) =>
          item.description.trim() !== "" ||
          item.unit_value.trim() !== "" ||
          item.quantity.trim() !== "",
      )
      .map(({ key: _key, ...item }) => ({
        description: item.description,
        quantity: item.quantity,
        ...(item.unit_value.trim() !== "" && { unit_value: item.unit_value }),
      }));

    if (isEditing) {
      deliveryFormData.append("deliveryId", delivery.id);

      // Only when the list is editable (a typed delivery) AND changed: the
      // API replaces the whole list, and an untouched list stays as it is.
      if (
        delivery.import?.source !== "NFE_XML" &&
        itemsFingerprint(items) !== itemsFingerprint(itemsOf(delivery))
      ) {
        deliveryFormData.append("items", JSON.stringify(filledItems));
      }

      return dispatch(deliveryFormData);
    }

    if (filledItems.length > 0) {
      deliveryFormData.append("items", JSON.stringify(filledItems));
    }

    deliveryFormData.set(
      "idempotency_key",
      idempotencyKeyFor(deliveryFormData),
    );

    return dispatch(deliveryFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Entrega" : "Criar Nova Entrega"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? "Corrija o tipo, o destinatário, o endereço, os itens e as observações. A chave da NF-e pode ser informada uma vez; depois de gravada, não muda."
              : "Entrada manual. Escolha o tipo (entrega ou ordem de serviço) e informe o destinatário e o endereço; a chave da NF-e é opcional, mas evita duplicidade quando o XML for importado."}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={submitDeliveryForm}
          noValidate
          data-delivery-form
        >
          <DeliveryFormDialogSubmit
            state={state}
            isOpen={isOpen}
            items={items}
            setItems={setItems}
            kind={kind}
            setKind={setKind}
            shipperId={shipperId}
            setShipperId={setShipperId}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            onClose={onClose}
            businessId={businessId}
            delivery={delivery}
            formRef={formRef}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DeliveryFormDialog };
