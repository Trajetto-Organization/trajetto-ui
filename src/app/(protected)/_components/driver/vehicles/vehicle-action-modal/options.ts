import { canAccessPath, type RouteAccessContext } from "@/lib/route-access";

type DriverVehicleOptionKey = "fuels" | "service-orders";

interface DriverVehicleOption {
  key: DriverVehicleOptionKey;
  title: string;
  description: string;
  hrefFor: (vehicleId: string) => string;
}

const OPTIONS: DriverVehicleOption[] = [
  {
    key: "fuels",
    title: "Ver abastecimentos do veículo",
    description: "Visualizar histórico de abastecimentos",
    hrefFor: (vehicleId) =>
      `/driver/vehicles/${encodeURIComponent(vehicleId)}/fuels`,
  },
  {
    key: "service-orders",
    title: "Ver ordens de serviço do veículo",
    description: "Visualizar histórico de manutenções",
    hrefFor: (vehicleId) =>
      `/driver/vehicles/${encodeURIComponent(vehicleId)}/service-orders`,
  },
];

/**
 * What the vehicle card may offer this driver (DRV-WEB-1).
 *
 * Both pages belong to FLEET. They used to be offered to every driver, and
 * a company without the module got the page and the API's "módulo não
 * habilitado" behind it. The verdict is the route registry's, asked with a
 * sample id: the pages' rule does not depend on which vehicle.
 */
function driverVehicleOptions(
  context: Omit<RouteAccessContext, "isDriver">,
): DriverVehicleOption[] {
  return OPTIONS.filter((option) =>
    canAccessPath(option.hrefFor("vehicle"), { ...context, isDriver: true }),
  );
}

export { driverVehicleOptions };
export type { DriverVehicleOption, DriverVehicleOptionKey };
