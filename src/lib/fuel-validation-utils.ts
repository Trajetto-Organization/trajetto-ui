/**
 * Utility functions for fuel validation and calculations
 */

/**
 * Calculate total amount from liters and price per liter
 */
export const calculateTotalAmount = (
  liters: number,
  pricePerLiter: number,
): number => {
  return Number((liters * pricePerLiter).toFixed(2));
};

/**
 * Validate if mileage is reasonable (not too high jump from last record)
 */
export const validateMileageChange = (
  currentMileage: number,
  newMileage: number,
  maxAllowedIncrease: number = 2000, // km
): boolean => {
  const increase = newMileage - currentMileage;
  return increase >= 0 && increase <= maxAllowedIncrease;
};

/**
 * Format liters to display with proper decimal places
 */
export const formatLiters = (liters: number): string => {
  return liters.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

/**
 * Validate fuel consumption efficiency
 */
export const validateFuelEfficiency = (
  liters: number,
  mileageIncrease: number,
  expectedKmPerLiter: number,
): { isValid: boolean; message?: string } => {
  if (mileageIncrease <= 0) {
    return { isValid: true }; // Can't validate efficiency without mileage increase
  }

  const actualEfficiency = mileageIncrease / liters;

  const minEfficiency = expectedKmPerLiter * 0.5; // 50% of expected
  const maxEfficiency = expectedKmPerLiter * 2; // 200% of expected

  if (actualEfficiency < minEfficiency) {
    return {
      isValid: false,
      message: `Consumo muito alto para a distância percorrida. Eficiência: ${actualEfficiency.toFixed(2)} km/l`,
    };
  }

  if (actualEfficiency > maxEfficiency) {
    return {
      isValid: false,
      message: `Consumo muito baixo para a distância percorrida. Eficiência: ${actualEfficiency.toFixed(2)} km/l`,
    };
  }

  return { isValid: true };
};
