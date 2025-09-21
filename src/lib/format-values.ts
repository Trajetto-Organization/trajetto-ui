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

const formatNotificationDate = (
  date: Date | string,
  locale: string = "pt-BR",
): string => {
  try {
    const dateObject = typeof date === "string" ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
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
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');

  // Adiciona pontos como separadores de milhares
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Format liters input with Brazilian decimal format (natural approach)
const formatLiters = (value: string): string => {
  // Remove caracteres inválidos, mantém apenas números, vírgula e ponto
  let cleaned = value.replace(/[^\d,\.]/g, '');

  // Substitui ponto por vírgula (padrão brasileiro)
  cleaned = cleaned.replace('.', ',');

  // Permite apenas uma vírgula
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }

  // Limita a 3 casas decimais após a vírgula
  if (parts.length === 2 && parts[1].length > 3) {
    cleaned = parts[0] + ',' + parts[1].substring(0, 3);
  }

  return cleaned;
};

// Convert formatted mileage to numeric value for backend
const mileageToNumber = (formattedMileage: string): string => {
  return formattedMileage.replace(/\./g, '');
};

// Convert formatted liters to numeric value for backend
const litersToNumber = (formattedLiters: string): string => {
  return formattedLiters.replace(',', '.');
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

export {
  formatCurrencyToNumber,
  formatNotificationDate,
  formatToBrazilianCurrency,
  formatNumericInput,
  parseCurrencyToNumber,
  formatDate,
  formatMileage,
  formatLiters,
  mileageToNumber,
  litersToNumber,
};

export { formatPhoneNumber };
