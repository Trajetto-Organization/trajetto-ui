"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader } from "lucide-react";
import { useFormDirty } from "@/hooks/use-form-dirty";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import FormInput from "@/components/shared/custom/form-input";

import { handleCreateShipper } from "@/actions/shipper/create-shipper";
import { handleUpdateShipper } from "@/actions/shipper/update-shipper";

import type { ShipperData } from "@/actions/shipper/list-shipper";
import { applyMask } from "@/lib/format-values";

import { useShipperForm, type ShipperFormState } from "./hooks";

/**
 * Defaults and the dirty comparison must speak the exact string the masked
 * input renders, so both go through applyMask with the input's own mask.
 * (formatTelephone prepends "+55 ", which the mask would re-parse as if 55
 * were the area code.)
 */
const CNPJ_MASK = "99.999.999/9999-99";
const TELEPHONE_MASK = "(99) 99999-9999";

interface ShipperFormDialogProps {
  businessId: string;
  /** When present the dialog edits; otherwise it creates. */
  shipper: ShipperData | null;
  isOpen: boolean;
  onClose: () => void;
}

const ShipperFormDialogSubmit = ({
  state,
  shipper,
  onClose,
  formRef,
  isOpen,
}: {
  state: ShipperFormState;
  shipper: ShipperData | null;
  onClose: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isOpen: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();
  const isEditing = shipper !== null;

  // react-input-mask only behaves predictably when controlled: left
  // uncontrolled, deleting through the mask's literals resurrects digits.
  // Every other masked field in the app is controlled (the address forms
  // get it from useCepValidation), so these follow the same rule.
  const [cnpj, setCnpj] = useState<string>(() =>
    applyMask(shipper?.cnpj ?? "", CNPJ_MASK),
  );
  const [telephone, setTelephone] = useState<string>(() =>
    applyMask(shipper?.telephone ?? "", TELEPHONE_MASK),
  );

  // What the record looked like when the dialog opened, in the same shape the
  // inputs report it — masked, and the switch as the string it submits.
  const initialValues = useMemo(
    () => ({
      name: shipper?.name ?? "",
      cnpj: applyMask(shipper?.cnpj ?? "", CNPJ_MASK),
      email: shipper?.email ?? "",
      telephone: applyMask(shipper?.telephone ?? "", TELEPHONE_MASK),
      is_active: shipper?.is_active ? "true" : "",
    }),
    [shipper],
  );

  const isDirty = useFormDirty({ formRef, initialValues, isOpen });

  const fieldErrors = (isEditing
    ? (state.updateShipperError ?? {})
    : (state.createShipperError ?? {})) as Record<string, string[]>;

  return (
    <>
      {/* One field per line, like the occurrence type form: the modal is
      narrow and a two-column grid squeezed the masked fields. */}
      <div className="grid grid-cols-1 gap-4 mt-5">
        <FormInput
          label="Nome do embarcador *"
          htmlfor="name"
          name="name"
          type="text"
          defaultValue={shipper?.name ?? ""}
          placeholder="Razão social ou nome do embarcador"
          errorName={fieldErrors.name}
          disabled={pending}
        />

        <FormInput
          label="CNPJ (opcional)"
          htmlfor="cnpj"
          name="cnpj"
          type="text"
          mask={CNPJ_MASK}
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00"
          errorName={fieldErrors.cnpj}
          disabled={pending}
        />

        <FormInput
          label="E-mail (opcional)"
          htmlfor="email"
          name="email"
          type="text"
          autoComplete="email"
          defaultValue={shipper?.email ?? ""}
          placeholder="contato@embarcador.com.br"
          errorName={fieldErrors.email}
          disabled={pending}
        />

        <FormInput
          label="Telefone (opcional)"
          htmlfor="telephone"
          name="telephone"
          type="text"
          mask={TELEPHONE_MASK}
          autoComplete="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="(00) 00000-0000"
          errorName={fieldErrors.telephone}
          disabled={pending}
        />
      </div>

      {isEditing && (
        <div
          className="flex items-center justify-between
          rounded-lg border p-4 mt-4"
        >
          <div className="space-y-0.5">
            <Label htmlFor="is_active">Embarcador ativo</Label>
            <p className="text-xs text-muted-foreground">
              Inativo sai das novas entregas; o histórico permanece intacto.
            </p>
          </div>
          <Switch
            id="is_active"
            name="is_active"
            value="true"
            defaultChecked={shipper.is_active}
            disabled={pending}
            aria-label="Alternar embarcador ativo"
          />
        </div>
      )}

      <div className="flex gap-2 mt-6 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancelar
        </Button>
        {/* Same rule as every other update dialog: saving is only offered
        once something actually changed. */}
        <Button
          type="submit"
          disabled={pending || (isEditing && !isDirty)}
          className="flex-1"
        >
          <span>{isEditing ? "Salvar Embarcador" : "Criar Embarcador"}</span>
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

const ShipperFormDialog = ({
  businessId,
  shipper,
  isOpen,
  onClose,
}: ShipperFormDialogProps): JSX.Element => {
  const isEditing = shipper !== null;
  const defaultState: ShipperFormState = {};

  const [state, dispatch] = useFormState<ShipperFormState, FormData>(
    isEditing ? handleUpdateShipper : handleCreateShipper,
    defaultState,
  );

  const { formRef } = useShipperForm({ state, onClose });

  const submitShipperForm = (shipperFormData: FormData) => {
    shipperFormData.append("businessId", businessId);

    if (isEditing) {
      shipperFormData.append("shipperId", shipper.id);

      // An unchecked Switch sends nothing, so the "off" state has to be
      // spelled out or the API would read it as "field not sent".
      if (!shipperFormData.has("is_active")) {
        shipperFormData.append("is_active", "false");
      }
    }

    return dispatch(shipperFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogScrollContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Embarcador" : "Criar Novo Embarcador"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            O embarcador é a empresa dona da carga. Toda entrega pertence a um
            embarcador, e o emitente da NF-e é casado com ele na importação.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={submitShipperForm}>
          <ShipperFormDialogSubmit
            state={state}
            shipper={shipper}
            onClose={onClose}
            formRef={formRef}
            isOpen={isOpen}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ShipperFormDialog };
