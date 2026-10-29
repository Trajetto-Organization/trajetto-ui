/**
 * CNPJ check digits (decision 5.7), mirrored from the API's
 * src/shared/delivery/cnpj.ts. The shipper's CNPJ is unique per company and
 * the NF-e import matches issuers by it, so a typo would either block the real
 * issuer or duplicate the shipper.
 */
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );

  const rest = sum % 11;

  return rest < 2 ? 0 : 11 - rest;
}

/** True for 14 digits whose check digits match. Repeated digits are refused. */
function isValidCnpj(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;

  if (/^(\d)\1{13}$/.test(value)) return false;

  return (
    checkDigit(value, FIRST_WEIGHTS) === Number(value[12]) &&
    checkDigit(value, SECOND_WEIGHTS) === Number(value[13])
  );
}

export { isValidCnpj };
