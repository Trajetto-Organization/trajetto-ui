"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { handleUpdateServiceOrder } from "@/actions/service-order/update-service-order";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";
import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-supplier-step";

import { appendDataToForm } from "@/lib/append-data-form";
import { guardFormAction } from "@/lib/action-result";

import { refreshMaintenanceData } from "../lib/refresh";
import type { FleetScope } from "../lib/service-order-rules";
import type { ServiceOrderRow } from "../server-table";
import { normalizeServiceOrderState, type RawActionState } from "../form/types";
import {
  stepCopy,
  useOrderSteps,
  type OrderPicks,
} from "../form/use-order-steps";

import { orderDaysToSend } from "./dirty";
import { UpdateServiceOrderFormSubmit } from "./submit";

interface UpdateServiceOrderDialogProps {
  scope: FleetScope;
  serviceOrder: ServiceOrderRow;
  isOpen: boolean;
  onClose: () => void;
}

function picksOf(order: ServiceOrderRow): OrderPicks {
  return {
    branch: {
      branchId: order.branchId,
      searchBranchInputValue: order.branch?.corporate_reason ?? "",
    },
    vehicle: {
      vehicleId: order.vehicleId,
      searchVehicleInputValue: order.vehicle?.description ?? "",
      vehicleLicensePlate: order.vehicle?.license_plate ?? "",
    },
    supplier: {
      supplierId: order.supplierId ?? "",
      searchSupplierInputValue: order.supplier?.name ?? "",
    },
    user: {
      userId: order.responsibleUserId,
      searchUserInputValue: order.responsibleUser?.name ?? "",
      responsibleUserEmail: order.responsibleUser?.email ?? "",
    },
  };
}

/**
 * "Editar Ordem de Serviço" for /admin and /dashboard (decision 8.7). The
 * company is the order's own — the admin copy used the session's, which a
 * master does not have. Save stays disabled until something changed.
 */
const UpdateServiceOrderDialog = ({
  scope,
  serviceOrder,
  isOpen,
  onClose,
}: UpdateServiceOrderDialogProps): JSX.Element => {
  const [rawState, dispatch] = useFormState<RawActionState, FormData>(
    guardFormAction(handleUpdateServiceOrder),
    {},
  );
  const state = normalizeServiceOrderState(rawState);

  const initialPicks = useMemo(() => picksOf(serviceOrder), [serviceOrder]);
  const steps = useOrderSteps(initialPicks);

  const [latitude, setLatitude] = useState<number | null>(
    serviceOrder.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    serviceOrder.longitude ?? null,
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const answered = useRef<RawActionState | null>(null);

  useEffect(() => {
    if (!rawState || answered.current === rawState) return;
    answered.current = rawState;

    if (state.errorMessage) {
      toast.error(state.errorMessage);
      return;
    }

    if (state.successMessage) {
      toast.success(state.successMessage);
      onClose();

      refreshMaintenanceData(["service_order", "vehicleData"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState]);

  const { branch, vehicle, supplier, user } = steps.picks;

  const isEntityDirty =
    branch.branchId !== serviceOrder.branchId ||
    vehicle.vehicleId !== serviceOrder.vehicleId ||
    supplier.supplierId !== (serviceOrder.supplierId ?? "") ||
    user.userId !== serviceOrder.responsibleUserId;

  const submit = (formData: FormData) => {
    // An unchanged day goes out exactly as stored (orderDaysToSend, tested):
    // the picker hands back local midnight for the same day picked again.
    const days = orderDaysToSend(serviceOrder, {
      date: String(formData.get("date") ?? ""),
      completion_date: String(formData.get("completion_date") ?? ""),
    });
    formData.set("date", days.date);
    formData.set("completion_date", days.completion_date);

    // An empty coordinate clears the location (the API reads "" as null).
    formData.append("latitude", latitude === null ? "" : String(latitude));
    formData.append("longitude", longitude === null ? "" : String(longitude));

    appendDataToForm(formData, {
      serviceOrderId: serviceOrder.id,
      businessId: serviceOrder.businessId,
      branchId: branch.branchId,
      vehicleId: vehicle.vehicleId,
      supplierId: supplier.supplierId,
      responsibleUserId: user.userId,
    });

    return dispatch(formData);
  };

  const copy = stepCopy(steps.step, "update");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {steps.step === "select-branch" ? (
          <SelectBranchStep
            businessId={serviceOrder.businessId}
            commandBranchInputValue={branch}
            handleUpdateSearchBranchInputValue={steps.pickBranch}
            onContinue={() => steps.goTo("select-vehicle-supplier")}
            errorBranchId={state.serviceOrderError?.branchId}
          />
        ) : steps.step === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            businessId={serviceOrder.businessId}
            commandVehicleInputValue={vehicle}
            commandSupplierInputValue={supplier}
            handleUpdateSearchVehicleInputValue={steps.pickVehicle}
            handleUpdateSearchSupplierInputValue={steps.pickSupplier}
            onContinue={() => steps.goTo("select-user")}
            onBack={() => steps.goTo("select-branch")}
            errorVehicleId={state.serviceOrderError?.vehicleId}
            errorSupplierId={state.serviceOrderError?.supplierId}
            searchSupplierIsOptional
          />
        ) : steps.step === "select-user" ? (
          <SelectUserStep
            businessId={serviceOrder.businessId}
            commandUserInputValue={user}
            handleUpdateSearchUserInputValue={steps.pickUser}
            onContinue={() => steps.goTo("form")}
            onBack={() => steps.goTo("select-vehicle-supplier")}
            errorUserId={state.serviceOrderError?.responsibleUserId}
          />
        ) : (
          <form action={submit} noValidate>
            <UpdateServiceOrderFormSubmit
              state={state}
              serviceOrder={serviceOrder}
              businessId={serviceOrder.businessId}
              vehicleId={vehicle.vehicleId}
              canEditSnapshot={scope === "admin"}
              isEntityDirty={isEntityDirty}
              onBack={() => steps.goTo("select-user")}
              latitude={latitude}
              longitude={longitude}
              isLoadingLocation={isLoadingLocation}
              handleLocationChange={(lat, lon) => {
                setLatitude(lat);
                setLongitude(lon);
              }}
              handleLocationLoadingChange={setIsLoadingLocation}
              initialFormValues={steps.formValues}
              onFormValuesChange={steps.setFormValues}
            />
          </form>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateServiceOrderDialog };
