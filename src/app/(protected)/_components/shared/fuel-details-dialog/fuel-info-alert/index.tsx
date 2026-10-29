import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

import {
  calculateTotalAmount,
  formatLiters,
} from "@/lib/fuel-validation-utils";

import type { FuelInfoAlertProps } from "./fuel-info-alert.types";
import { formatToBrazilianCurrency } from "@/lib/format-values";
import { formatPricePerLiter } from "@/features/fuel/lib/price";

const FuelInfoAlert = ({
  liters,
  pricePerLiter,
  currentMileage,
  vehicleKmPerLiter,
  lastFuelMileage,
  className,
}: FuelInfoAlertProps): JSX.Element => {
  // Calculate values
  const totalAmount =
    liters && pricePerLiter
      ? calculateTotalAmount(liters, pricePerLiter)
      : null;

  // Calculate efficiency metrics
  const expectedConsumption = vehicleKmPerLiter;
  const autonomy =
    liters && vehicleKmPerLiter ? liters * vehicleKmPerLiter : null;
  const costPerKm = totalAmount && autonomy ? totalAmount / autonomy : null;

  // Calculate actual consumption if we have previous fuel data
  const kmTraveled =
    currentMileage && lastFuelMileage ? currentMileage - lastFuelMileage : null;
  const actualConsumption =
    kmTraveled && liters && kmTraveled > 0 ? kmTraveled / liters : null;

  // Determine efficiency status
  const getEfficiencyStatus = () => {
    if (!actualConsumption || !expectedConsumption) return null;

    const difference =
      ((actualConsumption - expectedConsumption) / expectedConsumption) * 100;

    if (difference >= 10) {
      return {
        status: "Excelente",
        color: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
      };
    } else if (difference >= 0) {
      return {
        status: "Bom",
        color: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
      };
    } else if (difference >= -10) {
      return {
        status: "Normal",
        color: "text-yellow-700 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-950/30",
        borderColor: "border-yellow-200 dark:border-yellow-800",
      };
    } else {
      return {
        status: "Ruim",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
      };
    }
  };

  const efficiencyStatus = getEfficiencyStatus();

  return (
    <Alert
      className={`border-blue-200 bg-blue-50 dark:bg-blue-950/20 ${className}`}
    >
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription
        className="text-blue-700
        dark:text-blue-300 space-y-3"
      >
        <strong>📊 Resumo do Abastecimento:</strong>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {/* Calculated values */}
          {liters && <span>• Litros: {formatLiters(liters)} L</span>}

          {/* The pump price has three decimals: as money, 5.899 read "R$ 5,90". */}
          {pricePerLiter && (
            <span>• Preço: {formatPricePerLiter(pricePerLiter)}/L</span>
          )}

          {totalAmount && (
            <div>
              • <strong>Total: {formatToBrazilianCurrency(totalAmount)}</strong>
            </div>
          )}
        </div>

        {/* Efficiency Analysis Section */}
        {vehicleKmPerLiter && (
          <>
            <div className="border-t border-blue-200 pt-3">
              <strong>⚡ Análise de Eficiência:</strong>
            </div>

            {/* A <main> inside a dialog, inside the page's own main: this
                is not the document's primary content. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expected Consumption */}
              <section
                className="p-2 rounded-md bg-white
                dark:bg-blue-900/20 border border-blue-200
                dark:border-blue-800"
              >
                <div className="text-xs font-medium mb-1">Consumo Esperado</div>
                <div className="text-base font-bold">
                  {expectedConsumption?.toFixed(2)} km/L
                </div>
              </section>

              {/* Actual Consumption */}
              {actualConsumption && efficiencyStatus && (
                <section
                  className={`p-2 rounded-md border ${efficiencyStatus.bgColor} ${efficiencyStatus.borderColor}`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${efficiencyStatus.color}`}
                  >
                    Consumo Real
                  </div>
                  <div
                    className={`text-base font-bold ${efficiencyStatus.color}`}
                  >
                    {actualConsumption.toFixed(2)} km/L
                  </div>
                  <div
                    className={`text-xs mt-1 font-semibold ${efficiencyStatus.color}`}
                  >
                    Status: {efficiencyStatus.status}
                  </div>
                </section>
              )}

              {/* Autonomy */}
              {autonomy && (
                <section
                  className="p-2 rounded-md bg-white
                  dark:bg-blue-900/20 border
                  border-blue-200 dark:border-blue-800"
                >
                  <div className="text-xs font-medium mb-1">Autonomia</div>
                  <div className="text-base font-bold">
                    {autonomy.toFixed(1)} km
                  </div>
                  <div className="text-xs mt-1">Com este abastecimento</div>
                </section>
              )}

              {/* Cost per Km */}
              {costPerKm && (
                <section
                  className="p-2 rounded-md bg-white
                  dark:bg-blue-900/20 border
                  border-blue-200 dark:border-blue-800"
                >
                  <div className="text-xs font-medium mb-1">Custo por Km</div>
                  <div className="text-base font-bold">
                    {formatToBrazilianCurrency(costPerKm)}
                  </div>
                  <div className="text-xs mt-1">
                    Baseado neste abastecimento
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        <footer
          className="text-xs mt-2 border-t
          border-blue-200 pt-2"
        >
          <strong>💡 Dicas:</strong> Verifique se os dados estão corretos.
          Eficiência muito baixa pode indicar problemas no veículo.
        </footer>
      </AlertDescription>
    </Alert>
  );
};

export { FuelInfoAlert };
