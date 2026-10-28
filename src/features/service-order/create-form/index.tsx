"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { handleCreateServiceOrder } from "@/actions/service-order/create-service-order";

import { SelectBranchStep } from "@/app/(protected)/_components/shared/steps/select-branch-step";
import { SelectUserStep } from "@/app/(protected)/_components/shared/steps/select-user-step";
import { SelectVehicleSupplierStep } from "@/app/(protected)/_components/shared/steps/select-vehicle-supplier-step";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";

import { appendDataToForm } from "@/lib/append-data-form";
import { guardFormAction } from "@/lib/action-result";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";

import { refreshMaintenanceData } from "../lib/refresh";
import type { FleetScope } from "../lib/service-order-rules";
import { normalizeServiceOrderState, type RawActionState } from "../form/types";
import { stepCopy, useOrderSteps } from "../form/use-order-steps";

import { CreateServiceOrderFormSubmit } from "./submit";
import { CreateButtonLabel } from "@/app/(protected)/_components/shared/create-button-label";

interface CreateServiceOrderDialogProps {
  scope: FleetScope;
  /** The company the order is for: the selector's on /admin, the session's elsewhere. */
  businessId: string;
}

/**
 * "Criar Ordem de Serviço", the same dialog on /admin and /dashboard
 * (decision 8.7). The admin copy asked for the company again in a first step
 * although the page already had one picked; the dashboard copy checked the
 * permissions the admin copy did not. Both behaviours kept where right: the
 * company comes from the page, the permissions are checked (a MASTER holds
 * them all), and only the master edits the vehicle snapshot, as the API
 * allows.
 */
const CreateServiceOrderDialog = ({
  scope,
  businessId,
}: CreateServiceOrderDialogProps): JSX.Element => {
  const [rawState, dispatch] = useFormState<RawActionState, FormData>(
    guardFormAction(handleCreateServiceOrder),
    {},
  );
  const state = normalizeServiceOrderState(rawState);

  // Saving the same form again is the same order (IDEMP-14).
  const idempotencyKeyFor = useIdempotencyKey(rawState);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const steps = useOrderSteps();
  const actionClassName = usePageActionClassName();

  const required = useCheckMultiplePermissions([
    {
      key: permissions.SERVICE_ORDER_MANAGE,
      action: "write",
      label: getPermissionName(permissions.SERVICE_ORDER_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.USER_REGISTRATION_MANAGE,
      action: "read",
      label: getPermissionName(permissions.USER_REGISTRATION_MANAGE),
    },
  ]);

  const close = () => {
    setIsOpen(false);
    steps.reset();
    setLatitude(null);
    setLongitude(null);
    setIsLoadingLocation(false);
  };

  // One toast per answer, however many renders it survives.
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
      close();

      refreshMaintenanceData(["service_order", "vehicleData"]).catch(() =>
        toast.error("Erro ao atualizar dados. Recarregue a página."),
      );
    }
    // `close` is recreated each render; the answer is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState]);

  const submit = (formData: FormData) => {
    const { branch, vehicle, supplier, user } = steps.picks;

    if (supplier.supplierId) formData.append("supplierId", supplier.supplierId);

    appendDataToForm(formData, {
      businessId,
      branchId: branch.branchId,
      vehicleId: vehicle.vehicleId,
      responsibleUserId: user.userId,
      latitude: latitude?.toString() as string,
      longitude: longitude?.toString() as string,
    });

    formData.set("idempotency_key", idempotencyKeyFor(formData));

    return dispatch(formData);
  };

  const copy = stepCopy(steps.step, "create");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                size="sm"
                className={actionClassName}
                disabled={!required.hasAllPermissions}
                data-tutorial="create-button"
                onClick={() => setIsOpen(true)}
              >
                <CreateButtonLabel>Criar Ordem de Serviço</CreateButtonLabel>
              </Button>
            </div>
          </TooltipTrigger>
          {!required.hasAllPermissions && (
            <TooltipContent className="max-w-sm">
              <p>{required.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogScrollContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {steps.step === "select-branch" ? (
          <SelectBranchStep
            businessId={businessId}
            commandBranchInputValue={steps.picks.branch}
            handleUpdateSearchBranchInputValue={steps.pickBranch}
            onContinue={() => steps.goTo("select-vehicle-supplier")}
            errorBranchId={state.serviceOrderError?.branchId}
          />
        ) : steps.step === "select-vehicle-supplier" ? (
          <SelectVehicleSupplierStep
            businessId={businessId}
            commandVehicleInputValue={steps.picks.vehicle}
            commandSupplierInputValue={steps.picks.supplier}
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
            businessId={businessId}
            commandUserInputValue={steps.picks.user}
            handleUpdateSearchUserInputValue={steps.pickUser}
            onContinue={() => steps.goTo("form")}
            onBack={() => steps.goTo("select-vehicle-supplier")}
            errorUserId={state.serviceOrderError?.responsibleUserId}
          />
        ) : (
          <form action={submit} noValidate>
            <CreateServiceOrderFormSubmit
              state={state}
              businessId={businessId}
              vehicleId={steps.picks.vehicle.vehicleId}
              canEditSnapshot={scope === "admin"}
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

export { CreateServiceOrderDialog };
