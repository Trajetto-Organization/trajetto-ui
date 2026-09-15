import { FormEvent } from "react";

const formatDate = (
  date: string | Date | null | undefined,
  locale: string,
): string => {
  if (date === null || date === undefined || date === "") {
    return "N/A";
  }

  // Try to create a Date object
  const dateObject = new Date(date);

  // Check if the date is valid
  if (isNaN(dateObject.getTime())) {
    return "N/A";
  }

  // If you got here, the date is valid, so format and return
  return dateObject.toLocaleDateString(locale);
};

const formatCpf = (cpf: string): string => {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
};

const formatRg = (rg: string): string => {
  const digits = rg.replace(/\D/g, "");

  if (/^\d{9}$/.test(digits)) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)$/, "$1.$2.$3-$4");
  }

  return rg;
};

const formatNotificationDate = (
  date: Date | string,
  locale: string = "pt-BR",
): string => {
  try {
    if (date === null || date === undefined || date === "") {
      return "N/A";
    }

    const dateObject = typeof date === "string" ? new Date(date) : date;

    // Check if the date is valid
    if (isNaN(dateObject.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(dateObject)
      .replace(",", " às");
  } catch (error) {
    return String(date);
  }
};

// Helper function to convert currency string to numeric value
const formatCurrencyToNumber = (
  currencyStr: string | number | undefined,
): number => {
  if (currencyStr === undefined || currencyStr === "") return 0;

  // If it is already a number, it returns directly
  if (typeof currencyStr === "number") return currencyStr;

  // If it is a string, we need to process it correctly
  if (typeof currencyStr === "string") {
    const cleanedStr = currencyStr.trim();

    // Remove currency symbols and spaces
    let processedStr = cleanedStr.replace(/R\$\s*/g, "");

    // Special treatment for Brazilian format (1,000.00 or 10,000)
    // First, we remove all the dots (thousand separators)
    processedStr = processedStr.replace(/\./g, "");

    // Now we replace the comma with a dot for parseFloat
    // But we check if there is more than one comma (in case of typo)
    const commaCount = (processedStr.match(/,/g) || []).length;

    if (commaCount > 1) {
      // If there is more than one comma, we will only consider the last one.
      // This handles cases like "10,000.00" -> "10000.00"
      const parts = processedStr.split(",");
      const lastPart = parts.pop() || "";

      processedStr = parts.join("") + "." + lastPart;
    } else if (commaCount === 1) {
      // Normal case: replace the comma with a period
      processedStr = processedStr.replace(",", ".");
    }

    const num = parseFloat(processedStr);
    return isNaN(num) ? 0 : num;
  }

  return 0;
};

// Format number to Brazilian currency string
const formatToBrazilianCurrency = (
  value: number | string | undefined,
): string => {
  const numValue = formatCurrencyToNumber(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

// Function to process monetary values ​​in strings to numbers
const parseCurrencyToNumber = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === "") return undefined;

  // If it is already a number, it returns directly
  if (typeof val === "number" && !isNaN(val)) return val;

  // Convert to string to ensure
  const strVal = String(val);

  // Remove any currency symbols and spaces first
  let processedStr = strVal.replace(/R\$\s*/g, "").trim();

  // Remove all dots (thousand separators in pt-BR)
  processedStr = processedStr.replace(/\./g, "");

  // Handle cases with multiple commas (possible typo)
  const commaCount = (processedStr.match(/,/g) || []).length;

  if (commaCount > 1) {
    // If there is more than one comma, consider only the last one
    const parts = processedStr.split(",");
    const lastPart = parts.pop() || "";

    processedStr = parts.join("") + "." + lastPart;
  } else if (commaCount === 1) {
    // Normal case: replace the comma with a period
    processedStr = processedStr.replace(",", ".");
  }

  // Now we can safely parseFloat
  const parsedValue = parseFloat(processedStr);
  return isNaN(parsedValue) ? 0 : parsedValue;
};

const formatNumericInput = (
  event: FormEvent<HTMLInputElement>,
  targetValue: number,
  isFloat: boolean = false,
) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  // For decimal numbers
  if (isFloat) {
    // Replace comma with period for correct internal processing
    const normalizedValue = value.replace(",", ".");

    // Add leading zero to values ​​like ".1" or ",1"
    if (normalizedValue.startsWith(".")) {
      value = "0" + value;
      target.value = value;
    }

    // Check if it is a valid number
    const numericValue = parseFloat(normalizedValue);

    if (isNaN(numericValue)) {
      target.value = "";
      return;
    }

    // Apply maximum limit
    if (numericValue > targetValue) {
      // Preserve comma format for display
      target.value = targetValue.toString().replace(".", ",");
    }
  }

  // For integers
  else {
    // Remove leading zeros
    value = value.replace(/^0+/, "");

    if (value === "") {
      target.value = "";
      return;
    }

    const numericValue = parseInt(value, 10);

    if (isNaN(numericValue)) {
      target.value = "";
      return;
    }

    if (numericValue > targetValue) {
      target.value = targetValue.toString();
    } else {
      target.value = value;
    }
  }
};

// Format mileage with thousands separator (Brazilian format)
const formatMileage = (value: string): string => {
  // Remove everything that is not a number.
  const numbers = value.replace(/\D/g, "");

  // Adds periods as thousands separators.
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Format liters input with Brazilian decimal format (natural approach)
const formatLiters = (value: string): string => {
  // Remove invalid characters, keeping only numbers, commas, and periods.
  let cleaned = value.replace(/[^\d,\.]/g, "");

  // Replaces period with comma (Brazilian standard)
  cleaned = cleaned.replace(".", ",");

  // Allows only one comma.
  const parts = cleaned.split(",");
  if (parts.length > 2) {
    cleaned = parts[0] + "," + parts.slice(1).join("");
  }

  // Limits to 3 decimal places after the comma.
  if (parts.length === 2 && parts[1].length > 3) {
    cleaned = parts[0] + "," + parts[1].substring(0, 3);
  }

  return cleaned;
};

// Convert formatted mileage to numeric value for backend
const mileageToNumber = (formattedMileage: string): string => {
  return formattedMileage.replace(/\./g, "");
};

// Convert formatted liters to numeric value for backend
const litersToNumber = (formattedLiters: string): string => {
  return formattedLiters.replace(",", ".");
};

// Function to format phone number for display
const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone || phone.trim() === "") {
    return "N/A";
  }

  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, "");

  // Check if it's a valid Brazilian phone number
  if (cleanPhone.length === 11) {
    // Mobile number format: (XX) 9XXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
  } else if (cleanPhone.length === 10) {
    // Landline number format: (XX) XXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  }

  // If it doesn't match expected format, return as is
  return phone;
};

const formatCnpj = (cnpj: string | null | undefined): string => {
  if (!cnpj) return "";
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
};

const formatCep = (cep: string | null | undefined): string => {
  if (!cep) return "";
  return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
};

const formatTelephone = (telephone: string | null | undefined): string => {
  if (!telephone) return "";
  return telephone.replace(/^(\d{2})(\d{5}|\d{4})(\d{4})$/, "+55 ($1) $2-$3");
};

// Helper function to format service order display
const formatServiceOrderDisplay = (serviceOrder: any) => {
  const formattedDate =
    formatDate(serviceOrder.date, "pt-BR") || serviceOrder.date;

  const vehicleInfo = serviceOrder.vehicle?.license_plate
    ? `(Veículo: ${serviceOrder.vehicle.description || ""} - Placa: ${serviceOrder.vehicle.license_plate})`
    : "";

  return `OS#${serviceOrder.id.slice(-12)} - ${formattedDate} ${vehicleInfo}`;
};

// Helper function to display value or N/A fallback
const displayValue = <T>(
  value: T | null | undefined,
  fallback: string = "N/A",
): string | T => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
};

// Helper function to apply a mask pattern to a value
// The mask uses "9" to represent numeric characters
// Example: applyMask("12345678901", "999.999.999-99") => "123.456.789-01"
const applyMask = (value: string, mask: string): string => {
  if (!value) return "";
  let masked = "";

  let valueIndex = 0;
  const cleanedValue = value.replace(/\D/g, "");

  for (let i = 0; i < mask.length; i++) {
    /**
     * Stop when the digits run out, instead of trailing the punctuation.
     *
     * Without this, a value shorter than the mask kept collecting the literal
     * characters after it: an eight-digit RG — which is a normal length, the
     * issuing state decides — rendered as `12.345.678-` in the edit form, and
     * a half-typed CPF as `123..-`. The person then deletes a dash they never
     * typed, or saves a field that looks malformed.
     */
    if (valueIndex >= cleanedValue.length) break;

    const maskChar = mask[i];

    if (maskChar === "9") {
      masked += cleanedValue[valueIndex];
      valueIndex++;
    } else {
      masked += maskChar;
    }
  }

  return masked;
};

const hasSpaceAtEdges = (value: string) => /^\s|\s$/.test(value);
const hasConsecutiveSpaces = (value: string): boolean => /\s{2,}/.test(value);

const isEmptyOrWhitespace = (value: string): boolean =>
  value.trim().length === 0;
const isValidDateString = (value: string): boolean => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

// Helper function to convert empty strings to null
const emptyStringToNull = (value: any) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
};

// Helper function to convert string to boolean
const stringToBoolean = (value: any) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
};

export {
  formatCurrencyToNumber,
  formatNotificationDate,
  formatToBrazilianCurrency,
  formatServiceOrderDisplay,
  formatNumericInput,
  parseCurrencyToNumber,
  isEmptyOrWhitespace,
  isValidDateString,
  emptyStringToNull,
  stringToBoolean,
  formatDate,
  formatMileage,
  formatLiters,
  mileageToNumber,
  litersToNumber,
  formatCnpj,
  formatCep,
  formatTelephone,
  displayValue,
  formatCpf,
  formatRg,
  applyMask,
  hasSpaceAtEdges,
  hasConsecutiveSpaces,
};

export { formatPhoneNumber };
