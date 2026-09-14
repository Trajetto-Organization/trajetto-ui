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

  const initialValue = entitlements?.vehicle_limit ?? 0;
  const [currentValue, setCurrentValue] = useState<number>(initialValue);

  const isDirty = currentValue !== initialValue;

  useEffect(() => {
    setCurrentValue(entitlements?.vehicle_limit ?? 0);
  }, [entitlements]);

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
                    ? "bg-red-100 text-red-800 border-red-200"
                    : usagePercentage >= 80
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-green-100 text-green-800 border-green-200"
                }
              >
                {usagePercentage >= 100
                  ? "Limite atingido"
                  : `${Math.round(usagePercentage)}% utilizado`}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-800 border-slate-200"
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

      <div className="space-y-4">
        <FormInput
          label="Veículos contratados"
          htmlfor="vehicle_limit"
          name="vehicle_limit"
          type="number"
          min={0}
          max={100000}
          defaultValue={entitlements?.vehicle_limit || 0}
          placeholder="Ex: 45"
          errorName={state.updateVehicleLimitError?.vehicle_limit}
          disabled={pending}
          onChange={(e) => {
            const val = e.target.value;
            setCurrentValue(val === "" ? -1 : Number(val));
          }}
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
            p-3 text-xs text-yellow-800"
          >
            A frota ativa ({vehicleCount}) ficará acima do novo limite (
            {currentValue}). Nenhum veículo será excluído ou bloqueado — mas
            novos cadastros e reativações ficarão impedidos até a empresa
            inativar veículos e a frota ativa caber no plano.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !isDirty}>
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
    handleUpdateVehicleLimit,
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
          <DialogDescription className="truncate">
            Defina os veículos contratados para{" "}
            <strong title={businessName}>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmitVehicleLimit}>
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
