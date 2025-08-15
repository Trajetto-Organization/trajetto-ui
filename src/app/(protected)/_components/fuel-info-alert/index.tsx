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
  lastFuelMileage?: number;
  className?: string;
}

const FuelInfoAlert = ({
  liters,
  pricePerLiter,
  className,
}: FuelInfoAlertProps) => {
  // Calculate values
  const totalAmount =
    liters && pricePerLiter
      ? calculateTotalAmount(liters, pricePerLiter)
      : null;

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

          {pricePerLiter && (
            <div>• Preço/L: {formatToBrazilianCurrency(pricePerLiter)}</div>
          )}

          {totalAmount && (
            <div>
              • <strong>Total: {formatToBrazilianCurrency(totalAmount)}</strong>
            </div>
          )}
        </div>

        <div className="text-xs mt-2 border-t border-blue-200 pt-2">
          <strong>💡 Dicas:</strong> Verifique se os dados estão corretos.
          Eficiência muito baixa pode indicar problemas no veículo.
        </div>
      </AlertDescription>
    </Alert>
  );
};

export { FuelInfoAlert };
