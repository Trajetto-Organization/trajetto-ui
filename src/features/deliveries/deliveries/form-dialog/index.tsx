"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, Lock, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { Textarea } from "@/components/ui/textarea";

import FormInput from "@/components/shared/custom/form-input";
import { applyMask } from "@/lib/format-values";
import { useFormDirty } from "@/hooks/use-form-dirty";

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

import { useDeliveryForm, type DeliveryFormState } from "./hooks";

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

const DeliveryFormDialogSubmit = ({
  state,
  isOpen,
  items,
  setItems,
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

  // react-input-mask only behaves predictably when controlled: left
  // uncontrolled, deleting through the mask's literals resurrects digits.
  const [recipientTelephone, setRecipientTelephone] = useState<string>(() =>
    applyMask(delivery?.recipient_telephone ?? "", TELEPHONE_MASK),
  );

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

  const { updatedFields, cepLoading, isDirty: isAddressDirty } =
    useCepValidation({
      isOpen,
      ...(addressInitialData && { initialData: addressInitialData }),
    });

  // The address block is owned by useCepValidation, which tracks its own
  // dirtiness; everything else is plain inputs plus two controlled pickers.
  const initialValues = useMemo(
    () => ({
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
    [delivery],
  );

  const isFieldsDirty = useFormDirty({
    formRef,
    initialValues,
    isOpen,
    extraValues: [
      [shipperId, delivery?.shipper?.id ?? ""],
      [scheduledDate, delivery?.scheduled_date?.slice(0, 10) ?? ""],
    ],
  });

  const isDirty = isAddressDirty || isFieldsDirty;

  const addressFields = updatedFields.filter((field) =>
    ADDRESS_FIELDS.includes(field.name),
  );

  const fieldErrors = (isEditing
    ? (state.updateDeliveryError ?? {})
    : (state.createDeliveryError ?? {})) as Record<string, string[]>;

  const updateItem = (key: number, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <ShipperSelector
          businessId={businessId}
          value={shipperId}
          onChange={setShipperId}
          errorName={fieldErrors.shipperId}
          disabled={pending}
        />

        <FormInput
          label="Destinatário *"
          htmlfor="recipient_name"
          name="recipient_name"
          type="text"
          defaultValue={delivery?.recipient_name ?? ""}
          placeholder="Quem recebe a mercadoria"
          errorName={fieldErrors.recipient_name}
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
          errorName={fieldErrors.recipient_telephone}
          disabled={pending}
        />

        <FormInput
          label="E-mail do destinatário (opcional)"
          htmlfor="recipient_email"
          name="recipient_email"
          type="text"
          autoComplete="email"
          defaultValue={delivery?.recipient_email ?? ""}
          placeholder="Para avisar sobre a entrega"
          errorName={fieldErrors.recipient_email}
          disabled={pending}
        />

        <FormInput
          label="Código do pedido (opcional)"
          htmlfor="code"
          name="code"
          type="text"
          defaultValue={delivery?.code ?? ""}
          placeholder="Referência interna ou do ERP"
          errorName={fieldErrors.code}
          disabled={pending}
        />

        {addressFields.map((field, index) => (
          <FormInput
            key={index}
            {...field}
            errorName={fieldErrors[field.name]}
            disabled={field.disabled || pending}
          />
        ))}

        <FormInput
          label="Bairro (opcional)"
          htmlfor="neighborhood"
          name="neighborhood"
          type="text"
          defaultValue={delivery?.neighborhood ?? ""}
          placeholder="Bairro"
          errorName={fieldErrors.neighborhood}
          disabled={pending}
        />

        {/* Masked instead of validated after the fact: the key is 44 digits
        and nothing else, so letters, spaces and a 45th character simply never
        enter the field. What is left for zod to catch is a key typed short.

        On edit it is read-only: the key identifies the delivery and anchors
        the XML dedupe, so a wrong note is cancelled and recreated. */}
        {isEditing ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <FormInput
                    label="Chave da NF-e"
                    htmlfor="invoice_key"
                    name="invoice_key"
                    type="text"
                    inputMode="numeric"
                    mask={INVOICE_KEY_MASK}
                    maskChar={null}
                    defaultValue={delivery.invoice_key ?? ""}
                    placeholder="Sem NF-e vinculada"
                    icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                    readOnly
                    disabled
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  A chave identifica a entrega e ancora a deduplicação do XML,
                  por isso não é editável. Nota errada se resolve cancelando a
                  entrega e criando outra.
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
            errorName={fieldErrors.invoice_key}
            disabled={pending}
          />
        )}

        <DatePickerField
          label="Data prevista de entrega (opcional)"
          htmlfor="scheduled_date"
          name="scheduled_date"
          value={scheduledDate}
          onChange={setScheduledDate}
          errorName={fieldErrors.scheduled_date}
          disabled={pending}
          allowFutureDates
        />
      </div>

      {/* The cargo is what the note declared, so editing a delivery never
      touches it — the API omits items from its update schema and the form
      says so instead of offering a block that would be discarded. */}
      {isEditing ? (
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
                Os itens da carga não são editáveis: são o que a NF-e declarou.
                Para corrigir a nota, cancele esta entrega e crie outra.
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
            onClick={() => setItems((prev) => [...prev, emptyItem(Date.now())])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        {fieldErrors.items && (
          <ul className="space-y-1">
            {fieldErrors.items.map((message, index) => (
              <li key={index} className="text-xs text-red-500">
                {message}
              </li>
            ))}
          </ul>
        )}

        {items.map((item) => (
          <div key={item.key} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={item.description}
                disabled={pending}
                onChange={(e) =>
                  updateItem(item.key, { description: e.target.value })
                }
                placeholder="Produto ou volume"
              />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">Qtd.</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={item.quantity}
                disabled={pending}
                placeholder="1"
                onChange={(e) =>
                  updateItem(item.key, {
                    quantity: sanitizeDecimal(e.target.value, 3),
                  })
                }
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Valor un. (R$)</Label>
              <Input
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
        ))}
      </div>
      )}

      <FieldShell
        label="Observações (opcional)"
        htmlFor="notes"
        error={fieldErrors.notes}
        className="mt-4"
      >
        {(control) => (
          <Textarea
            {...control}
            name="notes"
            defaultValue={delivery?.notes ?? ""}
            maxLength={500}
            disabled={pending}
            placeholder="Instruções de entrega, restrições de horário etc."
          />
        )}
      </FieldShell>

      {/* Wide modal, so the footer follows the company form's rule: buttons
      to the right at their natural width. Full-width buttons belong to the
      narrow dialogs. */}
      <div className="flex justify-end mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || cepLoading || (isEditing && !isDirty)}
        >
          <span>{isEditing ? "Salvar Entrega" : "Criar Entrega"}</span>
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

const DeliveryFormDialog = ({
  businessId,
  isOpen,
  onClose,
  delivery = null,
}: DeliveryFormDialogProps): JSX.Element => {
  const defaultState: DeliveryFormState = {};
  const isEditing = delivery != null;

  const [state, dispatch] = useFormState<DeliveryFormState, FormData>(
    isEditing ? handleUpdateDelivery : handleCreateDelivery,
    defaultState,
  );

  const { formRef } = useDeliveryForm({ state, onClose });

  const [items, setItems] = useState<ItemRow[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const [shipperId, setShipperId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    // Controlled fields do not take defaultValue, so they are seeded here.
    setItems([]);
    setScheduledDate(delivery?.scheduled_date?.slice(0, 10) ?? "");

    setShipperId(delivery?.shipper?.id ?? "");
  }, [isOpen, delivery]);

  const submitDeliveryForm = (deliveryFormData: FormData) => {
    deliveryFormData.append("businessId", businessId);

    if (isEditing) {
      deliveryFormData.append("deliveryId", delivery.id);

      // Items are frozen on edit, so the block below never runs for them.
      return dispatch(deliveryFormData);
    }

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

    if (filledItems.length > 0) {
      deliveryFormData.append("items", JSON.stringify(filledItems));
    }

    return dispatch(deliveryFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Entrega" : "Criar Nova Entrega"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? "Corrija destinatário, endereço e observações. Os itens da carga e os dados da NF-e permanecem como a nota declarou."
              : "Entrada manual. Informe o destinatário e o endereço; a chave da NF-e é opcional, mas evita duplicidade quando o XML for importado."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={submitDeliveryForm}>
          <DeliveryFormDialogSubmit
            state={state}
            isOpen={isOpen}
            items={items}
            setItems={setItems}
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
