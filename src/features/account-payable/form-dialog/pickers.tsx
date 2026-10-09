"use client";

import { useState } from "react";
import { Building2, ClipboardList, Store, Truck, User } from "lucide-react";

import { useBranchInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-branch/hooks/branch-infinite-scroll";
import { useUserInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-user/hooks/user-infinite-scroll";
import { useSupplierInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-supplier/hooks/supplier-infinite-scroll";
import { useVehicleInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";
import { useServiceOrderInfiniteScroll } from "@/app/(protected)/_components/shared/searches/search-service-order/hooks/service-order-infinite-scroll";

import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import { NO_ACCESS_HINTS } from "../lib/form-values";

import { CursorCombobox } from "./cursor-combobox";

/**
 * The bill's links, each a compact picker over its own cursor endpoint with
 * the typed term sent to the API. Required ones say "*", optional ones
 * "(opcional)" and clear when the chosen row is picked again. An optional
 * picker the profile cannot read (`readable: false`) sends no request and is
 * shown disabled with the reason — its list would answer 403.
 */
interface PickerProps {
  businessId: string;
  value: string;
  onChange: (id: string) => void;
  fallbackLabel?: string;
  errorName?: string[];
  disabled?: boolean;
}

interface OptionalPickerProps extends PickerProps {
  /** Whether the profile may list these records at all. */
  readable?: boolean;
}

type Row = { id: string } & Record<string, any>;

const BranchPicker = ({
  businessId,
  value,
  onChange,
  fallbackLabel,
  errorName,
  disabled,
}: PickerProps): JSX.Element => {
  const [search, setSearch] = useState<string>("");
  const { branches, ...list } = useBranchInfiniteScroll(businessId, search);

  return (
    <CursorCombobox<Row>
      label="Filial *"
      htmlFor="account-payable-branch"
      value={value}
      onChange={(id) => onChange(id)}
      search={search}
      onSearchChange={setSearch}
      list={{ ...list, items: branches as Row[] }}
      itemLabel={(branch) => branch.fantasy_name || branch.corporate_reason}
      itemDescription={(branch) =>
        branch.fantasy_name ? branch.corporate_reason : branch.city
      }
      fallbackLabel={fallbackLabel}
      placeholder="Selecione a filial"
      searchPlaceholder="Buscar filial..."
      emptyText="Nenhuma filial encontrada."
      icon={Building2}
      errorName={errorName}
      disabled={disabled}
    />
  );
};

const ResponsiblePicker = ({
  businessId,
  value,
  onChange,
  fallbackLabel,
  errorName,
  disabled,
}: PickerProps): JSX.Element => {
  const [search, setSearch] = useState<string>("");
  const { users, ...list } = useUserInfiniteScroll(businessId, search);

  return (
    <CursorCombobox<Row>
      label="Responsável *"
      htmlFor="account-payable-responsible"
      value={value}
      onChange={(id) => onChange(id)}
      search={search}
      onSearchChange={setSearch}
      list={{ ...list, items: users as Row[] }}
      itemLabel={(user) => user.name}
      itemDescription={(user) => user.email}
      fallbackLabel={fallbackLabel}
      placeholder="Selecione o responsável"
      searchPlaceholder="Buscar por nome ou e-mail..."
      emptyText="Nenhum usuário encontrado."
      icon={User}
      hint="Recebe o aviso da conta. Pode ser um motorista: ele vê as contas dele em Minhas contas a pagar."
      errorName={errorName}
      disabled={disabled}
    />
  );
};

const SupplierPicker = ({
  businessId,
  value,
  onChange,
  fallbackLabel,
  errorName,
  disabled,
  readable = true,
  required = true,
}: OptionalPickerProps & {
  /** False only for a legacy bill that never had a payee. */
  required?: boolean;
}): JSX.Element => {
  const [search, setSearch] = useState<string>("");
  // An empty company id keeps the query off (the hook is enabled by it).
  const { suppliers, ...list } = useSupplierInfiniteScroll(
    readable ? businessId : "",
    search,
  );

  return (
    <CursorCombobox<Row>
      label={required ? "Fornecedor *" : "Fornecedor (opcional)"}
      htmlFor="account-payable-supplier"
      value={value}
      onChange={(id) => onChange(id)}
      search={search}
      onSearchChange={setSearch}
      list={{ ...list, items: suppliers as Row[] }}
      itemLabel={(supplier) => supplier.name}
      itemDescription={(supplier) =>
        [supplier.city, supplier.uf].filter(Boolean).join(" - ") || null
      }
      fallbackLabel={fallbackLabel}
      placeholder="Selecione o fornecedor"
      searchPlaceholder="Buscar por nome, CNPJ ou e-mail..."
      emptyText="Nenhum fornecedor encontrado."
      icon={Store}
      hint={readable ? undefined : NO_ACCESS_HINTS.suppliers}
      errorName={errorName}
      disabled={disabled || !readable}
      clearable={!required}
    />
  );
};

const VehiclePicker = ({
  businessId,
  value,
  onChange,
  fallbackLabel,
  errorName,
  disabled,
  readable = true,
}: OptionalPickerProps): JSX.Element => {
  const [search, setSearch] = useState<string>("");
  const { vehicles, ...list } = useVehicleInfiniteScroll(
    readable ? businessId : "",
    search,
  );

  return (
    <CursorCombobox<Row>
      label="Veículo (opcional)"
      htmlFor="account-payable-vehicle"
      value={value}
      onChange={(id) => onChange(id)}
      search={search}
      onSearchChange={setSearch}
      list={{ ...list, items: vehicles as Row[] }}
      itemLabel={(vehicle) => vehicle.license_plate}
      itemDescription={(vehicle) => vehicle.description}
      fallbackLabel={fallbackLabel}
      placeholder="Sem veículo"
      searchPlaceholder="Buscar por placa ou descrição..."
      emptyText="Nenhum veículo encontrado."
      icon={Truck}
      hint={
        readable
          ? "O centro de custo: a conta entra no custo deste veículo."
          : NO_ACCESS_HINTS.vehicles
      }
      errorName={errorName}
      disabled={disabled || !readable}
      clearable
    />
  );
};

const ServiceOrderPicker = ({
  businessId,
  value,
  onChange,
  fallbackLabel,
  errorName,
  disabled,
  readable = true,
}: OptionalPickerProps): JSX.Element => {
  const [search, setSearch] = useState<string>("");
  const { serviceOrders, ...list } = useServiceOrderInfiniteScroll(
    readable ? businessId : "",
    search,
  );

  return (
    <CursorCombobox<Row>
      label="Ordem de serviço (opcional)"
      htmlFor="account-payable-service-order"
      value={value}
      onChange={(id) => onChange(id)}
      search={search}
      onSearchChange={setSearch}
      list={{ ...list, items: serviceOrders as Row[] }}
      itemLabel={(order) => `OS #${order.id.slice(-12)}`}
      itemDescription={(order) =>
        [formatPickedDay(order.date), order.vehicle?.license_plate]
          .filter(Boolean)
          .join(" · ")
      }
      fallbackLabel={fallbackLabel}
      placeholder="Sem ordem de serviço"
      searchPlaceholder="Buscar ordem de serviço..."
      emptyText="Nenhuma ordem de serviço encontrada."
      icon={ClipboardList}
      hint={readable ? undefined : NO_ACCESS_HINTS.serviceOrders}
      errorName={errorName}
      disabled={disabled || !readable}
      clearable
    />
  );
};

export {
  BranchPicker,
  ResponsiblePicker,
  ServiceOrderPicker,
  SupplierPicker,
  VehiclePicker,
};
