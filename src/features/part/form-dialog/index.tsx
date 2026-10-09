"use client";

import { useEffect, useRef, useState } from "react";
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
import { SearchSupplier } from "@/app/(protected)/_components/shared/searches/search-supplier";
import type { CommandSupplierInputValue } from "@/app/(protected)/_components/shared/common.types";

import { handleCreatePart } from "@/actions/part/create-part";
import { handleUpdatePart } from "@/actions/part/update-part";

import { appendDataToForm } from "@/lib/append-data-form";
import { guardFormAction } from "@/lib/action-result";
import { createUpdatePartSchema } from "@/schemas/create-update-part-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
  type LiveValidation,
} from "@/components/shared/live-validation";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { cn } from "@/lib/utils";

import { refreshMaintenanceData } from "@/features/service-order/lib/refresh";

import type { PartRow } from "../lib/part-rules";

interface PartFieldErrors {
  description?: string[];
  unit_price?: string[];
  supplierId?: string[];
}

interface PartActionState {
  createPartError?: PartFieldErrors & { createPartErrorMessage?: string };
  updatePartError?: PartFieldErrors & { updatePartErrorMessage?: string };
  successMessage?: string;
}

interface PartFormDialogProps {
  businessId: string;
  /** Present: editing this part; absent: creating one. */
  part?: PartRow;
  isOpen: boolean;
  onClose: () => void;
}

const priceText = (value: number | string | undefined) =>
  value === undefined || value === "" ? "" : formatToBrazilianCurrency(value);

const Fields = ({
  businessId,
  live,
  description,
  setDescription,
  price,
  setPrice,
  supplier,
  pickSupplier,
  isDirty,
  isEditing,
  onCancel,
}: {
  businessId: string;
  live: LiveValidation;
  description: string;
  setDescription: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  supplier: CommandSupplierInputValue;
  pickSupplier: (value: CommandSupplierInputValue) => void;
  isDirty: boolean;
  isEditing: boolean;
  onCancel: () => void;
}): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="mt-2 space-y-5">
      <FormInput
        label="Descrição da peça *"
        htmlfor="description"
        name="description"
        type="text"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        errorName={live.errorOf("description")}
        placeholder="Ex.: Filtro de óleo"
        hint="Única na empresa, sem diferenciar maiúsculas."
        disabled={pending}
        required
      />

      <FormInput
        label="Preço unitário *"
        htmlfor="unit_price"
        name="unit_price"
        type="text"
        value={price}
        onChange={(event) =>
          setPrice(event.target.value.replace(/[^\d,.]/g, ""))
        }
        onBlur={() =>
          setPrice(
            !price || price === "," || price === "."
              ? ""
              : formatToBrazilianCurrency(formatCurrencyToNumber(price)),
          )
        }
        errorName={live.errorOf("unit_price")}
        placeholder="0,00"
        hint={
          isEditing
            ? "O preço já lançado nas ordens de serviço não muda."
            : undefined
        }
        disabled={pending}
        required
      />

      {supplier.searchSupplierInputValue && (
        <div className="flex w-full items-center gap-2">
          <div
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 min-w-0 flex-1 truncate border-dashed text-left",
            )}
          >
            <span>Fornecedor:</span>
            <span className="w-full truncate">
              {supplier.searchSupplierInputValue}
            </span>
          </div>

          <Button
            type="button"
            className="h-8 w-8"
            variant="ghost"
            aria-label="Remover fornecedor"
            onClick={() =>
              pickSupplier({ supplierId: "", searchSupplierInputValue: "" })
            }
          >
            <X />
          </Button>
        </div>
      )}

      <SearchSupplier
        errorSupplierId={live.errorOf("supplierId")}
        searchSupplierInputValue={supplier.searchSupplierInputValue}
        businessId={businessId}
        handleUpdateSearchSupplierInputValue={pickSupplier}
        isOptional
      />

      <DialogFormFooter className="mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={pending}
          {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || !canSubmitForm({ isEdit: isEditing, isDirty })}
        >
          {isEditing ? "Salvar Alterações" : "Criar Peça"}
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </DialogFormFooter>
    </div>
  );
};

/**
 * Create and edit a part, one dialog for /admin and /dashboard (decision
 * 8.7). The admin copy asked for the company inside the form although the
 * page already had one picked; the company now comes from the page (or, when
 * editing, from the part). Save stays disabled until something changed
 * (decision 2.5); Criar is always enabled and the action's schema checks
 * each field live (decisions 16.700, 16.701).
 */
const PartFormDialog = ({
  businessId,
  part,
  isOpen,
  onClose,
}: PartFormDialogProps): JSX.Element => {
  const isEditing = Boolean(part);

  const [rawState, dispatch] = useFormState<PartActionState, FormData>(
    guardFormAction(isEditing ? handleUpdatePart : handleCreatePart),
    {},
  );

  const bag = rawState.createPartError ?? rawState.updatePartError;
  const errorMessage =
    rawState.createPartError?.createPartErrorMessage ??
    rawState.updatePartError?.updatePartErrorMessage;

  const originalSupplier: CommandSupplierInputValue = {
    supplierId: part?.supplierId ?? "",
    searchSupplierInputValue: part?.supplier?.name ?? "",
  };

  const [description, setDescription] = useState<string>(
    part?.description ?? "",
  );
  const [price, setPrice] = useState<string>(priceText(part?.unit_price));
  const [supplier, setSupplier] =
    useState<CommandSupplierInputValue>(originalSupplier);

  const pickSupplier = (value: CommandSupplierInputValue) =>
    setSupplier((current) =>
      value.supplierId && value.supplierId === current.supplierId
        ? { supplierId: "", searchSupplierInputValue: "" }
        : value,
    );

  const isDirty =
    description.trim() !== (part?.description ?? "").trim() ||
    formatCurrencyToNumber(price) !==
      formatCurrencyToNumber(part?.unit_price) ||
    supplier.supplierId !== (part?.supplierId ?? "");

  const live = useLiveValidation({
    schema: createUpdatePartSchema,
    values: { description, unit_price: price, supplierId: supplier.supplierId },
    // The company is the page's, never a field.
    fields: ["description", "unit_price", "supplierId"],
    serverErrors: bag,
  });

  const answered = useRef<PartActionState | null>(null);

  useEffect(() => {
    if (answered.current === rawState) return;
    answered.current = rawState;

    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (rawState.successMessage) {
      toast.success(rawState.successMessage);
      onClose();

      refreshMaintenanceData("update-part", ["part"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState]);

  const submit = (formData: FormData) => {
    if (!live.isValid()) return;

    appendDataToForm(formData, {
      businessId,
      supplierId: supplier.supplierId,
      ...(part && { partId: part.id }),
    });

    return dispatch(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Peça" : "Criar Peça"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere a descrição, o preço ou o fornecedor da peça."
              : "Cadastre a peça no catálogo da empresa para lançá-la nas ordens de serviço."}
          </DialogDescription>
        </DialogHeader>

        <form ref={live.ref} action={submit} noValidate>
          <Fields
            businessId={businessId}
            live={live}
            description={description}
            setDescription={setDescription}
            price={price}
            setPrice={setPrice}
            supplier={supplier}
            pickSupplier={pickSupplier}
            isDirty={isDirty}
            isEditing={isEditing}
            onCancel={onClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { PartFormDialog };
