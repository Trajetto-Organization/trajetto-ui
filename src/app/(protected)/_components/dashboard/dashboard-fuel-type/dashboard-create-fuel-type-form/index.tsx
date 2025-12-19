"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { handleCreateFuelType } from "@/actions/create-fuel-type";

import { allowedFuelTypes } from "@/schemas/create-update-fuel-type-schema";

import {
  DashboardCreateFuelTypeSubmitProps,
  DashboardCreateFuelTypeFormState,
} from "./dto";
import { useDashboardCreateFuelTypeForm } from "./hooks";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

const DashboardCreateFuelTypeFormSubmit = ({
  state,
  handleOpenCreateFuelTypeForm,
}: DashboardCreateFuelTypeSubmitProps) => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-6 mt-2">
      <div className="w-full flex flex-col gap-3">
        <div
          className={cn(
            "text-sm font-medium",
            state.createFuelTypeError?.description &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.createFuelTypeError?.description
            ? state.createFuelTypeError?.description
            : "Combustível"}
        </div>
        <Select name="description" disabled={pending}>
          <SelectTrigger aria-label="Tipo do combustível">
            <SelectValue placeholder="Tipo do combustível" />
          </SelectTrigger>
          <SelectContent>
            {allowedFuelTypes.map((fuel) => (
              <SelectItem
                key={fuel}
                value={fuel}
                className="cursor-pointer hover:bg-accent
                hover:text-accent-foreground"
              >
                {fuel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 mt-6">
        <Button
          variant="outline"
          type="button"
          onClick={handleOpenCreateFuelTypeForm}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          Criar Combustível
          {pending && (
            <div className="ml-2 animate-spin">
              <Loader />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

const DashboardCreateFuelTypeForm = (): JSX.Element => {
  const defaultState: DashboardCreateFuelTypeFormState = {};
  const [state, dispatch] = useFormState<
    DashboardCreateFuelTypeFormState,
    FormData
  >(handleCreateFuelType, defaultState);

  const { isCreateFuelTypeForm, handleOpenCreateFuelTypeForm, formRef } =
    useDashboardCreateFuelTypeForm(state);

  const { businessId } = useAuthStore();
  const hasUserPermission = useHasPermission(
    permissions.FUEL_TYPE_MANAGE,
    "write",
  );

  return (
    <Dialog
      open={isCreateFuelTypeForm}
      onOpenChange={handleOpenCreateFuelTypeForm}
    >
      <DialogTrigger
        asChild
        disabled={!hasUserPermission}
        data-tutorial="create-button"
      >
        <Button size="sm" className="h-8">
          Criar Combustível
        </Button>
      </DialogTrigger>

      <DialogScrollContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Combustível</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Insira as informações solicitadas abaixo para concluir a criação do
            tipo do combustível.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={(formData: FormData) => {
            formData.append("businessId", businessId as string);
            return dispatch(formData);
          }}
        >
          <DashboardCreateFuelTypeFormSubmit
            state={state}
            handleOpenCreateFuelTypeForm={handleOpenCreateFuelTypeForm}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { DashboardCreateFuelTypeForm };
