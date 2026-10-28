"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import FormInput from "@/components/shared/custom/form-input";
import { SelectServiceOrderPartStep } from "@/app/(protected)/_components/shared/steps/select-service-order-part-step";
import type {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import { handleCreateServiceOrderPart } from "@/actions/service-order-part/create-service-order-part";
import { handleUpdateServiceOrderPart } from "@/actions/service-order-part/update-service-order-part";

import { appendDataToForm } from "@/lib/append-data-form";
import { guardFormAction } from "@/lib/action-result";
import { createUpdateServiceOrderPartSchema } from "@/schemas/create-update-service-order-part-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
  type LiveValidation,
} from "@/components/shared/live-validation";
import {
  formatCurrencyToNumber,
  formatServiceOrderDisplay,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { refreshMaintenanceData } from "../../lib/refresh";
import {
  lineTotals,
  numberOf,
  type OrderPartRow,
} from "../lib/order-part-rules";

interface LineErrors {
  unit_price?: string[];
  quantity?: string[];
  discount_percentage?: string[];
  partId?: string[];
  serviceOrderId?: string[];
}

interface LineActionState {
  createServiceOrderPartError?: LineErrors & {
    createServiceOrderPartErrorMessage?: string;
  };
  updateServiceOrderPartError?: LineErrors & {
    updateServiceOrderPartErrorMessage?: string;
  };
  successMessage?: string;
  /** Parts now over the order's typed total (FLEET-SO-2): a warning. */
  warningMessage?: string;
}

interface OrderPartFormDialogProps {
  businessId: string;
  /** Present: editing this line (its order is fixed); absent: a new line. */
  line?: OrderPartRow;
  isOpen: boolean;
  onClose: () => void;
}

const discountText = (value: number | string | null | undefined) => {
  const numeric = numberOf(value);

  return numeric > 0 ? numeric.toFixed(1).replace(".", ",") : "";
};

const LineFields = ({
  live,
  values,
  setValues,
  isEditing,
  isDirty,
  onBack,
}: {
  live: LiveValidation;
  values: { unit_price: string; quantity: string; discount_percentage: string };
  setValues: (
    update: Partial<{
      unit_price: string;
      quantity: string;
      discount_percentage: string;
    }>,
  ) => void;
  isEditing: boolean;
  isDirty: boolean;
  onBack: () => void;
}): JSX.Element => {
  const { pending } = useFormStatus();

  const { net } = lineTotals({
    unit_price: formatCurrencyToNumber(values.unit_price),
    quantity: Number(values.quantity) || 0,
    discount_percentage: values.discount_percentage,
  });

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          label="Preço unitário *"
          htmlfor="unit_price"
          name="unit_price"
          type="text"
          value={values.unit_price}
          onChange={(event) =>
            setValues({
              unit_price: event.target.value.replace(/[^\d,.]/g, ""),
            })
          }
          onBlur={() =>
            setValues({
              unit_price:
                !values.unit_price ||
                values.unit_price === "," ||
                values.unit_price === "."
                  ? ""
                  : formatToBrazilianCurrency(
                      formatCurrencyToNumber(values.unit_price),
                    ),
            })
          }
          errorName={live.errorOf("unit_price")}
          placeholder="R$ 0,00"
          disabled={pending}
          required
        />

        <FormInput
          label="Quantidade *"
          htmlfor="quantity"
          name="quantity"
          type="text"
          inputMode="numeric"
          value={values.quantity}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, "");

            setValues({
              quantity: digits
                ? String(Math.min(9999, Math.max(1, parseInt(digits, 10))))
                : "",
            });
          }}
          errorName={live.errorOf("quantity")}
          placeholder="Ex.: 1"
          disabled={pending}
          required
        />

        <FormInput
          label="Desconto (%) (opcional)"
          htmlfor="discount_percentage"
          name="discount_percentage"
          type="text"
          inputMode="decimal"
          value={values.discount_percentage}
          onChange={(event) => {
            const cleaned = event.target.value
              .replace(".", ",")
              .replace(/[^\d,]/g, "");
            const numeric = Number(cleaned.replace(",", "."));

            if (!cleaned || (Number.isFinite(numeric) && numeric <= 100)) {
              setValues({ discount_percentage: cleaned });
            }
          }}
          onBlur={() =>
            setValues({
              discount_percentage: discountText(values.discount_percentage),
            })
          }
          errorName={live.errorOf("discount_percentage")}
          placeholder="Ex.: 5,0"
          disabled={pending}
        />

        <div className="flex items-end">
          <p className="text-sm text-muted-foreground">
            Total do lançamento:{" "}
            <strong>{formatToBrazilianCurrency(net)}</strong>
          </p>
        </div>
      </div>

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
        <Button
          type="submit"
          disabled={pending || !canSubmitForm({ isEdit: isEditing, isDirty })}
        >
          <span>{isEditing ? "Salvar Alterações" : "Lançar Peça"}</span>
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </>
  );
};

/**
 * A part line of a service order: pick the order and the part, then price,
 * quantity and discount. One dialog for /admin and /dashboard, create and
 * edit (decision 8.7). Editing keeps the line in its order — the old step let
 * another order be picked, which the API then answered "not found". After
 * the save, the parts are checked against the order's typed total and the
 * warning shown (FLEET-SO-2).
 */
const OrderPartFormDialog = ({
  businessId,
  line,
  isOpen,
  onClose,
}: OrderPartFormDialogProps): JSX.Element => {
  const isEditing = Boolean(line);

  const [rawState, dispatch] = useFormState<LineActionState, FormData>(
    guardFormAction(
      isEditing ? handleUpdateServiceOrderPart : handleCreateServiceOrderPart,
    ),
    {},
  );

  const bag =
    rawState.createServiceOrderPartError ??
    rawState.updateServiceOrderPartError;
  const errorMessage =
    rawState.createServiceOrderPartError?.createServiceOrderPartErrorMessage ??
    rawState.updateServiceOrderPartError?.updateServiceOrderPartErrorMessage;

  const [step, setStep] = useState<"select" | "fields">("select");

  const [order, setOrder] = useState<CommandServiceOrderInputValue>({
    serviceOrderId: line?.serviceOrderId ?? "",
    searchServiceOrderInputValue: line
      ? formatServiceOrderDisplay(line.serviceOrder)
      : "",
  });

  const [part, setPart] = useState<CommandPartInputValue>({
    partId: line?.partId ?? "",
    searchPartInputValue: line?.part.description ?? "",
  });

  const [values, setAllValues] = useState({
    unit_price: line ? formatToBrazilianCurrency(line.unit_price) : "",
    quantity: line ? String(line.quantity) : "",
    discount_percentage: discountText(line?.discount_percentage),
  });

  const setValues = (update: Partial<typeof values>) =>
    setAllValues((current) => ({ ...current, ...update }));

  const isDirty =
    part.partId !== (line?.partId ?? "") ||
    formatCurrencyToNumber(values.unit_price) !== numberOf(line?.unit_price) ||
    Number(values.quantity) !== (line?.quantity ?? 0) ||
    numberOf(values.discount_percentage) !==
      numberOf(line?.discount_percentage);

  // Live validation of the line (decision 16.700), with the action's schema.
  const live = useLiveValidation({
    schema: createUpdateServiceOrderPartSchema,
    values: { ...values, partId: part.partId },
    fields: ["unit_price", "quantity", "discount_percentage"],
    serverErrors: bag,
  });

  const answered = useRef<LineActionState | null>(null);

  useEffect(() => {
    if (answered.current === rawState) return;
    answered.current = rawState;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (rawState.successMessage) {
      toast.success(rawState.successMessage);

      if (rawState.warningMessage)
        toast.warning(rawState.warningMessage, { duration: 10000 });

      onClose();

      refreshMaintenanceData(["service_order", "part"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState]);

  const submit = (formData: FormData) => {
    if (!live.isValid()) return;

    appendDataToForm(formData, {
      businessId,
      serviceOrderId: order.serviceOrderId,
      partId: part.partId,
      ...(line && { serviceOrderPartId: line.id }),
    });

    return dispatch(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "select"
              ? isEditing
                ? "Peça do Lançamento"
                : "Selecionar Ordem de Serviço e Peça"
              : isEditing
                ? "Editar Peça da Ordem de Serviço"
                : "Lançar Peça na Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? isEditing
                ? "A ordem de serviço do lançamento não muda; você pode trocar a peça."
                : "Selecione a ordem de serviço e a peça do catálogo."
              : "Informe preço, quantidade e desconto do lançamento."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <SelectServiceOrderPartStep
            businessId={businessId}
            commandServiceOrderInputValue={order}
            commandPartInputValue={part}
            handleUpdateSearchServiceOrderInputValue={(value) => {
              // The line's order is fixed when editing.
              if (isEditing) return;

              setOrder((current) =>
                value.serviceOrderId &&
                value.serviceOrderId === current.serviceOrderId
                  ? { serviceOrderId: "", searchServiceOrderInputValue: "" }
                  : value,
              );
            }}
            handleUpdateSearchPartInputValue={(value) => {
              setPart((current) =>
                value.partId && value.partId === current.partId
                  ? { partId: "", searchPartInputValue: "" }
                  : value,
              );
            }}
            onContinue={() => setStep("fields")}
            errorPartId={bag?.partId}
            errorServiceOrderId={bag?.serviceOrderId}
          />
        ) : (
          <form ref={live.ref} action={submit} noValidate>
            <LineFields
              live={live}
              values={values}
              setValues={setValues}
              isEditing={isEditing}
              isDirty={isDirty}
              onBack={() => setStep("select")}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { OrderPartFormDialog };
