"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, Truck } from "lucide-react";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateVehicleLimit } from "@/actions/business/update-vehicle-limit";
import {
  getBusinessEntitlements,
  type BusinessEntitlementsData,
} from "@/actions/business/entitlements";
import { guardFormAction, isStaleActionResult } from "@/lib/action-result";
import { updateVehicleLimitSchema } from "@/schemas/update-vehicle-limit-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import {
  useUpdateVehicleLimitForm,
  type UpdateVehicleLimitFormState,
} from "./hooks";

interface UpdateVehicleLimitFormProps {
  businessId: string;
  businessName: string;
  isOpen: boolean;
  handleClose: () => void;
}

const UpdateVehicleLimitFormSubmit = ({
  state,
  entitlements,
  isLoadingUsage,
  handleClose,
}: {
  state: UpdateVehicleLimitFormState;
  entitlements: BusinessEntitlementsData | null;
  isLoadingUsage: boolean;
  handleClose: () => void;
}) => {
  const { pending } = useFormStatus();

  const initialValue = String(entitlements?.vehicle_limit ?? 0);
  // Controlled, as live validation reads it: the text typed, not a number.
  const [limit, setLimit] = useState<string>(initialValue);

  const isDirty = limit !== initialValue;

  // Keyed on the stored limit, not the response object: a repeated fetch
  // with the same answer must not wipe what is being typed.
  const storedLimit = entitlements?.vehicle_limit ?? 0;
  useEffect(() => {
    setLimit(String(storedLimit));
  }, [storedLimit]);

  // Live validation (decision 16.700) with the action's schema. An empty
  // field would be coerced to 0 ("não configurado") and silently lift the
  // company's cap, so it is asked for instead (same as the AI limit, 16.737).
  const live = useLiveValidation({
    schema: updateVehicleLimitSchema,
    values: { vehicle_limit: limit },
    rules: (values) => ({
      vehicle_limit:
        values.vehicle_limit.trim() === ""
          ? "Informe o limite de veículos (0 = sem limite)."
          : null,
    }),
    serverErrors: state.updateVehicleLimitError,
  });

  const currentValue = limit.trim() === "" ? -1 : Number(limit);

  const vehicleCount = entitlements?.vehicle_count ?? 0;
  const inactiveCount = entitlements?.vehicle_inactive_count ?? 0;

  const vehicleLimit = entitlements?.vehicle_limit ?? 0;
  const hasLimit = vehicleLimit > 0;

  const usagePercentage = hasLimit
    ? Math.min((vehicleCount / vehicleLimit) * 100, 100)
    : 0;

  // Typing a limit below the active fleet is allowed (the contract is the
  // source of truth) but deserves a live heads-up about what it implies.
  const isBelowActiveFleet = currentValue > 0 && currentValue < vehicleCount;

  if (isLoadingUsage) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entitlements && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Frota ativa</span>
            <span className="font-medium">
              {vehicleCount} {hasLimit ? `/ ${vehicleLimit}` : "veículo(s)"}
              {inactiveCount > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  +{inactiveCount} inativo(s)
                </span>
              )}
            </span>
          </div>

          <Progress
            value={usagePercentage}
            className="h-2"
            indicatorClassName="bg-emerald-600"
          />

          <div className="flex items-center justify-between">
            {hasLimit ? (
              <Badge
                variant="outline"
                className={
                  usagePercentage >= 100
                    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                    : usagePercentage >= 80
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900"
                      : "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
                }
              >
                {usagePercentage >= 100
                  ? "Limite atingido"
                  : `${Math.round(usagePercentage)}% utilizado`}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-800 border-slate-200
                dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700"
              >
                Sem limite configurado
              </Badge>
            )}

            {hasLimit && vehicleCount < vehicleLimit && (
              <span className="text-xs text-muted-foreground">
                {vehicleLimit - vehicleCount} vaga(s) restante(s)
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={live.ref} className="space-y-4">
        <FormInput
          label="Veículos contratados *"
          htmlfor="vehicle_limit"
          name="vehicle_limit"
          type="number"
          min={0}
          max={100000}
          value={limit}
          placeholder="Ex: 45"
          errorName={live.errorOf("vehicle_limit")}
          disabled={pending}
          onChange={(e) => setLimit(e.target.value)}
          onKeyDown={(e) => {
            if (["+", "-", "e", "E", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <p className="text-xs text-muted-foreground -mt-2">
          0 = não configurado (cadastro de veículos livre). Veículos inativos
          não ocupam vaga do plano.
        </p>

        {isBelowActiveFleet && (
          <div
            className="rounded-md border border-yellow-200 bg-yellow-50
            p-3 text-xs text-yellow-800 dark:border-yellow-900
            dark:bg-yellow-950/30 dark:text-yellow-200"
          >
            A frota ativa ({vehicleCount}) ficará acima do novo limite (
            {currentValue}). Nenhum veículo será excluído ou bloqueado — mas
            novos cadastros e reativações ficarão impedidos até a empresa
            inativar veículos e a frota ativa caber no plano.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={pending || !canSubmitForm({ isEdit: true, isDirty })}
          >
            <span>Salvar Limite</span>
            {pending && (
              <div className="ml-2 animate-spin">
                <Loader className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const UpdateVehicleLimitForm = ({
  businessId,
  businessName,
  isOpen,
  handleClose,
}: UpdateVehicleLimitFormProps) => {
  const defaultState: UpdateVehicleLimitFormState = {};
  const [state, dispatch] = useFormState<UpdateVehicleLimitFormState, FormData>(
    guardFormAction(handleUpdateVehicleLimit),
    defaultState,
  );

  const { formRef } = useUpdateVehicleLimitForm({
    state,
    handleClose,
  });

  const [entitlements, setEntitlements] =
    useState<BusinessEntitlementsData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsage(true);
      getBusinessEntitlements(businessId)
        .then((response) => {
          if (isStaleActionResult(response, { background: true })) return;

          setEntitlements(response.success ? (response.data ?? null) : null);
        })
        .finally(() => setIsLoadingUsage(false));
    }
  }, [isOpen, businessId]);

  const handleSubmitVehicleLimit = (formData: FormData) => {
    formData.append("businessId", businessId);
    return dispatch(formData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isOpen) {
          formRef.current?.reset();
        }

        handleClose();
      }}
      open={isOpen}
    >
      <DialogScrollContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Configurar Limite de Veículos
          </DialogTitle>
          <DialogDescription className="break-words">
            Defina os veículos contratados para{" "}
            <strong title={businessName}>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmitVehicleLimit} noValidate>
          <UpdateVehicleLimitFormSubmit
            state={state}
            entitlements={entitlements}
            isLoadingUsage={isLoadingUsage}
            handleClose={handleClose}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateVehicleLimitForm };
