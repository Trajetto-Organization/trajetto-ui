import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

import {
  calculateTotalAmount,
  formatLiters,
} from "@/lib/fuel-validation-utils";
import { formatToBrazilianCurrency } from "@/lib/format-values";

interface FuelInfoAlertProps {
  liters?: number;
  pricePerLiter?: number;
  currentMileage?: number;
  vehicleKmPerLiter?: number;
  className?: string;
}

const FuelInfoAlert = ({
  liters,
  pricePerLiter,
  currentMileage,
  vehicleKmPerLiter,
  className,
}: FuelInfoAlertProps) => {
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
  // const kmTraveled =
  //   currentMileage && lastFuelMileage ? currentMileage - lastFuelMileage : null;
  // const actualConsumption =
  //   kmTraveled && liters && kmTraveled > 0 ? kmTraveled / liters : null;

  // Determine efficiency status
  // const getEfficiencyStatus = () => {
  //   if (!actualConsumption || !expectedConsumption) return null;

  //   const difference =
  //     ((actualConsumption - expectedConsumption) / expectedConsumption) * 100;

  //   if (difference >= 10) {
  //     return {
  //       status: "Excelente",
  //       color: "text-green-700 dark:text-green-400",
  //       bgColor: "bg-green-100 dark:bg-green-950/30",
  //     };
  //   } else if (difference >= 0) {
  //     return {
  //       status: "Bom",
  //       color: "text-blue-700 dark:text-blue-400",
  //       bgColor: "bg-blue-100 dark:bg-blue-950/30",
  //     };
  //   } else if (difference >= -10) {
  //     return {
  //       status: "Normal",
  //       color: "text-yellow-700 dark:text-yellow-400",
  //       bgColor: "bg-yellow-100 dark:bg-yellow-950/30",
  //     };
  //   } else {
  //     return {
  //       status: "Ruim",
  //       color: "text-red-700 dark:text-red-400",
  //       bgColor: "bg-red-100 dark:bg-red-950/30",
  //     };
  //   }
  // };

  // const efficiencyStatus = getEfficiencyStatus();

  return (
    <Alert
      className={`border-blue-200 bg-blue-50 dark:bg-blue-950/20 ${className}`}
    >
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription
        className="text-blue-700 
        dark:text-blue-300 space-y-3"
      >
        <div>
          <strong>📊 Resumo do Abastecimento:</strong>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {/* Calculated values */}
          {liters && <div>• Litros: {formatLiters(liters)} L</div>}

          {pricePerLiter && (
            <div>• Preço/L: {formatToBrazilianCurrency(pricePerLiter)}</div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expected Consumption */}
              <div
                className="p-2 rounded-md bg-white 
                dark:bg-blue-900/20 border border-blue-200 
                dark:border-blue-800"
              >
                <div className="text-xs font-medium mb-1">Consumo Esperado</div>
                <div className="text-base font-bold">
                  {expectedConsumption?.toFixed(2)} km/L
                </div>
              </div>

              {/* Actual Consumption */}
              {/* {actualConsumption && (
                <div
                  className={`p-2 rounded-md border ${efficiencyStatus?.bgColor} ${efficiencyStatus?.color}`}
                >
                  <div className="text-xs font-medium mb-1">Consumo Real</div>
                  <div className="text-base font-bold">
                    {actualConsumption.toFixed(2)} km/L
                  </div>
                  <div className="text-xs mt-1">
                    Status: {efficiencyStatus?.status}
                  </div>
                </div>
              )} */}

              {/* Autonomy */}
              {autonomy && (
                <div
                  className="p-2 rounded-md bg-white 
                  dark:bg-blue-900/20 border 
                  border-blue-200 dark:border-blue-800"
                >
                  <div className="text-xs font-medium mb-1">Autonomia</div>
                  <div className="text-base font-bold">
                    {autonomy.toFixed(1)} km
                  </div>
                  <div className="text-xs mt-1">Com este abastecimento</div>
                </div>
              )}

              {/* Cost per Km */}
              {costPerKm && (
                <div
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
                </div>
              )}
            </div>
          </>
        )}

        <div
          className="text-xs mt-2 border-t 
          border-blue-200 pt-2"
        >
          <strong>💡 Dicas:</strong> Verifique se os dados estão corretos.
          Eficiência muito baixa pode indicar problemas no veículo.
        </div>
      </AlertDescription>
    </Alert>
  );
};

export { FuelInfoAlert };
