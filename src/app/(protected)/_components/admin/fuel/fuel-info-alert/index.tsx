import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

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
  lastFuelMileage?: number;
  className?: string;
}

const FuelInfoAlert = ({
  liters,
  pricePerLiter,
  currentMileage,
  vehicleKmPerLiter,
  lastFuelMileage,
  className,
}: FuelInfoAlertProps) => {
  // Calculate values
  const totalAmount =
    liters && pricePerLiter
      ? calculateTotalAmount(liters, pricePerLiter)
      : null;
  const mileageIncrease =
    currentMileage && lastFuelMileage ? currentMileage - lastFuelMileage : null;
  const actualEfficiency =
    mileageIncrease && liters ? mileageIncrease / liters : null;

  // Determine efficiency status
  let efficiencyStatus: "good" | "warning" | "alert" | null = null;
  if (actualEfficiency && vehicleKmPerLiter) {
    const efficiencyRatio = actualEfficiency / vehicleKmPerLiter;
    if (efficiencyRatio >= 0.8) {
      efficiencyStatus = "good";
    } else if (efficiencyRatio >= 0.6) {
      efficiencyStatus = "warning";
    } else {
      efficiencyStatus = "alert";
    }
  }

  return (
    <Alert
      className={`border-blue-200 bg-blue-50 dark:bg-blue-950/20 ${className}`}
    >
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-2">
        <div>
          <strong>📊 Resumo do Abastecimento:</strong>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {/* Calculated values */}
          {liters && <div>• Litros: {formatLiters(liters)} L</div>}

          {pricePerLiter && <div>• Preço/L: {formatToBrazilianCurrency(pricePerLiter)}</div>}

          {totalAmount && (
            <div>
              • <strong>Total: {formatToBrazilianCurrency(totalAmount)}</strong>
            </div>
          )}

          {mileageIncrease && (
            <div>• Distância: {mileageIncrease.toLocaleString()} km</div>
          )}
        </div>

        {/* Efficiency */}
        {actualEfficiency && vehicleKmPerLiter && (
          <div className="mt-3 p-2 rounded-md bg-white/50 dark:bg-black/20">
            <div className="flex items-center gap-2 text-sm">
              {efficiencyStatus === "good" && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">
                    <strong>Eficiência boa:</strong>{" "}
                    {actualEfficiency.toFixed(1)} km/l (esperado:{" "}
                    {vehicleKmPerLiter} km/l)
                  </span>
                </>
              )}

              {efficiencyStatus === "warning" && (
                <>
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700 dark:text-yellow-400">
                    <strong>Eficiência moderada:</strong>{" "}
                    {actualEfficiency.toFixed(1)} km/l (esperado:{" "}
                    {vehicleKmPerLiter} km/l)
                  </span>
                </>
              )}

              {efficiencyStatus === "alert" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 dark:text-red-400">
                    <strong>Eficiência baixa:</strong>{" "}
                    {actualEfficiency.toFixed(1)} km/l (esperado:{" "}
                    {vehicleKmPerLiter} km/l)
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="text-xs mt-2 border-t border-blue-200 pt-2">
          <strong>💡 Dicas:</strong> Verifique se os dados estão corretos.
          Eficiência muito baixa pode indicar problemas no veículo.
        </div>
      </AlertDescription>
    </Alert>
  );
};

export { FuelInfoAlert };
